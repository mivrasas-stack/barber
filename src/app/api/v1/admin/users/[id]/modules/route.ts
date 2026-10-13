import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin,globalUsersError,noStore } from "@/modules/platform-admin/application/global-users-http";
import { moduleOverrideSchema } from "@/modules/platform-admin/domain/global-users.schema";
import { setGlobalUserModule } from "@/modules/platform-admin/application/global-users-mutate";
import { ValidationError } from "@/shared/errors/app-error";
export async function PUT(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
 try {
  const admin=await requirePlatformAdmin(req);
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)throw new ValidationError("ID inválido");
  const body=moduleOverrideSchema.safeParse(await req.json());
  if(!body.success)throw new ValidationError("Módulo o permiso inválido");
  return noStore({data:await setGlobalUserModule(id,body.data,admin.userId)});
 }catch(e){return globalUsersError(e);}
}
