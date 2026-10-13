import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin,globalUsersError,noStore } from "@/modules/platform-admin/application/global-users-http";
import { editGlobalUserSchema } from "@/modules/platform-admin/domain/global-users.schema";
import { getGlobalUserDetail } from "@/modules/platform-admin/application/global-users-read";
import { editGlobalUser } from "@/modules/platform-admin/application/global-users-mutate";
import { ValidationError } from "@/shared/errors/app-error";

type Context={params:Promise<{id:string}>};
async function parseId(ctx:Context){
 const {id}=await ctx.params;
 if(!z.string().uuid().safeParse(id).success)throw new ValidationError("ID de usuario inválido");
 return id;
}
export async function GET(req:NextRequest,ctx:Context) {
 try{await requirePlatformAdmin(req);return noStore({data:await getGlobalUserDetail(await parseId(ctx))});}
 catch(e){return globalUsersError(e);}
}
export async function PATCH(req:NextRequest,ctx:Context) {
 try {
  const admin=await requirePlatformAdmin(req);
  const id=await parseId(ctx);
  const parsed=editGlobalUserSchema.safeParse(await req.json());
  if(!parsed.success)throw new ValidationError("Cambios inválidos");
  return noStore({data:await editGlobalUser(id,parsed.data,admin.userId)});
 }catch(e){return globalUsersError(e);}
}
export async function DELETE(req:NextRequest,ctx:Context) {
 try {
  const admin=await requirePlatformAdmin(req);
  const id=await parseId(ctx);
  // No physical deletion: accounting, bookings and audit logs are immutable.
  return noStore({data:await editGlobalUser(id,{status:"DISABLED"},admin.userId)});
 }catch(e){return globalUsersError(e);}
}
