import {and,eq,sql} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {appointments,appointmentServices} from "@/infrastructure/database/schema/appointments";
import {orders} from "@/infrastructure/database/schema/commerce";
import {users} from "@/infrastructure/database/schema/users";

export const POINTS_PER_COMPLETED_CUT=100;
// Rules reflect completed services only. No invented balance, no manually awarded points.
export const LOYALTY_TIERS=[
 {name:"Bronce",from:0,icon:"shield"},
 {name:"Plata",from:500,icon:"medal"},
 {name:"Oro VIP",from:1500,icon:"trophy"},
 {name:"Platino VIP",from:3000,icon:"crown"},
 {name:"Diamante",from:6000,icon:"sparkles"},
] as const;
export function loyaltyFromCompletedCuts(cuts:number){
 const points=Math.max(0,cuts)*POINTS_PER_COMPLETED_CUT;
 const current=[...LOYALTY_TIERS].reverse().find(t=>points>=t.from)!;
 const next=LOYALTY_TIERS.find(t=>t.from>points)||null;
 const badges=[
  {name:"Primer corte",goal:1,description:"Completa tu primera visita"},
  {name:"Cliente frecuente",goal:5,description:"5 visitas completadas"},
  {name:"Oro VIP",goal:15,description:"15 visitas completadas"},
  {name:"Platino VIP",goal:30,description:"30 visitas completadas"},
  {name:"Leyenda",goal:60,description:"60 visitas completadas"},
 ].map(b=>({...b,unlocked:cuts>=b.goal}));
 return {cuts,points,currentTier:current.name,nextTier:next?.name||null,
  nextTierPoints:next?.from||null,progress:next?Math.floor((points-current.from)/(next.from-current.from)*100):100,
  badges,pointsPerCut:POINTS_PER_COMPLETED_CUT};
}
export async function getCustomerLoyalty(userId:string){
 const [counts,spending,user]=await Promise.all([
  db.select({tenantId:appointments.tenantId,cuts:sql<number>`count(distinct ${appointments.id})::int`})
   .from(appointments)
   .innerJoin(appointmentServices,eq(appointmentServices.appointmentId,appointments.id))
   .where(and(eq(appointments.customerUserId,userId),eq(appointments.status,"COMPLETED")))
   .groupBy(appointments.tenantId),
  db.select({total:sql<string>`coalesce(sum(${orders.grandTotalMinor}),0)::text`})
   .from(orders).where(and(eq(orders.customerUserId,userId),eq(orders.status,"COMPLETED"))),
  db.select({createdAt:users.createdAt}).from(users).where(eq(users.id,userId)).limit(1),
 ]);
 const cuts=counts.reduce((sum,row)=>sum+Number(row.cuts),0);
 return {...loyaltyFromCompletedCuts(cuts),perTenant:counts.map(row=>({
  tenantId:row.tenantId,cuts:Number(row.cuts),points:Number(row.cuts)*POINTS_PER_COMPLETED_CUT,
 })),amountSpentMinor:spending[0]?.total||"0",memberSince:user[0]?.createdAt||null};
}
