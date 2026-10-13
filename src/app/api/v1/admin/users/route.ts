import { NextRequest } from "next/server";
import { createGlobalUserSchema,globalUserListSchema } from "@/modules/platform-admin/domain/global-users.schema";
import { requirePlatformAdmin,globalUsersError,noStore } from "@/modules/platform-admin/application/global-users-http";
import { listGlobalUsers } from "@/modules/platform-admin/application/global-users-read";
import { createGlobalUser } from "@/modules/platform-admin/application/global-users-create";
import { ValidationError } from "@/shared/errors/app-error";

export async function GET(req:NextRequest) {
 try {
  await requirePlatformAdmin(req);
  const parsed=globalUserListSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if(!parsed.success)throw new ValidationError("Parámetros de búsqueda inválidos");
  return noStore({data:await listGlobalUsers(parsed.data)});
 }catch(err){return globalUsersError(err);}
}
export async function POST(req:NextRequest) {
 try {
  const session=await requirePlatformAdmin(req);
  const parsed=createGlobalUserSchema.safeParse(await req.json());
  if(!parsed.success)throw new ValidationError("Datos de registro inválidos",parsed.error.flatten());
  const created=await createGlobalUser(parsed.data,session.userId);
  return noStore({data:{
    id:created.id,email:created.email,tenantId:created.tenantId,accessEndsAt:created.accessEndsAt
  },credentials:{email:created.email,temporaryPassword:created.temporaryPassword}},201);
 }catch(err){return globalUsersError(err);}
}
