import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleAppointmentRepository } from "@/modules/appointments/infrastructure/drizzle-appointment.repository";
import { MutateAppointmentStatusUseCase } from "@/modules/appointments/application/mutate-appointment-status.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await validateSessionWithDb(token) : null;

    const body = await request.json();
    const repo = new DrizzleAppointmentRepository();
    const useCase = new MutateAppointmentStatusUseCase(repo);

    const updated = await useCase.execute({
      tenantId: body.tenantId,
      appointmentId: id,
      targetStatus: body.status,
      expectedVersion: body.expectedVersion,
      actorUserId: session?.userId,
      reason: body.reason,
    });

    return NextResponse.json({ data: updated });
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
