import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { DrizzleAppointmentRepository } from "@/modules/appointments/infrastructure/drizzle-appointment.repository";
import { SESSION_COOKIE_NAME,validateSessionWithDb } from "@/infrastructure/auth/session";
import { ResolveWorkspacesUseCase } from "@/modules/tenancy/application/resolve-workspaces.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
 try{
  const token=request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session=token?await validateSessionWithDb(token):null;
  if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"ID inválido"},{status:400});
  const repo=new DrizzleAppointmentRepository();
  const appointment=await repo.findById(id);
  if(!appointment)return NextResponse.json({error:"Cita no encontrada"},{status:404});
  const isOwner=appointment.customerUserId===session.userId;
  if(!isOwner&&!session.isPlatformAdmin){
   try{
    await new ResolveWorkspacesUseCase().validateAccess(session.userId,appointment.tenantId);
   }catch{
    // Do not reveal whether the appointment belongs to another tenant or customer.
    return NextResponse.json({error:"Cita no encontrada"},{status:404});
   }
  }
  const services=await repo.findServicesByAppointmentId(id);
  return NextResponse.json({data:{appointment,services}},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){
  if(e instanceof AppError)return NextResponse.json({error:e.message},{status:e.statusCode});
  return NextResponse.json({error:"Error interno"},{status:500});
 }
}
