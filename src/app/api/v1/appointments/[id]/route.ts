import { NextRequest, NextResponse } from "next/server";
import { DrizzleAppointmentRepository } from "@/modules/appointments/infrastructure/drizzle-appointment.repository";
import { AppError } from "@/shared/errors/app-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repo = new DrizzleAppointmentRepository();
    const appt = await repo.findById(id);

    if (!appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const services = await repo.findServicesByAppointmentId(id);
    return NextResponse.json({
      data: {
        appointment: appt,
        services,
      },
    });
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
