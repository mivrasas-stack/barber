import { eq, and } from "drizzle-orm";
import { db, pool } from "./client";
import { users } from "./schema/users";
import { tenants } from "./schema/tenants";
import { locations } from "./schema/locations";
import { roles, membershipRoles } from "./schema/roles";
import { permissions, rolePermissions } from "./schema/permissions";
import { memberships } from "./schema/memberships";
import { services, locationServices } from "./schema/services";
import { staffProfiles, staffLocations, staffServices } from "./schema/staff";
import { locationBusinessHours, availabilityRules } from "./schema/scheduling";
import { appointments, appointmentServices, appointmentStatusHistory } from "./schema/appointments";
import { subscriptionPlans, tenantSubscriptions } from "./schema/subscriptions";
import { modules, planModules, moduleDependencies } from "./schema/modules";
import {
  professionalProfiles,
  professionalWorkspaces,
  professionalAffiliations,
  professionalAffiliationLocations,
  professionalAffiliationTerms,
  customerRelationships,
} from "./schema/professionals";
import { PasswordHasher } from "@/modules/identity/infrastructure/password-hasher";
import { User } from "@/modules/identity/domain/user";

export const DEV_DEFAULT_PASSWORD = "DevPassword123!";

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  const passwordHash = await PasswordHasher.hash(DEV_DEFAULT_PASSWORD);

  // 1. Seed Permissions
  console.log("📦 Seeding system permissions...");
  const permissionList = [
    { code: "tenant.read", description: "View tenant settings and info" },
    { code: "tenant.manage", description: "Manage tenant settings and subscriptions" },
    { code: "locations.read", description: "View tenant locations" },
    { code: "locations.manage", description: "Create or modify locations" },
    { code: "staff.read", description: "View staff list and profiles" },
    { code: "staff.manage", description: "Manage staff, assignments, and schedules" },
    { code: "customers.read", description: "View customer profiles and history" },
    { code: "appointments.read", description: "View calendar and appointments" },
    { code: "appointments.create", description: "Create new appointments" },
    { code: "appointments.manage", description: "Reschedule, cancel, or complete appointments" },
    { code: "services.read", description: "View catalog of services" },
    { code: "services.manage", description: "Create or edit services and prices" },
    { code: "inventory.read", description: "View products and stock levels" },
    { code: "inventory.manage", description: "Adjust stock, register purchases and sales" },
    { code: "finance.read", description: "View financial reports, earnings, and cash registers" },
    { code: "settings.read", description: "View general settings" },
    { code: "settings.manage", description: "Modify general business settings" },
    { code: "roles.read", description: "View roles and assigned permissions" },
    { code: "roles.manage", description: "Modify roles and assign permissions" },
  ];

  const permMap = new Map<string, string>();
  for (const p of permissionList) {
    const [inserted] = await db
      .insert(permissions)
      .values(p)
      .onConflictDoUpdate({
        target: permissions.code,
        set: { description: p.description },
      })
      .returning();
    permMap.set(p.code, inserted.id);
  }

  // 2. Seed System Template Roles (tenantId = null)
  console.log("👥 Seeding template roles...");
  const roleDefs = [
    { name: "OWNER", description: "Business owner with full administrative privileges" },
    { name: "MANAGER", description: "Shop manager with operational and staff privileges" },
    { name: "EMPLOYEE", description: "Barber / stylist executing services and managing schedule" },
  ];

  const roleMap = new Map<string, string>();
  for (const r of roleDefs) {
    const existing = (await db.select().from(roles)).find(
      (x) => x.name === r.name && x.tenantId === null
    );

    let roleId = existing?.id;
    if (!roleId) {
      const [inserted] = await db.insert(roles).values(r).returning();
      roleId = inserted.id;
    }
    roleMap.set(r.name, roleId);
  }

  // 3. Assign Permissions to Roles
  console.log("🔗 Binding permissions to roles...");
  const ownerPerms = Array.from(permMap.keys());
  const managerPerms = [
    "tenant.read",
    "locations.read",
    "staff.read",
    "staff.manage",
    "customers.read",
    "appointments.read",
    "appointments.create",
    "appointments.manage",
    "services.read",
    "inventory.read",
    "inventory.manage",
    "finance.read",
    "settings.read",
  ];
  const employeePerms = [
    "appointments.read",
    "appointments.create",
    "appointments.manage",
    "services.read",
    "customers.read",
    "inventory.read",
  ];

  const rolePermBindings: [string, string[]][] = [
    ["OWNER", ownerPerms],
    ["MANAGER", managerPerms],
    ["EMPLOYEE", employeePerms],
  ];

  for (const [rName, pCodes] of rolePermBindings) {
    const roleId = roleMap.get(rName)!;
    for (const code of pCodes) {
      const permId = permMap.get(code)!;
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId: permId })
        .onConflictDoNothing();
    }
  }

  // 4. Seed Platform Admin
  console.log("👑 Seeding Platform Administrator...");
  const adminEmail = "admin@barberparadise.dev";
  const adminNormalized = User.normalizeEmail(adminEmail);
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, adminNormalized))
    .limit(1);

  if (!existingAdmin) {
    await db.insert(users).values({
      email: adminEmail,
      emailNormalized: adminNormalized,
      name: "Platform Administrator (Dev)",
      passwordHash,
      isPlatformAdmin: true,
      status: "ACTIVE",
    });
  }

  // 5. Seed Tenant
  console.log("💈 Seeding Dev Tenant...");
  const tenantSlug = "the-royal-barber";
  let [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) {
    const [created] = await db
      .insert(tenants)
      .values({
        slug: tenantSlug,
        name: "The Royal Barber Shop",
        status: "ACTIVE",
        defaultCurrency: "COP",
        defaultTimezone: "America/Bogota",
      })
      .returning();
    tenant = created;
  }

  // 6. Seed Locations
  console.log("📍 Seeding Locations...");
  const locationDefs = [
    {
      tenantId: tenant.id,
      slug: "zona-g",
      name: "The Royal Barber - Zona G",
      address: "Calle 69 # 4-50, Bogotá",
      timezone: "America/Bogota",
      currency: "COP",
    },
    {
      tenantId: tenant.id,
      slug: "parque-93",
      name: "The Royal Barber - Parque 93",
      address: "Carrera 11A # 93-20, Bogotá",
      timezone: "America/Bogota",
      currency: "COP",
    },
  ];

  interface SeededLocation {
    id: string;
    tenantId: string;
    slug: string;
    name: string;
    address: string;
    timezone: string;
    currency: string;
  }
  const seededLocations: SeededLocation[] = [];
  for (const loc of locationDefs) {
    let [existing] = await db
      .select()
      .from(locations)
      .where(eq(locations.slug, loc.slug))
      .limit(1);

    if (!existing) {
      const [created] = await db.insert(locations).values(loc).returning();
      existing = created;
    }
    seededLocations.push(existing as any);
  }

  const primaryLocation = seededLocations[0];

  // 7. Seed Staff and Memberships
  console.log("👔 Seeding Staff and Memberships...");
  const staffToCreate = [
    { email: "owner@royalbarber.dev", name: "Carlos Mendoza (Owner)", role: "OWNER" },
    { email: "manager@royalbarber.dev", name: "Alejandro Ruiz (Manager)", role: "MANAGER" },
    { email: "barber1@royalbarber.dev", name: "David Torres (Master Barber)", role: "EMPLOYEE" },
    { email: "barber2@royalbarber.dev", name: "Pedro Luis (Barber)", role: "EMPLOYEE" },
  ];

  const staffMembershipMap = new Map<string, string>(); // email -> membershipId

  for (const s of staffToCreate) {
    const normalized = User.normalizeEmail(s.email);
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailNormalized, normalized))
      .limit(1);

    if (!user) {
      const [created] = await db
        .insert(users)
        .values({
          email: s.email,
          emailNormalized: normalized,
          name: s.name,
          passwordHash,
          isPlatformAdmin: false,
          status: "ACTIVE",
        })
        .returning();
      user = created;
    }

    // Check membership
    let [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);

    if (!membership) {
      const [created] = await db
        .insert(memberships)
        .values({
          tenantId: tenant.id,
          userId: user.id,
          status: "ACTIVE",
        })
        .returning();
      membership = created;
    }
    staffMembershipMap.set(s.email, membership.id);

    // Assign Role
    const roleId = roleMap.get(s.role)!;
    const existingMR = (await db.select().from(membershipRoles)).find(
      (mr) => mr.membershipId === membership.id && mr.roleId === roleId
    );
    if (!existingMR) {
      await db.insert(membershipRoles).values({
        membershipId: membership.id,
        roleId,
      });
    }
  }

  // 8. Seed Customer
  console.log("💇 Seeding Dev Customer...");
  const customerEmail = "customer@barberparadise.dev";
  const customerNormalized = User.normalizeEmail(customerEmail);
  let [customerUser] = await db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, customerNormalized))
    .limit(1);

  if (!customerUser) {
    const [created] = await db
      .insert(users)
      .values({
        email: customerEmail,
        emailNormalized: customerNormalized,
        name: "Juan Cliente (Customer)",
        passwordHash,
        isPlatformAdmin: false,
        status: "ACTIVE",
      })
      .returning();
    customerUser = created;
  }

  // 9. Seed Catalog Services
  console.log("✂️ Seeding Catalog Services...");
  const serviceDefs = [
    {
      tenantId: tenant.id,
      name: "Corte de Cabello Clásico",
      slug: "corte-clasico",
      description: "Corte tradicional a tijera o máquina, lavado y peinado premium.",
      durationMinutes: 30,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      priceMinor: 35000,
      currency: "COP",
      status: "ACTIVE",
    },
    {
      tenantId: tenant.id,
      name: "Arreglo y Perfilado de Barba VIP",
      slug: "barba-vip",
      description: "Perfilado con navaja, toallas calientes y bálsamo hidratante.",
      durationMinutes: 25,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      priceMinor: 25000,
      currency: "COP",
      status: "ACTIVE",
    },
    {
      tenantId: tenant.id,
      name: "Combo Real (Corte + Barba)",
      slug: "combo-real",
      description: "Experiencia completa: Corte clásico y perfilado de barba.",
      durationMinutes: 55,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 10,
      priceMinor: 55000,
      currency: "COP",
      status: "ACTIVE",
    },
  ];

  interface SeededService {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    description: string;
    durationMinutes: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    priceMinor: number;
    currency: string;
    status: string;
  }
  const seededServiceList: SeededService[] = [];
  for (const sDef of serviceDefs) {
    let [existing] = await db
      .select()
      .from(services)
      .where(and(eq(services.tenantId, tenant.id), eq(services.slug, sDef.slug)))
      .limit(1);

    if (!existing) {
      const [created] = await db.insert(services).values(sDef).returning();
      existing = created;
    }
    seededServiceList.push(existing as any);

    // Link service to locations
    for (const loc of seededLocations) {
      await db
        .insert(locationServices)
        .values({
          locationId: loc.id,
          serviceId: existing.id,
          isActive: true,
        })
        .onConflictDoNothing();
    }
  }

  // 10. Seed Staff Profiles, Locations & Services
  console.log("💈 Seeding Staff Profiles & Assignments...");
  const barbers = [
    { email: "barber1@royalbarber.dev", displayName: "David Torres (Master Barber)", bio: "Experto en cortes clásicos y degradados." },
    { email: "barber2@royalbarber.dev", displayName: "Pedro Luis (Barber)", bio: "Especialista en barba y navaja tradicional." },
  ];

  const seededStaffProfiles: { id: string; email: string }[] = [];
  for (const b of barbers) {
    const mId = staffMembershipMap.get(b.email)!;
    let [existingProfile] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.membershipId, mId))
      .limit(1);

    if (!existingProfile) {
      const [created] = await db
        .insert(staffProfiles)
        .values({
          tenantId: tenant.id,
          membershipId: mId,
          displayName: b.displayName,
          bio: b.bio,
          status: "ACTIVE",
        })
        .returning();
      existingProfile = created;
    }
    seededStaffProfiles.push({ id: existingProfile.id, email: b.email });

    // Assign to locations
    for (const loc of seededLocations) {
      await db
        .insert(staffLocations)
        .values({
          staffId: existingProfile.id,
          locationId: loc.id,
          status: "ACTIVE",
        })
        .onConflictDoNothing();
    }

    // Assign services to staff
    for (const s of seededServiceList) {
      await db
        .insert(staffServices)
        .values({
          staffId: existingProfile.id,
          serviceId: s.id,
          isActive: true,
        })
        .onConflictDoNothing();
    }
  }

  // 11. Seed Location Business Hours
  console.log("⏰ Seeding Business Hours...");
  for (const loc of seededLocations) {
    for (let day = 0; day <= 6; day++) {
      const isSunday = day === 0;
      await db
        .insert(locationBusinessHours)
        .values({
          locationId: loc.id,
          dayOfWeek: day,
          openLocalTime: isSunday ? "10:00" : "08:00",
          closeLocalTime: isSunday ? "16:00" : "20:00",
          isClosed: false,
        })
        .onConflictDoUpdate({
          target: [locationBusinessHours.locationId, locationBusinessHours.dayOfWeek],
          set: {
            openLocalTime: isSunday ? "10:00" : "08:00",
            closeLocalTime: isSunday ? "16:00" : "20:00",
            isClosed: false,
          },
        });
    }
  }

  // 12. Seed Staff Availability Rules
  console.log("📅 Seeding Staff Availability Rules...");
  for (const staff of seededStaffProfiles) {
    for (const loc of seededLocations) {
      for (let day = 1; day <= 6; day++) {
        const isB1 = staff.email.includes("barber1");
        await db
          .insert(availabilityRules)
          .values({
            tenantId: tenant.id,
            staffId: staff.id,
            locationId: loc.id,
            dayOfWeek: day,
            startLocalTime: isB1 ? "08:00" : "10:00",
            endLocalTime: isB1 ? "18:00" : "20:00",
            isActive: true,
          })
          .onConflictDoNothing();
      }
    }
  }

  // 13. Seed Sample Initial Appointment
  console.log("📆 Seeding Sample Appointment...");
  const sampleBarber = seededStaffProfiles[0];
  const sampleService = seededServiceList[0];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0); // 10:00 AM
  const tomorrowEnd = new Date(tomorrow.getTime() + 40 * 60 * 1000); // 10:40 AM

  const existingSample = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.staffId, sampleBarber.id),
        eq(appointments.startsAt, tomorrow)
      )
    )
    .limit(1);

  if (!existingSample[0]) {
    const [newAppt] = await db
      .insert(appointments)
      .values({
        tenantId: tenant.id,
        locationId: primaryLocation.id,
        customerUserId: customerUser.id,
        customerNameSnapshot: customerUser.name,
        customerEmailSnapshot: customerUser.email,
        staffId: sampleBarber.id,
        status: "CONFIRMED",
        startsAt: tomorrow,
        endsAt: tomorrowEnd,
        timezone: "America/Bogota",
        source: "ONLINE",
        notes: "Cliente prefiere corte con tijera arriba.",
      })
      .returning();

    await db.insert(appointmentServices).values({
      appointmentId: newAppt.id,
      serviceId: sampleService.id,
      serviceNameSnapshot: sampleService.name,
      durationMinutes: sampleService.durationMinutes + sampleService.bufferBeforeMinutes + sampleService.bufferAfterMinutes,
      priceMinor: sampleService.priceMinor,
      currency: "COP",
      position: 1,
    });

    await db.insert(appointmentStatusHistory).values({
      appointmentId: newAppt.id,
      fromStatus: "NONE",
      toStatus: "CONFIRMED",
      reason: "Initial seed",
    });
  }

  // 14. Seed Subscription Plans
  console.log("💳 Seeding Subscription Plans...");
  const plansToSeed = [
    {
      code: "SOLO_STARTER",
      name: "Solo Starter",
      audience: "SOLO_PROFESSIONAL",
      description: "Plan inicial para barberos independientes que arrancan su negocio personal.",
      billingPeriod: "MONTHLY",
      priceMinor: 4900000,
      currency: "COP",
      trialDays: 14,
      status: "ACTIVE",
    },
    {
      code: "SOLO_PRO",
      name: "Solo Pro",
      audience: "SOLO_PROFESSIONAL",
      description: "Plan profesional completo con clientes, afiliaciones multisede y métricas.",
      billingPeriod: "MONTHLY",
      priceMinor: 8900000,
      currency: "COP",
      trialDays: 14,
      status: "ACTIVE",
    },
    {
      code: "SOLO_ELITE",
      name: "Solo Elite",
      audience: "SOLO_PROFESSIONAL",
      description: "Plan para barberos estrella con marca personal, campañas y soporte prioritario.",
      billingPeriod: "MONTHLY",
      priceMinor: 14900000,
      currency: "COP",
      trialDays: 14,
      status: "ACTIVE",
    },
    {
      code: "BUSINESS_BASIC",
      name: "Business Basic",
      audience: "BUSINESS",
      description: "Plan para barberías tradicionales con hasta 3 barberos.",
      billingPeriod: "MONTHLY",
      priceMinor: 12900000,
      currency: "COP",
      trialDays: 14,
      status: "ACTIVE",
    },
    {
      code: "BUSINESS_SCALE",
      name: "Business Scale",
      audience: "BUSINESS",
      description: "Plan para barberías multisede y alto volumen con staff ilimitado.",
      billingPeriod: "MONTHLY",
      priceMinor: 24900000,
      currency: "COP",
      trialDays: 14,
      status: "ACTIVE",
    },
  ];

  const planMap = new Map<string, string>();
  for (const p of plansToSeed) {
    const [inserted] = await db
      .insert(subscriptionPlans)
      .values(p)
      .onConflictDoUpdate({
        target: subscriptionPlans.code,
        set: {
          name: p.name,
          audience: p.audience,
          description: p.description,
          priceMinor: p.priceMinor,
          trialDays: p.trialDays,
          status: p.status,
          updatedAt: new Date(),
        },
      })
      .returning();
    planMap.set(p.code, inserted.id);
  }

  // 15. Seed Catalog Modules & Dependencies
  console.log("🧩 Seeding System Modules & Entitlements...");
  const moduleDefs = [
    { code: "core.dashboard", name: "Dashboard Principal", description: "Vista ejecutiva y métricas rápidas de la jornada", category: "CORE", status: "AVAILABLE", sortOrder: 1 },
    { code: "scheduling.calendar", name: "Calendario y Agenda", description: "Gestión interactiva de turnos y calendario semanal/diario", category: "SCHEDULING", status: "AVAILABLE", sortOrder: 2 },
    { code: "scheduling.appointments", name: "Gestión de Citas", description: "Creación, confirmación, reprogramación y cancelación de reservas", category: "SCHEDULING", status: "AVAILABLE", sortOrder: 3 },
    { code: "scheduling.availability", name: "Disponibilidad y Horarios", description: "Definición de turnos de trabajo, pausas y bloqueos", category: "SCHEDULING", status: "AVAILABLE", sortOrder: 4 },
    { code: "catalog.services", name: "Catálogo de Servicios", description: "Gestión de catálogo personal de servicios, precios y duraciones", category: "CORE", status: "AVAILABLE", sortOrder: 5 },
    { code: "customers.directory", name: "Directorio de Clientes", description: "Gestión y libreta de contactos de clientes propios", category: "CUSTOMERS", status: "AVAILABLE", sortOrder: 6 },
    { code: "customers.history", name: "Historial de Clientes", description: "Ficha técnica, cortes pasados y notas privadas del cliente", category: "CUSTOMERS", status: "AVAILABLE", sortOrder: 7 },
    { code: "profile.public", name: "Perfil Público y Enlace de Reserva", description: "Página web de reservas directas y perfil público profesional", category: "PROFILE", status: "AVAILABLE", sortOrder: 8 },
    { code: "affiliations.management", name: "Afiliaciones y Sedes Anfitrionas", description: "Gestión de contratos y sedes donde atiende el profesional", category: "OPERATIONS", status: "AVAILABLE", sortOrder: 9 },
    { code: "inventory.tracking", name: "Control de Insumos y Stock", description: "Registro y control de productos y herramientas de trabajo", category: "OPERATIONS", status: "AVAILABLE", sortOrder: 10 },
    { code: "analytics.overview", name: "Métricas y Rendimiento", description: "Reportes de ocupación, horas pico e ingresos proyectados", category: "ANALYTICS", status: "AVAILABLE", sortOrder: 11 },
    { code: "marketing.promotions", name: "Promociones y Fidelización", description: "Cupones de descuento y campañas de retorno de clientes", category: "CUSTOMERS", status: "AVAILABLE", sortOrder: 12 },
    { code: "notifications.reminders", name: "Recordatorios Automáticos", description: "Notificaciones para reducir inasistencias de clientes", category: "OPERATIONS", status: "AVAILABLE", sortOrder: 13 },
    { code: "finance.overview", name: "Finanzas y Liquidación", description: "Control de caja, liquidación de alquiler de silla y comisiones", category: "FINANCE", status: "COMING_SOON", sortOrder: 14 },
    { code: "finance.invoicing", name: "Facturación Electrónica", description: "Emisión de facturas y recibos autorizados", category: "FINANCE", status: "COMING_SOON", sortOrder: 15 },
    { code: "finance.commissions", name: "Cálculo de Comisiones", description: "Cálculo automático de porcentajes y comisiones sobre servicios", category: "FINANCE", status: "COMING_SOON", sortOrder: 16 },
    { code: "ai.assistant", name: "Asistente AI de Agenda", description: "Copiloto inteligente para agendamiento por WhatsApp y optimización", category: "AI", status: "COMING_SOON", sortOrder: 17 },
  ];

  const modMap = new Map<string, string>();
  for (const m of moduleDefs) {
    const [inserted] = await db
      .insert(modules)
      .values(m)
      .onConflictDoUpdate({
        target: modules.code,
        set: {
          name: m.name,
          description: m.description,
          category: m.category,
          status: m.status,
          sortOrder: m.sortOrder,
          updatedAt: new Date(),
        },
      })
      .returning();
    modMap.set(m.code, inserted.id);
  }

  // Dependencies: appointments -> calendar, customer history -> customer directory, etc.
  const dependencies = [
    { module: "scheduling.appointments", dependsOn: "scheduling.calendar" },
    { module: "customers.history", dependsOn: "customers.directory" },
    { module: "finance.invoicing", dependsOn: "finance.overview" },
    { module: "finance.commissions", dependsOn: "finance.overview" },
  ];

  for (const d of dependencies) {
    const modId = modMap.get(d.module);
    const reqId = modMap.get(d.dependsOn);
    if (modId && reqId) {
      await db
        .insert(moduleDependencies)
        .values({
          moduleId: modId,
          requiredModuleId: reqId,
        })
        .onConflictDoNothing();
    }
  }

  // 16. Seed Plan Modules (e.g. for SOLO_PRO)
  console.log("🔗 Binding modules to subscription plans...");
  const soloProPlanId = planMap.get("SOLO_PRO");
  if (soloProPlanId) {
    const soloProModules = [
      "core.dashboard",
      "scheduling.calendar",
      "scheduling.appointments",
      "scheduling.availability",
      "catalog.services",
      "customers.directory",
      "customers.history",
      "profile.public",
      "affiliations.management",
      "analytics.overview",
      "notifications.reminders",
      "finance.overview",
    ];

    for (const code of soloProModules) {
      const modId = modMap.get(code);
      if (modId) {
        await db
          .insert(planModules)
          .values({
            planId: soloProPlanId,
            moduleId: modId,
          })
          .onConflictDoNothing();
      }
    }
  }

  // 17. Seed Independent Professional (Carlos Independent Barber)
  console.log("💈 Seeding Independent Professional & Solo Workspace...");
  const independentEmail = "carlos.independent@royalbarber.dev";
  const independentNormalized = User.normalizeEmail(independentEmail);

  let [independentUser] = await db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, independentNormalized))
    .limit(1);

  if (!independentUser) {
    const [created] = await db
      .insert(users)
      .values({
        email: independentEmail,
        emailNormalized: independentNormalized,
        name: "Carlos Mendoza (Solo Barber)",
        passwordHash,
        status: "ACTIVE",
      })
      .returning();
    independentUser = created;
  }

  // Professional Profile
  let [carlosProfile] = await db
    .select()
    .from(professionalProfiles)
    .where(eq(professionalProfiles.userId, independentUser.id))
    .limit(1);

  if (!carlosProfile) {
    const [created] = await db
      .insert(professionalProfiles)
      .values({
        userId: independentUser.id,
        professionalSlug: "carlos-barber",
        displayName: "Carlos 'The Barber' Mendoza",
        bio: "Especialista en degradados, barboterapia y diseño de barba con más de 8 años de experiencia.",
        phonePublic: "+573009998877",
        instagram: "@carlosbarber_official",
        yearsExperience: 8,
        bookingEnabled: true,
        profileVisibility: "PUBLIC",
      })
      .returning();
    carlosProfile = created;
  }

  // Solo Workspace Tenant (type = SOLO_PROFESSIONAL)
  const soloTenantSlug = "carlos-barber-studio";
  let [soloTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, soloTenantSlug))
    .limit(1);

  if (!soloTenant) {
    const [created] = await db
      .insert(tenants)
      .values({
        slug: soloTenantSlug,
        name: "Carlos Barber Studio",
        tenantType: "SOLO_PROFESSIONAL",
        status: "ACTIVE",
        defaultCurrency: "COP",
        defaultTimezone: "America/Bogota",
      })
      .returning();
    soloTenant = created;
  }

  // Professional Workspace link
  await db
    .insert(professionalWorkspaces)
    .values({
      professionalProfileId: carlosProfile.id,
      tenantId: soloTenant.id,
      status: "ACTIVE",
    })
    .onConflictDoNothing();

  // Membership in Solo Workspace as OWNER
  const ownerRoleId = roleMap.get("OWNER")!;
  let [carlosSoloMembership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.tenantId, soloTenant.id),
        eq(memberships.userId, independentUser.id)
      )
    )
    .limit(1);

  if (!carlosSoloMembership) {
    const [created] = await db
      .insert(memberships)
      .values({
        tenantId: soloTenant.id,
        userId: independentUser.id,
        status: "ACTIVE",
      })
      .returning();
    carlosSoloMembership = created;

    await db
      .insert(membershipRoles)
      .values({
        membershipId: carlosSoloMembership.id,
        roleId: ownerRoleId,
      })
      .onConflictDoNothing();
  }

  // Operational Staff Profile in Solo Workspace
  let [carlosStaffInSolo] = await db
    .select()
    .from(staffProfiles)
    .where(eq(staffProfiles.membershipId, carlosSoloMembership.id))
    .limit(1);

  if (!carlosStaffInSolo) {
    const [created] = await db
      .insert(staffProfiles)
      .values({
        tenantId: soloTenant.id,
        membershipId: carlosSoloMembership.id,
        professionalProfileId: carlosProfile.id,
        displayName: carlosProfile.displayName,
        bio: carlosProfile.bio,
        status: "ACTIVE",
      })
      .returning();
    carlosStaffInSolo = created;
  }

  // Solo Tenant Subscription (SOLO_PRO)
  if (soloProPlanId) {
    const existingSub = await db
      .select()
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.tenantId, soloTenant.id))
      .limit(1);

    if (!existingSub[0]) {
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(tenantSubscriptions).values({
        tenantId: soloTenant.id,
        planId: soloProPlanId,
        status: "ACTIVE",
        startsAt: now,
        trialEndsAt: trialEnds,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }
  }

  // Seed Carlos's personal services in his Solo Tenant
  const soloServices = [
    {
      tenantId: soloTenant.id,
      slug: "corte-autor-carlos",
      name: "Corte de Autor Carlos Barber",
      description: "Corte signature adaptado a visagismo y estilo personalizado.",
      durationMinutes: 45,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      priceMinor: 4500000,
      currency: "COP",
      isActive: true,
    },
    {
      tenantId: soloTenant.id,
      slug: "ritual-barba-premium",
      name: "Ritual Barba & Toalla Caliente",
      description: "Afeitado clásico tradicional con toalla caliente y aceites esenciales.",
      durationMinutes: 35,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      priceMinor: 3500000,
      currency: "COP",
      isActive: true,
    },
    {
      tenantId: soloTenant.id,
      slug: "combo-master-corte-barba",
      name: "Combo Master: Corte + Barba",
      description: "Experiencia completa de corte de autor y ritual de barba.",
      durationMinutes: 60,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 10,
      priceMinor: 7500000,
      currency: "COP",
      isActive: true,
    },
  ];

  for (const s of soloServices) {
    let [createdServ] = await db
      .insert(services)
      .values(s)
      .onConflictDoUpdate({
        target: [services.tenantId, services.slug],
        set: {
          name: s.name,
          priceMinor: s.priceMinor,
          durationMinutes: s.durationMinutes,
        },
      })
      .returning();

    // Link service to Carlos's staff profile in solo tenant
    await db
      .insert(staffServices)
      .values({
        staffId: carlosStaffInSolo.id,
        serviceId: createdServ.id,
      })
      .onConflictDoNothing();
  }

  // 18. Seed Active Affiliation: Carlos -> The Royal Barber Shop (Zona G)
  console.log("🤝 Seeding Active Affiliation (Carlos -> The Royal Barber Shop)...");
  let [affiliation] = await db
    .select()
    .from(professionalAffiliations)
    .where(
      and(
        eq(professionalAffiliations.professionalWorkspaceTenantId, soloTenant.id),
        eq(professionalAffiliations.hostTenantId, tenant.id)
      )
    )
    .limit(1);

  if (!affiliation) {
    const [created] = await db
      .insert(professionalAffiliations)
      .values({
        professionalWorkspaceTenantId: soloTenant.id,
        professionalProfileId: carlosProfile.id,
        hostTenantId: tenant.id,
        relationshipType: "CHAIR_RENTAL",
        status: "ACTIVE",
        startsAt: new Date(),
        requestedByUserId: independentUser.id,
      })
      .returning();
    affiliation = created;

    // Affiliation location: Zona G
    await db
      .insert(professionalAffiliationLocations)
      .values({
        affiliationId: affiliation.id,
        locationId: primaryLocation.id,
        status: "ACTIVE",
      })
      .onConflictDoNothing();

    // Affiliation terms: Chair rental 1,500,000 COP monthly
    await db
      .insert(professionalAffiliationTerms)
      .values({
        affiliationId: affiliation.id,
        settlementModel: "CHAIR_RENTAL",
        fixedRentAmountMinor: 150000000,
        currency: "COP",
        settlementFrequency: "MONTHLY",
        effectiveFrom: new Date(),
      })
      .onConflictDoNothing();

    // Host Membership for Carlos
    let [carlosHostMembership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, tenant.id),
          eq(memberships.userId, independentUser.id)
        )
      )
      .limit(1);

    if (!carlosHostMembership) {
      const [createdHostMem] = await db
        .insert(memberships)
        .values({
          tenantId: tenant.id,
          userId: independentUser.id,
          status: "ACTIVE",
        })
        .returning();
      carlosHostMembership = createdHostMem;
    }

    // Create Operational Staff Profile for Carlos inside Host Tenant
    let [carlosHostStaff] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.membershipId, carlosHostMembership.id))
      .limit(1);

    if (!carlosHostStaff) {
      const [createdHostStaff] = await db
        .insert(staffProfiles)
        .values({
          tenantId: tenant.id,
          membershipId: carlosHostMembership.id,
          professionalProfileId: carlosProfile.id,
          displayName: "Carlos Mendoza (Independiente)",
          status: "ACTIVE",
        })
        .returning();
      carlosHostStaff = createdHostStaff;
    }

    // Assign host staff to Zona G
    await db
      .insert(staffLocations)
      .values({
        staffId: carlosHostStaff.id,
        locationId: primaryLocation.id,
        status: "ACTIVE",
      })
      .onConflictDoNothing();

    // Availability rules for Carlos at Host Sede Zona G
    for (let day = 1; day <= 6; day++) {
      await db
        .insert(availabilityRules)
        .values({
          tenantId: tenant.id,
          staffId: carlosHostStaff.id,
          locationId: primaryLocation.id,
          dayOfWeek: day,
          startLocalTime: "09:00",
          endLocalTime: "19:00",
          isActive: true,
        })
        .onConflictDoNothing();
    }

    // Customer Relationship for Carlos (Customer user belongs to Carlos's client book)
    await db
      .insert(customerRelationships)
      .values({
        tenantId: soloTenant.id,
        customerUserId: customerUser.id,
        status: "ACTIVE",
        notes: "Cliente recurrente de Carlos. Prefiere agendar en sede Zona G.",
      })
      .onConflictDoNothing();
  }

  // 19. Seed Second Business Host: Gentleman Club Barbería
  console.log("🏢 Seeding Second Business Host (Gentleman Club)...");
  const gentlemanSlug = "gentleman-club";
  let [gentlemanTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, gentlemanSlug))
    .limit(1);

  if (!gentlemanTenant) {
    const [created] = await db
      .insert(tenants)
      .values({
        slug: gentlemanSlug,
        name: "Gentleman Club Barbería",
        tenantType: "BUSINESS",
        status: "ACTIVE",
        defaultCurrency: "COP",
        defaultTimezone: "America/Bogota",
      })
      .returning();
    gentlemanTenant = created;
  }

  // Gentleman Club Owner
  const gentlemanOwnerEmail = "owner@gentlemanclub.dev";
  const gentlemanOwnerNormalized = User.normalizeEmail(gentlemanOwnerEmail);
  let [gentlemanOwner] = await db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, gentlemanOwnerNormalized))
    .limit(1);

  if (!gentlemanOwner) {
    const [created] = await db
      .insert(users)
      .values({
        email: gentlemanOwnerEmail,
        emailNormalized: gentlemanOwnerNormalized,
        name: "Mauricio Restrepo (Owner Gentleman Club)",
        passwordHash,
        status: "ACTIVE",
      })
      .returning();
    gentlemanOwner = created;
  }

  // Gentleman Club Owner Membership
  let [gentlemanMembership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.tenantId, gentlemanTenant.id),
        eq(memberships.userId, gentlemanOwner.id)
      )
    )
    .limit(1);

  if (!gentlemanMembership) {
    const [created] = await db
      .insert(memberships)
      .values({
        tenantId: gentlemanTenant.id,
        userId: gentlemanOwner.id,
        status: "ACTIVE",
      })
      .returning();
    gentlemanMembership = created;

    await db
      .insert(membershipRoles)
      .values({
        membershipId: gentlemanMembership.id,
        roleId: ownerRoleId,
      })
      .onConflictDoNothing();
  }

  // Gentleman Club Location: Chapinero
  let [gentlemanLoc] = await db
    .select()
    .from(locations)
    .where(eq(locations.slug, "chapinero"))
    .limit(1);

  if (!gentlemanLoc) {
    const [created] = await db
      .insert(locations)
      .values({
        tenantId: gentlemanTenant.id,
        slug: "chapinero",
        name: "Gentleman Club - Sede Chapinero",
        address: "Calle 67 # 9-20, Bogotá",
        timezone: "America/Bogota",
        currency: "COP",
      })
      .returning();
    gentlemanLoc = created;

    // Business Hours for Chapinero
    for (let day = 0; day <= 6; day++) {
      const isSunday = day === 0;
      await db
        .insert(locationBusinessHours)
        .values({
          locationId: gentlemanLoc.id,
          dayOfWeek: day,
          openLocalTime: isSunday ? "10:00" : "08:00",
          closeLocalTime: isSunday ? "16:00" : "20:00",
          isClosed: false,
        })
        .onConflictDoNothing();
    }
  }

  console.log("✅ Database seeding completed successfully!");
  console.log("==================================================");
  console.log("DEVELOPMENT ACCOUNTS SEEDED (Password: " + DEV_DEFAULT_PASSWORD + "):");
  console.log("1. Platform Admin : " + adminEmail);
  console.log("2. Tenant Owner   : owner@royalbarber.dev (The Royal Barber Shop)");
  console.log("3. Manager        : manager@royalbarber.dev");
  console.log("4. Employees      : barber1@royalbarber.dev, barber2@royalbarber.dev");
  console.log("5. Customer       : " + customerEmail);
  console.log("6. Solo Barber    : " + independentEmail + " (Carlos Barber Studio)");
  console.log("7. Host 2 Owner   : " + gentlemanOwnerEmail + " (Gentleman Club)");
  console.log("==================================================");
}

if (process.argv[1] && process.argv[1].includes("seed")) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ Seeding failed:", err);
      await pool.end();
      process.exit(1);
    });
}
