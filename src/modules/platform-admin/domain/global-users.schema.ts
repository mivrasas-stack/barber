import { z } from "zod";

const email = z.string().trim().email().max(255);
const slug = z.string().trim().toLowerCase().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const grantSchema = z.discriminatedUnion("duration", [
  z.object({ duration: z.literal("DAY") }),
  z.object({ duration: z.literal("MONTH") }),
  z.object({ duration: z.literal("SIX_MONTHS") }),
  z.object({ duration: z.literal("YEAR") }),
  z.object({
    duration: z.literal("CUSTOM"),
    startsAt: z.string().datetime({offset:true}).optional(),
    endsAt: z.string().datetime({offset:true}),
  }),
]);
export const createGlobalUserSchema = z.discriminatedUnion("kind", [
  z.object({kind:z.literal("CUSTOMER"), name:z.string().trim().min(2).max(255),email, tenantId:z.string().uuid().optional()}).strict(),
  z.object({kind:z.literal("PLATFORM_ADMIN"),name:z.string().trim().min(2).max(255),email}).strict(),
  z.object({kind:z.literal("EMPLOYEE"), name:z.string().trim().min(2).max(255),email,tenantId:z.string().uuid()}).strict(),
  z.object({kind:z.literal("SOLO"),name:z.string().trim().min(2).max(255),email,displayName:z.string().trim().min(2).max(255),slug,planCode:z.string().trim().min(1).max(50),grant:grantSchema}).strict(),
  z.object({kind:z.literal("BUSINESS"),name:z.string().trim().min(2).max(255),email,businessName:z.string().trim().min(2).max(255),slug,planCode:z.string().trim().min(1).max(50),grant:grantSchema}).strict(),
]);
export const editGlobalUserSchema = z.object({
  name:z.string().trim().min(2).max(255).optional(),
  email:email.optional(),
  status:z.enum(["ACTIVE","SUSPENDED","DISABLED"]).optional(),
  isPlatformAdmin:z.boolean().optional(),
}).strict().refine(x=>Object.keys(x).length>0,"No changes provided");
export const accessChangeSchema=z.object({
  tenantId:z.string().uuid(),
  planCode:z.string().trim().min(1).max(50).optional(),
  grant:grantSchema.optional(),
}).strict().refine(x=>!!x.planCode||!!x.grant,"Plan or grant required");
export const moduleOverrideSchema=z.object({
  tenantId:z.string().uuid(),
  moduleCode:z.string().trim().min(2).max(100),
  state:z.enum(["INHERIT","FORCE_ENABLED","FORCE_DISABLED"]),
  reason:z.string().trim().min(3).max(500),
}).strict();
export const globalUserListSchema=z.object({
 q:z.string().trim().max(120).optional().default(""),
 kind:z.enum(["ALL","PLATFORM_ADMIN","SOLO","BUSINESS","EMPLOYEE","CUSTOMER"]).default("ALL"),
 status:z.enum(["ALL","ACTIVE","SUSPENDED","DISABLED"]).default("ALL"),
 page:z.coerce.number().int().min(1).max(100000).default(1),
 pageSize:z.coerce.number().int().min(1).max(50).default(20),
});
export type CreateGlobalUserInput=z.infer<typeof createGlobalUserSchema>;
export type EditGlobalUserInput=z.infer<typeof editGlobalUserSchema>;
export type AccessChangeInput=z.infer<typeof accessChangeSchema>;
export type ModuleOverrideInput=z.infer<typeof moduleOverrideSchema>;
export type GlobalUserListInput=z.infer<typeof globalUserListSchema>;
export type AccessGrant=z.infer<typeof grantSchema>;
