import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { Resend } from "resend";
import { z } from "zod";

const requestSchema = z.object({ email: z.string().email() });

// POST /api/password-reset — request a reset link
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid leaking whether an email is registered
  if (!user) {
    return Response.json({ ok: true });
  }

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_placeholder") {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "Survey <noreply@yourdomain.com>",
      to: email,
      subject: "Reset your password",
      html: `
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your Survey password. Click the link below to choose a new one:</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>This link expires in 2 hours. If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }

  return Response.json({ ok: true });
}
