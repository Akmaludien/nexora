import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import { ProjectRole } from "@prisma/client";

export const sessionCookie = "nexora_session";

export type AuthSession = { id:string; userId:string; email:string; expiresAt:Date };

function tokenHash(token:string){return createHash("sha256").update(token).digest("hex");}

export async function verifyCredentials(email:string,password:string){
  const user=await db.user.findUnique({where:{email:email.trim().toLowerCase()}});
  if(!user||user.status!=="ACTIVE")return null;
  return await compare(password,user.passwordHash)?user:null;
}

export async function createSession(userId:string){
  const token=randomBytes(32).toString("base64url"),expiresAt=new Date(Date.now()+8*60*60*1000);
  const session=await db.session.create({data:{userId,tokenHash:tokenHash(token),expiresAt}});
  return{token,sessionId:session.id,expiresAt};
}

export async function verifySession(token?:string):Promise<AuthSession|null>{
  if(!token)return null;
  const session=await db.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});
  if(!session||session.revokedAt||session.expiresAt<=new Date()||session.user.status!=="ACTIVE")return null;
  return{id:session.id,userId:session.userId,email:session.user.email,expiresAt:session.expiresAt};
}

export async function getCurrentSession() {
  const store = await cookies();
  return await verifySession(store.get(sessionCookie)?.value);
}

export async function authorizeProject(projectKey:string,allowed:ProjectRole[]=[ProjectRole.OWNER,ProjectRole.EDITOR,ProjectRole.VIEWER]) {
  const session = await getCurrentSession();
  if (session === null) {
    return null;
  }
  const membership = await db.projectMember.findFirst({where:{userId:session.userId,role:{in:allowed},project:{key:projectKey,status:"ACTIVE"}},select:{projectId:true,role:true,project:{select:{key:true}}}});
  if (membership === null) {
    return null;
  }
  return {userId:session.userId,projectId:membership.projectId,projectKey:membership.project.key,role:membership.role,sessionId:session.id,email:session.email};
}

export async function revokeSession(token?:string){if(!token)return;await db.session.updateMany({where:{tokenHash:tokenHash(token),revokedAt:null},data:{revokedAt:new Date()}});}

export function hasSameOrigin(request:Request){
  const origin=request.headers.get("origin");if(!origin)return process.env.NODE_ENV!=="production";
  const forwardedHost=request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();const host=forwardedHost??request.headers.get("host");
  try{return new URL(origin).host===host;}catch{return false;}
}

export function constantTimeEqual(left:string,right:string){const a=Buffer.from(left),b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b);}
