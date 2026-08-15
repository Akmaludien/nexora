import { ArtifactStatus, ArtifactType, MutationKind, ProjectRole, RelationshipType, type Prisma } from "@prisma/client";
import { db } from "./db";
import type { Artifact, ArtifactType as DomainArtifactType, Project, RelationshipType as DomainRelationshipType } from "./types";

const artifactToDomain: Record<ArtifactType, DomainArtifactType> = { PRD:"prd",REQUIREMENT:"requirement",FEATURE:"feature",USER_STORY:"user-story",BUSINESS_RULE:"business-rule",USER_FLOW:"user-flow",API:"api",DATABASE:"database",ARCHITECTURE:"architecture",SECURITY:"security",TESTING:"testing",ROADMAP:"roadmap",TASK:"task",DECISION:"decision",DESIGN_CONTEXT:"design-context" };
const relationshipToDomain: Record<RelationshipType, DomainRelationshipType> = { DEPENDS_ON:"depends_on",IMPLEMENTS:"implements",AFFECTS:"affects",REQUIRES:"requires",MAPS_TO:"maps_to",VALIDATES:"validates",DERIVED_FROM:"derived_from" };
const statusToDomain = { DRAFT:"Draft", REVIEW:"Review", VALIDATED:"Validated", DEPRECATED:"Draft", ARCHIVED:"Draft" } as const;

/**
 * `userId` identifies the authenticated subject for rate limiting and logging.
 * `actorId` is the User row to attribute persisted mutations to — it is `null`
 * for system (integration token) operations, which must never write a synthetic
 * identity into a User foreign key.
 */
export type MemberContext = { userId:string; actorId:string|null; projectId:string; projectKey:string; role:ProjectRole };
export type VersionDto = { id:string; version:number; title:string; content:string; changeNote:string|null; createdAt:string; current:boolean };

export async function requireMembership(userId:string, projectKey:string, allowed:ProjectRole[]=[ProjectRole.OWNER,ProjectRole.EDITOR,ProjectRole.VIEWER]):Promise<MemberContext|null>{
  const member=await db.projectMember.findFirst({where:{userId,project:{key:projectKey,status:"ACTIVE"},role:{in:allowed}},select:{projectId:true,role:true,project:{select:{key:true}}}});
  return member?{userId,actorId:userId,projectId:member.projectId,projectKey:member.project.key,role:member.role}:null;
}

export async function getProjectKnowledge(projectKey:string):Promise<Project|null>{
  const project=await db.project.findUnique({where:{key:projectKey},include:{artifacts:{where:{archivedAt:null},include:{versions:{orderBy:{version:"desc"},take:1},_count:{select:{versions:true}}},orderBy:{key:"asc"}},relationships:{include:{sourceArtifact:{select:{key:true}},targetArtifact:{select:{key:true}}}}}});
  if(!project)return null;
  const artifacts:Artifact[]=project.artifacts.map((item)=>{const current=item.versions[0];const metadata=(item.metadata??{}) as {acceptanceCriteria?:string[];milestone?:string};return{id:item.key,type:artifactToDomain[item.type],title:item.title,content:current?.content??"",status:statusToDomain[item.status],version:item.currentVersionNumber,updatedAt:item.updatedAt.toISOString(),acceptanceCriteria:metadata.acceptanceCriteria,milestone:metadata.milestone}});
  return{id:project.key,name:project.name,description:project.description,complexity:project.complexity,completeness:0,artifacts,relationships:project.relationships.map(edge=>({id:edge.id,sourceId:edge.sourceArtifact.key,targetId:edge.targetArtifact.key,type:relationshipToDomain[edge.type],reason:edge.reason}))};
}

export async function listArtifactVersions(projectId:string,artifactKey:string):Promise<VersionDto[]>{
  const artifact=await db.artifact.findUnique({where:{projectId_key:{projectId,key:artifactKey}},select:{currentVersionNumber:true,versions:{orderBy:{version:"desc"}}}});if(!artifact)return[];
  return artifact.versions.map(v=>({id:v.id,version:v.version,title:v.title,content:v.content,changeNote:v.changeNote,createdAt:v.createdAt.toISOString(),current:v.version===artifact.currentVersionNumber}));
}

export async function saveArtifact(context:MemberContext,input:{artifactKey:string;content:string;reason?:string;expectedVersion?:number}){
  return db.$transaction(async tx=>{
    const artifact=await tx.artifact.findUnique({where:{projectId_key:{projectId:context.projectId,key:input.artifactKey}}});if(!artifact)throw new Error("ARTIFACT_NOT_FOUND");
    if(input.expectedVersion&&artifact.currentVersionNumber!==input.expectedVersion)throw new Error("VERSION_CONFLICT");
    const next=artifact.currentVersionNumber+1;
    const version=await tx.artifactVersion.create({data:{artifactId:artifact.id,version:next,title:artifact.title,content:input.content,changeNote:input.reason,createdById:context.userId}});
    await tx.artifact.update({where:{id:artifact.id},data:{currentVersionNumber:next}});
    await tx.mutationRecord.create({data:{projectId:context.projectId,artifactId:artifact.id,actorId:context.userId,kind:MutationKind.UPDATE,fromVersion:artifact.currentVersionNumber,toVersion:next,reason:input.reason}});
    return{artifactKey:artifact.key,version:next,content:version.content,createdAt:version.createdAt.toISOString()};
  },{isolationLevel:"Serializable"});
}

export async function restoreArtifact(context:MemberContext,input:{artifactKey:string;version:number;reason?:string}){
  return db.$transaction(async tx=>{
    const artifact=await tx.artifact.findUnique({where:{projectId_key:{projectId:context.projectId,key:input.artifactKey}}});if(!artifact)throw new Error("ARTIFACT_NOT_FOUND");
    const source=await tx.artifactVersion.findUnique({where:{artifactId_version:{artifactId:artifact.id,version:input.version}}});if(!source)throw new Error("VERSION_NOT_FOUND");
    const next=artifact.currentVersionNumber+1;const note=input.reason??`Restore from v${source.version}`;
    const restored=await tx.artifactVersion.create({data:{artifactId:artifact.id,version:next,title:source.title,content:source.content,changeNote:note,createdById:context.userId}});
    await tx.artifact.update({where:{id:artifact.id},data:{title:source.title,currentVersionNumber:next}});
    await tx.mutationRecord.create({data:{projectId:context.projectId,artifactId:artifact.id,actorId:context.userId,kind:MutationKind.RESTORE,fromVersion:artifact.currentVersionNumber,toVersion:next,reason:note,metadata:{restoredFrom:source.version}}});
    return{artifactKey:artifact.key,version:next,content:restored.content,createdAt:restored.createdAt.toISOString()};
  },{isolationLevel:"Serializable"});
}

export async function createArtifact(context:MemberContext,input:{key:string;type:ArtifactType;title:string;content:string;status?:ArtifactStatus}){
  return db.$transaction(async tx=>{const artifact=await tx.artifact.create({data:{projectId:context.projectId,key:input.key,type:input.type,title:input.title,status:input.status??ArtifactStatus.DRAFT,versions:{create:{version:1,title:input.title,content:input.content,changeNote:"Artifact created",createdById:context.userId}}}});await tx.mutationRecord.create({data:{projectId:context.projectId,artifactId:artifact.id,actorId:context.userId,kind:MutationKind.CREATE,toVersion:1,reason:"Artifact created"}});return artifact;});
}

export async function archiveArtifact(context:MemberContext,artifactKey:string){return db.$transaction(async tx=>{const artifact=await tx.artifact.findUnique({where:{projectId_key:{projectId:context.projectId,key:artifactKey}}});if(!artifact)throw new Error("ARTIFACT_NOT_FOUND");await tx.artifact.update({where:{id:artifact.id},data:{archivedAt:new Date(),status:ArtifactStatus.ARCHIVED}});await tx.mutationRecord.create({data:{projectId:context.projectId,artifactId:artifact.id,actorId:context.userId,kind:MutationKind.DELETE,fromVersion:artifact.currentVersionNumber,reason:"Artifact archived"}});});}

export async function createRelationship(context:MemberContext,input:{sourceKey:string;targetKey:string;type:RelationshipType;reason:string}){const artifacts=await db.artifact.findMany({where:{projectId:context.projectId,key:{in:[input.sourceKey,input.targetKey]},archivedAt:null}});if(artifacts.length!==2)throw new Error("ARTIFACT_NOT_FOUND");const ids=new Map(artifacts.map(artifact=>[artifact.key,artifact.id]));return db.artifactRelationship.create({data:{projectId:context.projectId,sourceArtifactId:ids.get(input.sourceKey)!,targetArtifactId:ids.get(input.targetKey)!,type:input.type,reason:input.reason}});}
export async function deleteRelationship(context:MemberContext,relationshipId:string){const result=await db.artifactRelationship.deleteMany({where:{id:relationshipId,projectId:context.projectId}});if(result.count!==1)throw new Error("RELATIONSHIP_NOT_FOUND");}

export async function incrementRateLimit(input:{subject:string;action:string;projectId?:string;limit:number;windowSeconds:number}){
  const now=Date.now(),windowMs=input.windowSeconds*1000,windowStart=new Date(Math.floor(now/windowMs)*windowMs),expiresAt=new Date(Math.floor(now/windowMs)*windowMs+windowMs);
  const result=await db.$transaction(async tx=>{await tx.rateLimitWindow.deleteMany({where:{expiresAt:{lt:new Date(now)}}});const row=await tx.rateLimitWindow.upsert({where:{subject_action_windowStart:{subject:input.subject,action:input.action,windowStart}},create:{subject:input.subject,action:input.action,windowStart,expiresAt,count:1,projectId:input.projectId},update:{count:{increment:1}}});return row.count;});
  return{allowed:result<=input.limit,remaining:Math.max(input.limit-result,0),retryAfter:Math.max(Math.ceil((expiresAt.getTime()-now)/1000),1)};
}

export type TransactionClient=Prisma.TransactionClient;

function projectKeyFromName(name:string):string{
  const base=name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,32)||"project";
  return `${base}-${Math.random().toString(36).slice(2,7)}`;
}

export async function createProjectWithOwner(actorId:string,input:{name:string;description?:string}){
  const key=projectKeyFromName(input.name);
  return db.$transaction(async tx=>{
    const project=await tx.project.create({data:{key,name:input.name,description:input.description??""}});
    await tx.projectMember.create({data:{projectId:project.id,userId:actorId,role:ProjectRole.OWNER}});
    await tx.artifact.create({data:{projectId:project.id,key:"PRD-001",type:ArtifactType.PRD,title:"Product vision",status:ArtifactStatus.DRAFT,currentVersionNumber:1,versions:{create:{version:1,title:"Product vision",content:`# ${input.name}\n\n${input.description??""}\n\n## Vision\nDescribe the outcome this product creates.`,changeNote:"Seed vision from project creation",createdById:actorId}}}});
    await tx.mutationRecord.create({data:{projectId:project.id,actorId,kind:MutationKind.CREATE,toVersion:1,reason:"Project created"}});
    return{key,id:project.id};
  });
}

export async function listMembers(projectId:string){
  return db.projectMember.findMany({where:{projectId},include:{user:{select:{email:true,displayName:true}}},orderBy:{createdAt:"asc"}});
}

export async function addMember(projectId:string,email:string,role:ProjectRole){
  const user=await db.user.findUnique({where:{email:email.trim().toLowerCase()}});
  if(!user)throw new Error("USER_NOT_FOUND");
  return db.projectMember.upsert({where:{projectId_userId:{projectId,userId:user.id}},create:{projectId,userId:user.id,role},update:{role}});
}

export async function setMemberRole(actorId:string,projectId:string,memberId:string,role:ProjectRole){
  return db.$transaction(async tx=>{
    const actor=await tx.projectMember.findFirst({where:{projectId,userId:actorId}});if(!actor||actor.role!==ProjectRole.OWNER)throw new Error("FORBIDDEN");
    const target=await tx.projectMember.findUnique({where:{id:memberId}});if(!target||target.projectId!==projectId)throw new Error("MEMBER_NOT_FOUND");
    const owners=await tx.projectMember.count({where:{projectId,role:ProjectRole.OWNER}});
    if(target.role===ProjectRole.OWNER&&role!==ProjectRole.OWNER&&owners<=1)throw new Error("LAST_OWNER");
    return tx.projectMember.update({where:{id:memberId},data:{role}});
  });
}

export async function removeMember(actorId:string,projectId:string,memberId:string){
  return db.$transaction(async tx=>{
    const actor=await tx.projectMember.findFirst({where:{projectId,userId:actorId}});if(!actor||actor.role!==ProjectRole.OWNER)throw new Error("FORBIDDEN");
    const target=await tx.projectMember.findUnique({where:{id:memberId}});if(!target||target.projectId!==projectId)throw new Error("MEMBER_NOT_FOUND");
    if(target.userId===actorId)throw new Error("CANNOT_REMOVE_SELF");
    const owners=await tx.projectMember.count({where:{projectId,role:ProjectRole.OWNER}});
    if(target.role===ProjectRole.OWNER&&owners<=1)throw new Error("LAST_OWNER");
    await tx.projectMember.delete({where:{id:memberId}});
  });
}
