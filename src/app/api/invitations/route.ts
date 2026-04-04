import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;
  if (!session?.user?.id || userRole !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json(
      { error: "A user with this email already exists." },
      { status: 409 }
    );
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

  await prisma.invitation.create({
    data: { email, token, invitedById: session.user.id, expiresAt },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_placeholder") {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Survey <noreply@yourdomain.com>",
      to: email,
      subject: `You've been invited to Survey`,
      html: `
        <p>Hi,</p>
        <p>${session.user.name} has invited you to join Survey.</p>
        <p><a href="${inviteUrl}">Accept invitation</a></p>
        <p>This link expires in 48 hours.</p>
      `,
    });
  }

  return Response.json({ ok: true, inviteUrl });
}
