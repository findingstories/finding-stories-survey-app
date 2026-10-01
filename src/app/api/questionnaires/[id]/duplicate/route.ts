import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { skipRules } from "@/lib/skip-logic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const original = await prisma.questionnaire.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      coverImage: { select: { data: true, mimeType: true } },
    },
  });

  if (!original) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Generate a unique slug by appending -copy, -copy-2, etc.
  let slug = `${original.slug}-copy`;
  let suffix = 2;
  while (await prisma.questionnaire.findUnique({ where: { slug } })) {
    slug = `${original.slug}-copy-${suffix++}`;
  }

  // Pre-assign the copies' ids so skip logic can point at the copied questions
  const newIds = new Map(original.questions.map((q) => [q.id, randomUUID()]));
  const copyConfig = (q: (typeof original.questions)[number]) => {
    const rules = skipRules(q);
    if (Object.keys(rules).length === 0) return q.config ?? {};
    const skipLogic = Object.fromEntries(
      Object.entries(rules).map(([option, target]) => [option, newIds.get(target) ?? target])
    );
    return { ...(q.config as object), skipLogic };
  };

  const duplicate = await prisma.questionnaire.create({
    data: {
      title: `${original.title} (Copy)`,
      description: original.description,
      slug,
      isOpen: false,
      completionMessage: original.completionMessage,
      showFillAgain: original.showFillAgain,
      alertEmails: original.alertEmails ?? [],
      coverEnabled: original.coverEnabled,
      coverTitle: original.coverTitle,
      coverBody: original.coverBody,
      coverButtonLabel: original.coverButtonLabel,
      ...(original.coverImage && {
        coverImage: {
          create: { data: original.coverImage.data, mimeType: original.coverImage.mimeType },
        },
      }),
      createdById: session.user.id,
      questions: {
        create: original.questions.map((q) => ({
          id: newIds.get(q.id),
          type: q.type,
          text: q.text,
          instructions: q.instructions,
          required: q.required,
          order: q.order,
          options: q.options ?? [],
          config: copyConfig(q),
        })),
      },
    },
  });

  return Response.json({ id: duplicate.id }, { status: 201 });
}
