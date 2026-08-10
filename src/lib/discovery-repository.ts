import { DiscoveryStatus } from "@prisma/client";
import { db } from "./db";
import type { MemberContext } from "./project-repository";

export const discoveryQuestions={goal:"What outcome should this product create?",users:"Who experiences the problem most directly?",problem:"What is failing in their current workflow?",journey:"Describe the primary journey from intent to success.",features:"Which capabilities are essential for the first release?",data:"What information must the product store or derive?",auth:"Who can sign in, and what permissions differ?",scale:"What usage and growth should the architecture support?",deployment:"Where must the product run and who operates it?"} as const;
const critical=new Set(["goal","users","problem","auth","data"]);

export async function getDiscoveryState(projectId:string){
  const rows=await db.discoveryAnswer.findMany({where:{projectId}});const byCategory=new Map(rows.map(row=>[row.category,row]));
  const categories=Object.keys(discoveryQuestions) as Array<keyof typeof discoveryQuestions>;const answered=categories.filter(key=>byCategory.get(key)?.status===DiscoveryStatus.ANSWERED&&byCategory.get(key)?.value?.trim());const skipped=categories.filter(key=>byCategory.get(key)?.status===DiscoveryStatus.SKIPPED);const missing=categories.filter(key=>!answered.includes(key));
  const answeredWeight=answered.reduce((sum,key)=>sum+(critical.has(key)?2:1),0),totalWeight=categories.reduce((sum,key)=>sum+(critical.has(key)?2:1),0);const completeness=Math.round(answeredWeight/totalWeight*100);
  const next=[...missing].sort((a,b)=>Number(critical.has(b))-Number(critical.has(a)))[0];
  return{answers:Object.fromEntries(rows.map(row=>[row.category,{value:row.value,status:row.status}])),answered,skipped,missing,completeness,sufficient:completeness>=80&&!missing.some(key=>critical.has(key)),nextQuestion:next?{category:next,question:discoveryQuestions[next]}:null};
}

export async function saveDiscoveryAnswer(context:MemberContext,input:{category:keyof typeof discoveryQuestions;value?:string;skip?:boolean}){
  const status=input.skip?DiscoveryStatus.SKIPPED:DiscoveryStatus.ANSWERED;if(!input.skip&&!input.value?.trim())throw new Error("ANSWER_REQUIRED");
  await db.discoveryAnswer.upsert({where:{projectId_category:{projectId:context.projectId,category:input.category}},create:{projectId:context.projectId,category:input.category,value:input.skip?null:input.value!.trim(),status,answeredById:context.userId},update:{value:input.skip?null:input.value!.trim(),status,answeredById:context.userId}});return getDiscoveryState(context.projectId);
}
