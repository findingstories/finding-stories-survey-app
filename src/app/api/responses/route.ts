import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Resend } from "resend";
import { dropStrayOtherText, exceedsSelectionLimit, formatAnswer } from "@/lib/answers";
import { hiddenItemIds } from "@/lib/skip-logic";

const answerSchema = z.object({
  questionId: z.string(),
  textValue: z.string().optional(),
  selectedOptions: z.array(z.string()).optional(),
  numericValue: z.number().optional(),
});

const submitSchema = z.object({
  questionnaireId: z.string(),
  answers: z.array(answerSchema),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: parsed.data.questionnaireId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!questionnaire) {
    return Response.json({ error: "Questionnaire not found" }, { status: 404 });
  }
  if (!questionnaire.isOpen) {
    return Response.json({ error: "Questionnaire is closed" }, { status: 403 });
  }

  // Questions hidden by skip logic are neither required nor saved
  const submitted = dropStrayOtherText(parsed.data.answers, questionnaire.questions);
  const hidden = hiddenItemIds(
    questionnaire.questions,
    Object.fromEntries(submitted.map((a) => [a.questionId, a]))
  );
  const answers = submitted.filter((a) => !hidden.has(a.questionId));
  if (exceedsSelectionLimit(answers, questionnaire.questions)) {
    return Response.json({ error: "Too many options selected" }, { status: 400 });
  }

  // Validate required questions are answered
  const requiredIds = questionnaire.questions
    .filter((q) => q.required && !hidden.has(q.id))
    .map((q) => q.id);

  for (const qId of requiredIds) {
    const answer = answers.find((a) => a.questionId === qId);
    if (
      !answer ||
      (answer.textValue === undefined &&
        answer.numericValue === undefined &&
        (!answer.selectedOptions || answer.selectedOptions.length === 0))
    ) {
      return Response.json(
        { error: `Required question ${qId} not answered` },
        { status: 400 }
      );
    }
  }

  const response = await prisma.response.create({
    data: {
      questionnaireId: parsed.data.questionnaireId,
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
  const alertEmails = Array.isArray(questionnaire.alertEmails)
    ? (questionnaire.alertEmails as string[])
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
          formatAnswer(question ?? { type: "" }, {
            textValue: a.textValue ?? null,
            selectedOptions: a.selectedOptions ?? null,
            numericValue: a.numericValue ?? null,
          }) ?? "—";
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
      // Log but don't fail the submission if email sending errors
      console.error("Alert email failed:", err);
    }
  }

  return Response.json({ id: response.id }, { status: 201 });
}
