import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const responses = await prisma.response.findMany({
    where: { questionnaireId: id },
    orderBy: { submittedAt: "desc" },
    include: {
      answers: {
        include: { question: { select: { text: true, type: true, order: true } } },
        orderBy: { question: { order: "asc" } },
      },
    },
  });

  return Response.json(responses);
}
