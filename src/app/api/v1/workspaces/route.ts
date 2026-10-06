import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { ResolveWorkspacesUseCase } from "@/modules/tenancy/application/resolve-workspaces.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await validateSessionWithDb(token);
    if (!session) {
      return NextResponse.json({ error: "Session invalid or expired" }, { status: 401 });
    }

    const useCase = new ResolveWorkspacesUseCase();
    const workspaces = await useCase.execute(session.userId);

    const activeWorkspaceId = request.cookies.get("barber_active_workspace")?.value || workspaces[0]?.id || null;

    return NextResponse.json({
      workspaces,
      activeWorkspaceId,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
