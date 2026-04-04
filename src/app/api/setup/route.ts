import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

// Only available if no users exist yet (first-run setup)
export async function POST(request: NextRequest) {
  const count = await prisma.user.count();
  if (count > 0) {
    return Response.json(
      { error: "Setup already complete." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "ADMIN",
    },
  });

  return Response.json({ id: user.id, email: user.email }, { status: 201 });
}
