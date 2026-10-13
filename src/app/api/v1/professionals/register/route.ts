import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ProvisionProfessionalUseCase } from "@/modules/professionals/application/provision-professional.usecase";
import { AppError } from "@/shared/errors/app-error";

const registrationSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(2).max(255).optional(),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(255),
  professionalSlug: z.string().trim().toLowerCase().min(3).max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid professional slug"),
  workspaceName: z.string().trim().min(2).max(255).optional(),
  planCode: z.string().trim().min(1).max(64).optional(),
  bio: z.string().max(2000).optional(),
  phonePublic: z.string().max(40).optional(),
  instagram: z.string().max(255).optional(),
  tiktok: z.string().max(255).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const body = registrationSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: "Invalid registration data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await new ProvisionProfessionalUseCase().execute(body.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Malformed JSON", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    // Never leak database errors, credentials, or internal stack details to clients.
    return NextResponse.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
