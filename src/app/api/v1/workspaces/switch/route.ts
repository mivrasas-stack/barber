import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {SESSION_COOKIE_NAME,validateSessionWithDb} from "@/infrastructure/auth/session";
import {ResolveWorkspacesUseCase} from "@/modules/tenancy/application/resolve-workspaces.usecase";
import {AppError} from "@/shared/errors/app-error";

const input=z.object({workspaceId:z.string().uuid()}).strict();

export async function POST(request:NextRequest){
 try{
  const token=request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session=token?await validateSessionWithDb(token):null;
  if(!session)return NextResponse.json({error:"Sesión inválida o expirada"},{status:401});
  const body=input.safeParse(await request.json());
  if(!body.success)return NextResponse.json({error:"Selecciona una barbería válida"},{status:400});
  const authorized=await new ResolveWorkspacesUseCase().validateAccess(session.userId,body.data.workspaceId);
  const response=NextResponse.json({success:true,activeWorkspace:authorized},{
   headers:{"Cache-Control":"private, no-store"},
  });
  response.cookies.set("barber_active_workspace",authorized.id,{
   httpOnly:true,secure:process.env.NODE_ENV==="production",
   sameSite:"lax",path:"/",maxAge:30*24*60*60,
  });
  return response;
 }catch(err){
  if(err instanceof SyntaxError)return NextResponse.json({error:"Solicitud JSON inválida"},{status:400});
  if(err instanceof AppError)return NextResponse.json({error:err.message},{status:err.statusCode});
  return NextResponse.json({error:"No se pudo cambiar de barbería"},{status:500});
 }
}
