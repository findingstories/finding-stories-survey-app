import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Resend } from "resend";

const answerSchema = z.object({
  questionId: z.string(),
  textValue: z.string().optional(),
  selectedOptions: z.array(z.string()).optional(),
  numericValue: z.number().optional(),
});

const submitSchema = z.object({
  questionnaireId: z.string(),
  slug: z.string(),
  answers: z.array(answerSchema),
});

export async function POST(request: NextRequest) {
  let raw: unknown;

  try {
    const formData = await request.formData();
    const payloadStr = formData.get("payload");
    if (!payloadStr || typeof payloadStr !== "string") {
      return new Response("Invalid submission", { status: 400 });
    }
    raw = JSON.parse(payloadStr);
  } catch {
    return new Response("Invalid submission", { status: 400 });
  }

  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) {
    return new Response("Invalid submission", { status: 400 });
  }

  const { questionnaireId, slug, answers } = parsed.data;

  const errorUrl = (msg: string) => {
    const url = request.nextUrl.clone();
    url.pathname = `/survey/${slug}`;
    url.search = `?error=${encodeURIComponent(msg)}`;
    return NextResponse.redirect(url, { status: 303 });
  };

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: questionnaireId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!questionnaire) return errorUrl("Survey not found.");
  if (!questionnaire.isOpen) return errorUrl("This survey is no longer accepting responses.");

  const requiredIds = questionnaire.questions.filter((q) => q.required).map((q) => q.id);
  for (const qId of requiredIds) {
    const answer = answers.find((a) => a.questionId === qId);
    if (
      !answer ||
      (answer.textValue === undefined &&
        answer.numericValue === undefined &&
        (!answer.selectedOptions || answer.selectedOptions.length === 0))
    ) {
      return errorUrl("Please answer all required questions.");
    }
  }

  await prisma.response.create({
    data: {
      questionnaireId,
      answers: {
        create: answers.map((a) => ({
          questionId: a.questionId,
          textValue: a.textValue,
          selectedOptions: a.selectedOptions,
          numericValue: a.numericValue,
        })),
      },
    },
  });

  // Send alert emails if configured
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alertEmails = Array.isArray((questionnaire as any).alertEmails)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ((questionnaire as any).alertEmails as string[])
    : [];

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;

  if (alertEmails.length > 0 && resendKey && resendFrom) {
    try {
      const resend = new Resend(resendKey);
      const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
      const resultsUrl = `${baseUrl}/questionnaires/${questionnaire.id}/results`;

      const answerRows = answers.map((a) => {
        const question = questionnaire.questions.find((q) => q.id === a.questionId);
        const questionText = question?.text ?? a.questionId;
        const answerText =
          a.textValue ??
          (a.selectedOptions?.length ? a.selectedOptions.join(", ") : null) ??
          (a.numericValue != null ? String(a.numericValue) : "—");
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e7e5e4;color:#57534e;font-size:13px;vertical-align:top">${questionText}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e7e5e4;color:#1c1917;font-size:13px;vertical-align:top">${answerText}</td>
        </tr>`;
      });

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <p style="color:#1c1917;margin-bottom:16px">
            A new response was submitted to <strong>${questionnaire.title}</strong>.
          </p>
          <table style="border-collapse:collapse;width:100%;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#f5f5f4">
                <th style="text-align:left;padding:8px 12px;font-size:12px;color:#78716c;font-weight:600">Question</th>
                <th style="text-align:left;padding:8px 12px;font-size:12px;color:#78716c;font-weight:600">Answer</th>
              </tr>
            </thead>
            <tbody>${answerRows.join("")}</tbody>
          </table>
          <p style="margin-top:20px">
            <a href="${resultsUrl}" style="display:inline-block;background:#1f9678;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:13px;font-weight:600">
              View results →
            </a>
          </p>
        </div>
      `;

      await resend.emails.send({
        from: resendFrom,
        to: alertEmails,
        subject: `New response: ${questionnaire.title}`,
        html,
      });
    } catch (err) {
      console.error("Alert email failed:", err);
    }
  }

  const successUrl = request.nextUrl.clone();
  successUrl.pathname = `/survey/${slug}/thank-you`;
  successUrl.search = "";
  return NextResponse.redirect(successUrl, { status: 303 });
}
