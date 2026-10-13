import {pgTable,uuid,varchar,text,integer,timestamp,uniqueIndex,index} from "drizzle-orm/pg-core";
import {tenants} from "./tenants";
import {users} from "./users";
import {appointments} from "./appointments";

export const customerFavorites=pgTable("customer_favorites",{
 id:uuid("id").primaryKey().defaultRandom(),
 userId:uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 tenantId:uuid("tenant_id").notNull().references(()=>tenants.id,{onDelete:"cascade"}),
 targetType:varchar("target_type",{length:16}).notNull(),
 targetId:uuid("target_id").notNull(),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
 uniqueIndex("customer_favorite_owner_target_uq").on(t.userId,t.targetType,t.targetId),
 index("customer_favorite_tenant_idx").on(t.tenantId),
]);
export const customerReviews=pgTable("customer_reviews",{
 id:uuid("id").primaryKey().defaultRandom(),
 userId:uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 tenantId:uuid("tenant_id").notNull().references(()=>tenants.id,{onDelete:"cascade"}),
 appointmentId:uuid("appointment_id").notNull().references(()=>appointments.id,{onDelete:"cascade"}),
 targetType:varchar("target_type",{length:16}).notNull(),
 targetId:uuid("target_id").notNull(),
 rating:integer("rating").notNull(),
 comment:text("comment").notNull(),
 status:varchar("status",{length:32}).notNull().default("PUBLISHED"),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
 uniqueIndex("customer_review_appointment_target_uq").on(t.appointmentId,t.targetType),
 index("customer_review_tenant_created_idx").on(t.tenantId,t.createdAt),
 index("customer_review_user_idx").on(t.userId),
]);
