import { NextRequest, NextResponse } from "next/server";
import { DrizzleSchedulingRepository } from "@/modules/scheduling/infrastructure/drizzle-scheduling.repository";
import { DrizzleServiceRepository } from "@/modules/catalog/infrastructure/drizzle-service.repository";
import { DrizzleStaffRepository } from "@/modules/staff/infrastructure/drizzle-staff.repository";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { GetAvailableSlotsUseCase } from "@/modules/scheduling/application/get-available-slots.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tenantId = searchParams.get("tenantId");
    const locationId = searchParams.get("locationId");
    const serviceId = searchParams.get("serviceId");
    const staffId = searchParams.get("staffId") || undefined;
    const date = searchParams.get("date");
    const timezone = searchParams.get("timezone") || "America/Bogota";

    if (!tenantId || !locationId || !serviceId || !date) {
      return NextResponse.json(
        { error: "Missing required query parameters: tenantId, locationId, serviceId, date" },
        { status: 400 }
      );
    }

    // Verify server-side module entitlement for scheduling
    const moduleRepo = new DrizzleModuleRepository();
    const subRepo = new DrizzleSubscriptionRepository();
    const moduleResolver = new ModuleEntitlementResolver(moduleRepo, subRepo);
    await moduleResolver.assertTenantModuleEnabled(tenantId, "scheduling.calendar");

    const schedulingRepo = new DrizzleSchedulingRepository();
    const serviceRepo = new DrizzleServiceRepository();
    const staffRepo = new DrizzleStaffRepository();

    const useCase = new GetAvailableSlotsUseCase(schedulingRepo, serviceRepo, staffRepo);
    const slots = await useCase.execute({
      tenantId,
      locationId,
      serviceId,
      staffId,
      date,
      timezone,
    });

    return NextResponse.json({ data: slots });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
