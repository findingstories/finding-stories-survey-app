import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  type: z.string().optional(),
  text: z.string().min(1).max(500).optional(),
  instructions: z.string().max(1000).nullable().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  // A question's type is fixed, except that single-answer (MULTIPLE_CHOICE)
  // and multiple-answer (CHECKBOX) multiple choice can be switched
  const { type, ...fields } = parsed.data;
  let newType: "MULTIPLE_CHOICE" | "CHECKBOX" | undefined;
  if (type !== undefined) {
    const existing = await prisma.question.findUnique({ where: { id }, select: { type: true } });
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const choiceTypes = ["MULTIPLE_CHOICE", "CHECKBOX"] as const;
    const isChoice = (t: string): t is (typeof choiceTypes)[number] =>
      (choiceTypes as readonly string[]).includes(t);
    if (type !== existing.type) {
      if (!isChoice(type) || !isChoice(existing.type)) {
        return Response.json({ error: "Question type can't be changed" }, { status: 400 });
      }
      newType = type;
    }
  }

  try {
    const { config, options, ...rest } = fields;
    const question = await prisma.question.update({
      where: { id },
      data: {
        ...rest,
        ...(newType && { type: newType }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(options !== undefined && { options: options as any }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(config !== undefined && { config: config as any }),
      },
    });
    return Response.json(question);
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await prisma.question.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
