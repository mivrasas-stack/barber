import { NextResponse } from "next/server";
import { AppError } from "@/shared/errors/app-error";

export function notificationApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  const message =
    error instanceof Error ? error.message : "Internal Server Error";
  return NextResponse.json(
    { error: message, code: "INTERNAL_SERVER_ERROR" },
    { status: 500 }
  );
}
