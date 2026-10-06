import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleAppointmentRepository } from "@/modules/appointments/infrastructure/drizzle-appointment.repository";
import { DrizzleIdempotencyRepository } from "@/modules/appointments/infrastructure/drizzle-idempotency.repository";
import { DrizzleServiceRepository } from "@/modules/catalog/infrastructure/drizzle-service.repository";
import { DrizzleStaffRepository } from "@/modules/staff/infrastructure/drizzle-staff.repository";
import { CreateAppointmentUseCase } from "@/modules/appointments/application/create-appointment.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await validateSessionWithDb(token) : null;

    const body = await request.json();
    const idempotencyKey =
      request.headers.get("x-idempotency-key") ||
      request.headers.get("idempotency-key") ||
      undefined;

    const appointmentRepo = new DrizzleAppointmentRepository();
    const idempotencyRepo = new DrizzleIdempotencyRepository();
    const serviceRepo = new DrizzleServiceRepository();
    const staffRepo = new DrizzleStaffRepository();

    const useCase = new CreateAppointmentUseCase(
      appointmentRepo,
      idempotencyRepo,
      serviceRepo,
      staffRepo
    );

    const result = await useCase.execute({
      tenantId: body.tenantId,
      locationId: body.locationId,
      staffId: body.staffId,
      serviceIds: body.serviceIds,
      startsAt: body.startsAt,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      customerUserId: session?.userId,
      actorUserId: session?.userId,
      timezone: body.timezone,
      source: body.source,
      notes: body.notes,
      idempotencyKey,
    });

    const status = result.isIdempotentReplay ? 200 : 201;
    return NextResponse.json(
      {
        data: result.appointment,
        isIdempotentReplay: result.isIdempotentReplay ?? false,
      },
      { status }
    );
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

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await validateSessionWithDb(token) : null;

    const { searchParams } = request.nextUrl;
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const locationId = searchParams.get("locationId") || undefined;
    const staffId = searchParams.get("staffId") || undefined;
    const customerUserId = searchParams.get("customerUserId") || undefined;
    const statusParam = searchParams.get("status");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const appointmentRepo = new DrizzleAppointmentRepository();
    const list = await appointmentRepo.list({
      tenantId,
      locationId,
      staffId,
      customerUserId,
      status: statusParam ? (statusParam.split(",") as any) : undefined,
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
    });

    return NextResponse.json({ data: list });
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
