import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const questionSchema = z.object({
  type: z.enum([
    "SHORT_TEXT",
    "LONG_TEXT",
    "MULTIPLE_CHOICE",
    "CHECKBOX",
    "RATING",
    "LIKERT",
    "NPS",
    "MATRIX",
    "RANKING",
    "DATE",
  ]),
  text: z.string().min(1).max(500),
  instructions: z.string().max(1000).nullable().optional(),
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: questionnaireId } = await params;
  const body = await request.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const count = await prisma.question.count({ where: { questionnaireId } });

  const { config, options, ...rest } = parsed.data;
  const question = await prisma.question.create({
    data: {
      questionnaireId,
      ...rest,
      order: count,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(options !== undefined && { options: options as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(config !== undefined && { config: config as any }),
    },
  });

  return Response.json(question, { status: 201 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: questionnaireId } = await params;
  const questions = await prisma.question.findMany({
    where: { questionnaireId },
    orderBy: { order: "asc" },
  });

  return Response.json(questions);
}
