import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  items: z.array(z.object({ id: z.string(), order: z.number() })),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  await Promise.all(
    parsed.data.items.map(({ id, order }) =>
      prisma.question.update({ where: { id }, data: { order } })
    )
  );

  return Response.json({ ok: true });
}
