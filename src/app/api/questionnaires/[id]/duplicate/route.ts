import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    include: { questions: { orderBy: { order: "asc" } } },
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

  const duplicate = await prisma.questionnaire.create({
    data: {
      title: `${original.title} (Copy)`,
      description: original.description,
      slug,
      isOpen: false,
      completionMessage: original.completionMessage,
      showFillAgain: original.showFillAgain,
      alertEmails: original.alertEmails ?? [],
      createdById: session.user.id,
      questions: {
        create: original.questions.map((q) => ({
          type: q.type,
          text: q.text,
          instructions: q.instructions,
          required: q.required,
          order: q.order,
          options: q.options ?? [],
          config: q.config ?? {},
        })),
      },
    },
  });

  return Response.json({ id: duplicate.id }, { status: 201 });
}
