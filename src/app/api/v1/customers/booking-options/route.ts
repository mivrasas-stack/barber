import {NextRequest} from "next/server";
import {requireCustomerSession,customerResponse,customerError} from "@/modules/customers/application/customer-portal-auth";
import {listCustomerBookingOptions} from "@/modules/customers/application/booking-catalog";

export async function GET(request:NextRequest){
 try{
  await requireCustomerSession(request);
  return customerResponse({data:await listCustomerBookingOptions()});
 }catch(e){return customerError(e);}
}
