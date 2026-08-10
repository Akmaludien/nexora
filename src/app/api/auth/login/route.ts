import { NextResponse } from "next/server";
import { createSession,hasSameOrigin,requestIsSecure,sessionCookie,verifyCredentials } from "@/lib/auth";
import { incrementRateLimit } from "@/lib/project-repository";
import { loginSchema } from "@/lib/validation";

export async function POST(request:Request){
  if(!hasSameOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  const parsed=loginSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Enter a valid email and password."},{status:400});
  const subject=`login:${parsed.data.email.toLowerCase()}:${request.headers.get("x-forwarded-for")??"local"}`;const limit=await incrementRateLimit({subject,action:"login",limit:5,windowSeconds:300});if(!limit.allowed)return NextResponse.json({error:"Too many login attempts."},{status:429,headers:{"Retry-After":String(limit.retryAfter)}});
  const user=await verifyCredentials(parsed.data.email,parsed.data.password);if(!user)return NextResponse.json({error:"Invalid email or password."},{status:401});
  const session=await createSession(user.id);const secure=requestIsSecure(request);const response=NextResponse.json({ok:true});response.cookies.set(sessionCookie,session.token,{httpOnly:true,sameSite:"lax",secure,path:"/",expires:session.expiresAt});return response;
}
