import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { AppError, ForbiddenError, UnauthenticatedError } from "@/shared/errors/app-error";

export async function requirePlatformAdmin(req: NextRequest) {
 const token=req.cookies.get(SESSION_COOKIE_NAME)?.value;
 if(!token)throw new UnauthenticatedError();
 const session=await validateSessionWithDb(token);
 if(!session)throw new UnauthenticatedError();
 if(!session.isPlatformAdmin)throw new ForbiddenError("Se requiere administrador de plataforma");
 return session;
}
export function globalUsersError(error:unknown) {
 if(error instanceof AppError) return NextResponse.json({error:error.message,code:error.code},{status:error.statusCode,headers:{"Cache-Control":"no-store"}});
 if(error instanceof SyntaxError) return NextResponse.json({error:"JSON inválido",code:"VALIDATION_ERROR"},{status:400});
 const databaseError=error as {code?:string;cause?:{code?:string}} | null;
 const pgCode=databaseError?.cause?.code ?? databaseError?.code;
 if(pgCode==="23505") return NextResponse.json({error:"Ya existe un registro con ese correo, slug o vínculo",code:"CONFLICT"},{status:409});
 console.error("Platform user operation failed",error instanceof Error?error.name:"Unknown error");
 return NextResponse.json({error:"Error interno",code:"INTERNAL_ERROR"},{status:500});
}
export function noStore<T>(data:T,status=200) {
 return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});
}
