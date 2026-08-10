import { z } from "zod";

export const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) });
export const signupSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128), displayName: z.string().trim().min(1).max(120).optional() });
export const createProjectSchema = z.object({ name: z.string().trim().min(2).max(160), description: z.string().trim().max(2000).optional() });
export const projectKeySchema=z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/);
export const memberSchema = z.object({ projectKey:projectKeySchema, email: z.string().email().max(254), role: z.enum(["OWNER","EDITOR","VIEWER"]) });
export const memberRoleSchema = z.object({ projectKey:projectKeySchema, memberId: z.string().uuid(), role: z.enum(["OWNER","EDITOR","VIEWER"]) });
export const artifactKeySchema=z.string().regex(/^[A-Z]+-\d{3}$/);
export const artifactUpdateSchema = z.object({ projectKey:projectKeySchema, artifactKey:artifactKeySchema, content: z.string().min(1).max(100_000), reason: z.string().max(500).optional(),expectedVersion:z.number().int().positive().optional() });
export const artifactCreateSchema=z.object({projectKey:projectKeySchema,key:artifactKeySchema,type:z.enum(["PRD","REQUIREMENT","FEATURE","USER_STORY","BUSINESS_RULE","USER_FLOW","API","DATABASE","ARCHITECTURE","SECURITY","TESTING","ROADMAP","TASK","DECISION","DESIGN_CONTEXT"]),title:z.string().min(1).max(240),content:z.string().min(1).max(100_000)});
export const restoreSchema=z.object({projectKey:projectKeySchema,artifactKey:artifactKeySchema,version:z.number().int().positive(),reason:z.string().max(500).optional()});
export const assistantSchema = z.object({ projectKey:projectKeySchema,prompt: z.string().min(2).max(4_000), artifactId: artifactKeySchema.optional() });
export const aiJobSchema = z.object({ projectKey:projectKeySchema,prompt: z.string().min(2).max(4_000), artifactId: artifactKeySchema.optional() });
export const mcpSchema = z.object({ tool: z.enum(["get_project_context", "get_requirements", "get_feature", "get_architecture", "get_api_spec", "get_database_schema", "get_tasks", "get_decisions", "get_design_context", "get_spec_health", "get_impact_analysis", "search_project_knowledge"]), arguments: z.record(z.string(), z.string()).default({}) });
export const impactReviewSchema=z.object({projectKey:projectKeySchema,proposalId:z.string().uuid(),itemId:z.string().uuid().optional(),decision:z.enum(["ACCEPTED","REJECTED"]),content:z.string().max(100_000).optional()});
export const discoveryAnswerSchema=z.object({projectKey:projectKeySchema,category:z.enum(["goal","users","problem","journey","features","data","auth","scale","deployment"]),value:z.string().max(10_000).optional(),skip:z.boolean().optional()});
export const relationshipSchema=z.object({projectKey:projectKeySchema,sourceKey:artifactKeySchema,targetKey:artifactKeySchema,type:z.enum(["DEPENDS_ON","IMPLEMENTS","AFFECTS","REQUIRES","MAPS_TO","VALIDATES","DERIVED_FROM"]),reason:z.string().min(2).max(2000)}).refine(value=>value.sourceKey!==value.targetKey,{message:"Relationship endpoints must differ"});
