import {NextRequest} from "next/server";
import {requireCustomerSession,customerResponse,customerError} from "@/modules/customers/application/customer-portal-auth";
import {getCustomerLoyalty} from "@/modules/customers/application/loyalty";
export async function GET(request:NextRequest){
 try{const session=await requireCustomerSession(request);
  return customerResponse({data:await getCustomerLoyalty(session.userId)});
 }catch(error){return customerError(error);}
}
