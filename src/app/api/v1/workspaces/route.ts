import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { ResolveWorkspacesUseCase } from "@/modules/tenancy/application/resolve-workspaces.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
 try {
  const token=request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session=token?await validateSessionWithDb(token):null;
  if(!session)return NextResponse.json({error:"Sesión inválida o expirada"},{status:401});
  const workspaces=await new ResolveWorkspacesUseCase().execute(session.userId);
  const selected=request.cookies.get("barber_active_workspace")?.value;
  const current=workspaces.find(w=>w.id===selected);
  const activeWorkspaceId=current?.id||(workspaces.length===1?workspaces[0].id:null);
  const response=NextResponse.json({workspaces,activeWorkspaceId},{
   headers:{"Cache-Control":"private, no-store"},
  });
  // Heal a missing/stale workspace cookie only for a single valid membership.
  // With multiple spaces the user explicitly chooses which tenant to manage.
  if(activeWorkspaceId!==selected){
   response.cookies.set("barber_active_workspace",activeWorkspaceId||"",{
    httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",
    path:"/",maxAge:activeWorkspaceId?30*24*60*60:0,
   });
  }
  return response;
 }catch(err){
  if(err instanceof AppError)return NextResponse.json({error:err.message},{status:err.statusCode});
  return NextResponse.json({error:"No fue posible consultar tus barberías"},{status:500});
 }
}
