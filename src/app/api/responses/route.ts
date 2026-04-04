import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
    include: { questions: true },
  });

  if (!questionnaire) {
    return Response.json({ error: "Questionnaire not found" }, { status: 404 });
  }
  if (!questionnaire.isOpen) {
    return Response.json({ error: "Questionnaire is closed" }, { status: 403 });
  }

  // Validate required questions are answered
  const requiredIds = questionnaire.questions
    .filter((q) => q.required)
    .map((q) => q.id);

  for (const qId of requiredIds) {
    const answer = parsed.data.answers.find((a) => a.questionId === qId);
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
        create: parsed.data.answers.map((a) => ({
          questionId: a.questionId,
          textValue: a.textValue,
          selectedOptions: a.selectedOptions,
          numericValue: a.numericValue,
        })),
      },
    },
  });

  return Response.json({ id: response.id }, { status: 201 });
}
