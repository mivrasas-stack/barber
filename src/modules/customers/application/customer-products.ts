import {and,eq,sql} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {customerRelationships} from "@/infrastructure/database/schema/professionals";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {locations} from "@/infrastructure/database/schema/locations";
import {ModuleEntitlementResolver} from "@/modules/modules/application/module-entitlement-resolver";
import {DrizzleModuleRepository} from "@/modules/modules/infrastructure/drizzle-module.repository";
import {DrizzleSubscriptionRepository} from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import {products,productCategories,productVariants,inventoryPositions} from "@/infrastructure/database/schema/commerce";

export const WAITING_CATEGORY_SLUGS=new Set(["bebidas","comidas","snacks","cafeteria","sala-espera","waiting-room","drinks","food"]);
export async function customerProductCatalog(userId:string,waitingOnly=false){
 const rows=await db.select({
  tenantId:tenants.id,tenantName:tenants.name,locationId:locations.id,locationName:locations.name,
  productId:products.id,productName:products.name,description:products.description,brand:products.brand,
  category:productCategories.name,categorySlug:productCategories.slug,variantId:productVariants.id,
  variantName:productVariants.name,priceMinor:productVariants.priceMinor,currency:productVariants.currency,
  trackInventory:productVariants.trackInventory,onHand:inventoryPositions.onHand,reserved:inventoryPositions.reserved,
 }).from(customerRelationships)
 .innerJoin(tenants,and(eq(tenants.id,customerRelationships.tenantId),eq(tenants.status,"ACTIVE")))
 .innerJoin(locations,and(eq(locations.tenantId,tenants.id),eq(locations.status,"ACTIVE")))
 .innerJoin(products,and(eq(products.ownerTenantId,tenants.id),eq(products.status,"ACTIVE")))
 .innerJoin(productVariants,and(eq(productVariants.productId,products.id),eq(productVariants.status,"ACTIVE")))
 .leftJoin(productCategories,eq(productCategories.id,products.categoryId))
 .leftJoin(inventoryPositions,and(eq(inventoryPositions.ownerTenantId,tenants.id),
  eq(inventoryPositions.locationId,locations.id),eq(inventoryPositions.productVariantId,productVariants.id)))
 .where(and(eq(customerRelationships.customerUserId,userId),eq(customerRelationships.status,"ACTIVE")))
 .limit(500);
 const resolver=new ModuleEntitlementResolver(new DrizzleModuleRepository(),new DrizzleSubscriptionRepository());
 const linkedTenants=[...new Set(rows.map(r=>r.tenantId))];
 const allowed=new Set((await Promise.all(linkedTenants.map(async id=>({id,enabled:await resolver.isModuleEnabled(id,"commerce.products")}))))
  .filter(x=>x.enabled).map(x=>x.id));
 return rows.filter(r=>allowed.has(r.tenantId)&&(!waitingOnly||WAITING_CATEGORY_SLUGS.has(r.categorySlug||"")))
 .map(r=>({...r,priceMinor:r.priceMinor.toString(),category:r.category||"Otros",
  available:!r.trackInventory||Math.max(0,(r.onHand||0)-(r.reserved||0))>0,
  availableUnits:r.trackInventory?Math.max(0,(r.onHand||0)-(r.reserved||0)):null,
  onHand:undefined,reserved:undefined,trackInventory:undefined,
 }));
}
