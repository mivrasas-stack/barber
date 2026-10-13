import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin,globalUsersError,noStore } from "@/modules/platform-admin/application/global-users-http";
import { resetGlobalUserPassword } from "@/modules/platform-admin/application/global-users-mutate";
import { ValidationError } from "@/shared/errors/app-error";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
 try {
  const admin=await requirePlatformAdmin(req);
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)throw new ValidationError("ID inválido");
  return noStore({credentials:await resetGlobalUserPassword(id,admin.userId)});
 }catch(e){return globalUsersError(e);}
}
