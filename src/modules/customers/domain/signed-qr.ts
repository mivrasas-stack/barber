import {createHmac,timingSafeEqual} from "node:crypto";
import {env} from "@/shared/config/env";
const VERSION="v1";
const VALID_UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function signature(tenantId:string):string{
 return createHmac("sha256",env.AUTH_SECRET).update("barber:customer-qr:"+VERSION+":"+tenantId).digest("base64url");
}
export function signCustomerQr(tenantId:string):string{
 if(!VALID_UUID.test(tenantId))throw new Error("Invalid tenant id");
 return VERSION+"."+tenantId+"."+signature(tenantId);
}
export function validateCustomerQr(token:string):string|null{
 const parts=token.split(".");
 if(parts.length!==3 || parts[0]!==VERSION || !VALID_UUID.test(parts[1]) || parts[2].length!==43)return null;
 const expected=Buffer.from(signature(parts[1]));
 const actual=Buffer.from(parts[2]);
 return expected.length===actual.length && timingSafeEqual(actual,expected)?parts[1]:null;
}
