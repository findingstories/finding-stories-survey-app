import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { title, description } = parsed.data;

  // Generate a unique slug
  let slug = slugify(title);
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.questionnaire.findUnique({
      where: { slug: candidate },
    });
    if (!existing) {
      slug = candidate;
      break;
    }
    suffix++;
  }

  const questionnaire = await prisma.questionnaire.create({
    data: {
      title,
      description,
      slug,
      createdById: session.user.id,
    },
  });

  return Response.json(questionnaire, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const questionnaires = await prisma.questionnaire.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });

  return Response.json(questionnaires);
}
