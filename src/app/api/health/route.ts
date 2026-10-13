import { NextResponse } from "next/server";
import { checkInfrastructureHealth } from "@/infrastructure/health/infrastructure-health";

export async function GET() {
  const report = await checkInfrastructureHealth();
  const statusCode = report.overall === "unhealthy" ? 503 : 200;

  return NextResponse.json(report, { status: statusCode });
}
