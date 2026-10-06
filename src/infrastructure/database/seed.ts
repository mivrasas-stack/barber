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

  console.log("✅ Database seeding completed successfully!");
  console.log("==================================================");
  console.log("DEVELOPMENT ACCOUNTS SEEDED (Password: " + DEV_DEFAULT_PASSWORD + "):");
  console.log("1. Platform Admin : " + adminEmail);
  console.log("2. Tenant Owner   : owner@royalbarber.dev");
  console.log("3. Manager        : manager@royalbarber.dev");
  console.log("4. Employees      : barber1@royalbarber.dev, barber2@royalbarber.dev");
  console.log("5. Customer       : " + customerEmail);
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
