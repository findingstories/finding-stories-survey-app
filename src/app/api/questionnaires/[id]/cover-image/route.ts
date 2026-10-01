import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 2 * 1024 * 1024;
// SVG is excluded because it can contain scripts
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

// Public: served on the survey cover page
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const image = await prisma.coverImage.findUnique({ where: { questionnaireId: id } });
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      // URLs carry a version (?v=) so a replaced image is fetched fresh
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "Please upload a PNG, JPG, GIF or WebP image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image must be 2 MB or smaller." }, { status: 400 });
  }

  const questionnaire = await prisma.questionnaire.findUnique({ where: { id }, select: { id: true } });
  if (!questionnaire) {
    return Response.json({ error: "Questionnaire not found" }, { status: 404 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  const image = await prisma.coverImage.upsert({
    where: { questionnaireId: id },
    create: { questionnaireId: id, data, mimeType: file.type },
    update: { data, mimeType: file.type },
    select: { updatedAt: true },
  });

  return Response.json({ version: image.updatedAt.getTime() });
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
  await prisma.coverImage.deleteMany({ where: { questionnaireId: id } });
  return Response.json({ ok: true });
}
