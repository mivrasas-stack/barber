import {NextRequest} from "next/server";
import {requireCustomerSession,customerResponse,customerError} from "@/modules/customers/application/customer-portal-auth";
import {customerProductCatalog} from "@/modules/customers/application/customer-products";
export async function GET(request:NextRequest){
 try{const session=await requireCustomerSession(request);
  const waitingOnly=request.nextUrl.searchParams.get("waiting")==="true";
  return customerResponse({data:await customerProductCatalog(session.userId,waitingOnly)});
 }catch(error){return customerError(error);}
}
