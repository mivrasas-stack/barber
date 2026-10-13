import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin,globalUsersError,noStore } from "@/modules/platform-admin/application/global-users-http";
import { accessChangeSchema } from "@/modules/platform-admin/domain/global-users.schema";
import { changeGlobalUserAccess } from "@/modules/platform-admin/application/global-users-mutate";
import { ValidationError } from "@/shared/errors/app-error";

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
 try {
  const admin=await requirePlatformAdmin(req);
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)throw new ValidationError("ID inválido");
  const body=accessChangeSchema.safeParse(await req.json());
  if(!body.success)throw new ValidationError("Plan o duración inválidos");
  return noStore({data:await changeGlobalUserAccess(id,body.data,admin.userId)});
 }catch(e){return globalUsersError(e);}
}
