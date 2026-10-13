import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSessionWithDb } from "@/infrastructure/auth/session";
import { AppError, UnauthenticatedError } from "@/shared/errors/app-error";

export async function requireCustomerSession(request:NextRequest) {
 const token=request.cookies.get(SESSION_COOKIE_NAME)?.value;
 const session=token?await validateSessionWithDb(token):null;
 if(!session)throw new UnauthenticatedError();
 return session;
}
export function customerResponse(data:unknown,status=200) {
 return NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
export function customerError(err:unknown) {
 if(err instanceof AppError)return customerResponse({error:err.message,code:err.code},err.statusCode);
 if(err instanceof SyntaxError)return customerResponse({error:"JSON inválido"},400);
 console.error("Customer portal request failed",err instanceof Error?err.name:"unknown");
 return customerResponse({error:"No se pudo completar la solicitud"},500);
}
