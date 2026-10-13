import { NextResponse } from "next/server";
import { AppError } from "@/shared/errors/app-error";
import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";

export function mediaApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  console.error(
    JSON.stringify({
      level: "ERROR",
      component: "media-api",
      message: "media_api_request_failed",
      error: sanitizeAndBoundError(error, 1000),
    })
  );

  return NextResponse.json(
    { error: "Internal Server Error", code: "INTERNAL_SERVER_ERROR" },
    { status: 500 }
  );
}
