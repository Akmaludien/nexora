import { PrismaClient, ArtifactStatus, ArtifactType, ProjectComplexity, ProjectRole, RelationshipType } from "@prisma/client";
import { hash } from "bcryptjs";
import { pathToFileURL } from "node:url";
import { demoProject } from "../src/lib/demo";

const prisma=new PrismaClient();
const artifactTypes:Record<string,ArtifactType>={prd:"PRD",requirement:"REQUIREMENT",feature:"FEATURE","user-story":"USER_STORY","business-rule":"BUSINESS_RULE","user-flow":"USER_FLOW",api:"API",database:"DATABASE",architecture:"ARCHITECTURE",security:"SECURITY",testing:"TESTING",roadmap:"ROADMAP",task:"TASK",decision:"DECISION","design-context":"DESIGN_CONTEXT"};
const relationshipTypes:Record<string,RelationshipType>={depends_on:"DEPENDS_ON",implements:"IMPLEMENTS",affects:"AFFECTS",requires:"REQUIRES",maps_to:"MAPS_TO",validates:"VALIDATES",derived_from:"DERIVED_FROM"};

export const DEMO_SEED_EMAIL = "architect@nexora.local";
export const DEMO_SEED_PASSWORD = "nexora-production-foundation";

/**
 * Resolves the seed owner credentials. In production (NODE_ENV=production or
 * SEED_STRICT=true) demo credentials are refused: SEED_OWNER_EMAIL and
 * SEED_OWNER_PASSWORD must be provided explicitly, the password must differ
 * from the demo default, and it must be at least 12 characters. In
 * development the demo values remain the default so local flows
 * (db:dev + test scripts) keep working unchanged.
 */
export function resolveSeedCredentials(env: Record<string, string | undefined> = process.env): { email: string; password: string } {
  const email = (env.SEED_OWNER_EMAIL ?? "").trim().toLowerCase();
  const password = (env.SEED_OWNER_PASSWORD ?? "").trim();
  const strict = env.NODE_ENV === "production" || env.SEED_STRICT === "true";
  if (!strict) {
    return { email: email || DEMO_SEED_EMAIL, password: password || DEMO_SEED_PASSWORD };
  }
  if (!email || !password) {
    throw new Error("Production seed requires SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD; demo credentials are refused in production.");
  }
  if (password === DEMO_SEED_PASSWORD) {
    throw new Error("Production seed password must differ from the demo default; choose a strong unique password.");
  }
  if (password.length < 12) {
    throw new Error("Production seed password must be at least 12 characters.");
  }
  return { email, password };
}

export async function seed(){
  const { email, password } = resolveSeedCredentials();
  const owner=await prisma.user.upsert({where:{email},create:{email,passwordHash:await hash(password,12),displayName:"Nexora Architect"},update:{passwordHash:await hash(password,12),status:"ACTIVE"}});
  const project=await prisma.project.upsert({where:{key:demoProject.id},create:{key:demoProject.id,name:demoProject.name,description:demoProject.description,complexity:demoProject.complexity as ProjectComplexity},update:{name:demoProject.name,description:demoProject.description,complexity:demoProject.complexity as ProjectComplexity}});
  await prisma.projectMember.upsert({where:{projectId_userId:{projectId:project.id,userId:owner.id}},create:{projectId:project.id,userId:owner.id,role:ProjectRole.OWNER},update:{role:ProjectRole.OWNER}});
  const artifactIds=new Map<string,string>();
  for(const item of demoProject.artifacts){
    const metadata={acceptanceCriteria:item.acceptanceCriteria,milestone:item.milestone};
    const existing=await prisma.artifact.findUnique({where:{projectId_key:{projectId:project.id,key:item.id}}});
    const artifact=existing??await prisma.artifact.create({data:{projectId:project.id,key:item.id,type:artifactTypes[item.type],title:item.title,status:ArtifactStatus.VALIDATED,currentVersionNumber:1,metadata,versions:{create:{version:1,title:item.title,content:item.content,changeNote:"Seeded demo artifact",createdById:owner.id}}}});
    artifactIds.set(item.id,artifact.id);
  }
  for(const edge of demoProject.relationships){await prisma.artifactRelationship.upsert({where:{projectId_sourceArtifactId_targetArtifactId_type:{projectId:project.id,sourceArtifactId:artifactIds.get(edge.sourceId)!,targetArtifactId:artifactIds.get(edge.targetId)!,type:relationshipTypes[edge.type]}},create:{projectId:project.id,sourceArtifactId:artifactIds.get(edge.sourceId)!,targetArtifactId:artifactIds.get(edge.targetId)!,type:relationshipTypes[edge.type],reason:edge.reason},update:{reason:edge.reason}});}
  const discovery={goal:"Unify planning and delivery intelligence",users:"Distributed product teams",problem:"Work and risk context is fragmented",journey:"Plan work, execute, inspect risk, review outcomes",features:"Projects, tasks, dependencies, risk summaries",data:"Workspaces, projects, tasks, members, milestones"};
  for(const [category,value] of Object.entries(discovery)){await prisma.discoveryAnswer.upsert({where:{projectId_category:{projectId:project.id,category}},create:{projectId:project.id,category,value,status:"ANSWERED",answeredById:owner.id},update:{value,status:"ANSWERED",answeredById:owner.id}});}
  return{email,password,projectKey:project.key};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){seed().then(result=>console.log(`Seeded ${result.projectKey} for ${result.email}`)).finally(()=>prisma.$disconnect());}
