import { ImpactStatus, MutationKind, ReviewStatus, type ProjectRole } from "@prisma/client";
import { db } from "./db";
import { analyzeImpact } from "./intelligence";
import { getProjectKnowledge, type MemberContext } from "./project-repository";

export async function createImpactProposal(context:MemberContext,sourceKey:string){
  const knowledge=await getProjectKnowledge(context.projectKey);if(!knowledge)throw new Error("PROJECT_NOT_FOUND");
  const source=await db.artifact.findUnique({where:{projectId_key:{projectId:context.projectId,key:sourceKey}}});if(!source)throw new Error("ARTIFACT_NOT_FOUND");
  const impact=analyzeImpact(knowledge,sourceKey);
  const artifacts=await db.artifact.findMany({where:{projectId:context.projectId,key:{in:impact.affected.map(item=>item.artifact.id)}}});const ids=new Map(artifacts.map(a=>[a.key,a.id]));
  return db.impactAnalysis.create({data:{projectId:context.projectId,sourceArtifactId:source.id,requestedById:context.userId,status:ImpactStatus.REVIEW,summary:`${impact.severity} impact across ${impact.affected.length} artifacts`,items:{create:impact.affected.map(item=>({artifactId:ids.get(item.artifact.id)!,reason:item.reason,proposedContent:`${item.artifact.content}\n\n## Impact synchronization\nTriggered by ${sourceKey}: ${item.reason}`}))}},include:{items:{include:{artifact:true}}}});
}

export async function getOrCreateImpactProposal(context:MemberContext,sourceKey:string){
  const source=await db.artifact.findUnique({where:{projectId_key:{projectId:context.projectId,key:sourceKey}}});if(!source)throw new Error("ARTIFACT_NOT_FOUND");
  const existing=await db.impactAnalysis.findFirst({where:{projectId:context.projectId,sourceArtifactId:source.id,status:ImpactStatus.REVIEW},orderBy:{createdAt:"desc"},include:{items:{include:{artifact:true}}}});
  return existing??createImpactProposal(context,sourceKey);
}

export async function reviewImpactItem(context:MemberContext,input:{proposalId:string;itemId:string;decision:"ACCEPTED"|"REJECTED";content?:string}){
  return db.$transaction(async tx=>{
    const item=await tx.impactItem.findFirst({where:{id:input.itemId,analysisId:input.proposalId,analysis:{projectId:context.projectId,status:ImpactStatus.REVIEW}},include:{artifact:true}});if(!item)throw new Error("IMPACT_ITEM_NOT_FOUND");if(item.reviewStatus!==ReviewStatus.PENDING)throw new Error("ALREADY_REVIEWED");
    let version:number|undefined;
    if(input.decision==="ACCEPTED"){
      const next=item.artifact.currentVersionNumber+1;const content=input.content??item.proposedContent??item.artifact.title;
      await tx.artifactVersion.create({data:{artifactId:item.artifactId,version:next,title:item.artifact.title,content,changeNote:`Accepted impact proposal ${input.proposalId}`,createdById:context.userId}});
      await tx.artifact.update({where:{id:item.artifactId},data:{currentVersionNumber:next}});
      await tx.mutationRecord.create({data:{projectId:context.projectId,artifactId:item.artifactId,actorId:context.userId,kind:MutationKind.IMPACT_APPLY,fromVersion:item.artifact.currentVersionNumber,toVersion:next,reason:item.reason,metadata:{proposalId:input.proposalId,itemId:item.id}}});version=next;
    }
    await tx.impactItem.update({where:{id:item.id},data:{reviewStatus:input.decision,reviewedById:context.userId,reviewedAt:new Date()}});
    const pending=await tx.impactItem.count({where:{analysisId:input.proposalId,reviewStatus:ReviewStatus.PENDING}});if(pending===0){const accepted=await tx.impactItem.count({where:{analysisId:input.proposalId,reviewStatus:ReviewStatus.ACCEPTED}});await tx.impactAnalysis.update({where:{id:input.proposalId},data:{status:accepted?ImpactStatus.APPLIED:ImpactStatus.REJECTED,resolvedAt:new Date()}});}
    return{itemId:item.id,decision:input.decision,version};
  },{isolationLevel:"Serializable"});
}

export async function reviewAllImpactItems(context:MemberContext,input:{proposalId:string;decision:"ACCEPTED"|"REJECTED"}){
  return db.$transaction(async tx=>{
    const proposal=await tx.impactAnalysis.findFirst({where:{id:input.proposalId,projectId:context.projectId,status:ImpactStatus.REVIEW},include:{items:{where:{reviewStatus:ReviewStatus.PENDING},include:{artifact:true}}}});if(!proposal)throw new Error("PROPOSAL_NOT_FOUND");
    const results=[];
    for(const item of proposal.items){let version:number|undefined;if(input.decision==="ACCEPTED"){const next=item.artifact.currentVersionNumber+1;await tx.artifactVersion.create({data:{artifactId:item.artifactId,version:next,title:item.artifact.title,content:item.proposedContent??item.artifact.title,changeNote:`Accepted impact proposal ${proposal.id}`,createdById:context.userId}});await tx.artifact.update({where:{id:item.artifactId},data:{currentVersionNumber:next}});await tx.mutationRecord.create({data:{projectId:context.projectId,artifactId:item.artifactId,actorId:context.userId,kind:MutationKind.IMPACT_APPLY,fromVersion:item.artifact.currentVersionNumber,toVersion:next,reason:item.reason,metadata:{proposalId:proposal.id,itemId:item.id}}});version=next;}await tx.impactItem.update({where:{id:item.id},data:{reviewStatus:input.decision,reviewedById:context.userId,reviewedAt:new Date()}});results.push({itemId:item.id,decision:input.decision,version});}
    await tx.impactAnalysis.update({where:{id:proposal.id},data:{status:input.decision==="ACCEPTED"?ImpactStatus.APPLIED:ImpactStatus.REJECTED,resolvedAt:new Date()}});return results;
  },{isolationLevel:"Serializable"});
}

export const mutationRoles:ProjectRole[]=["OWNER","EDITOR"];
