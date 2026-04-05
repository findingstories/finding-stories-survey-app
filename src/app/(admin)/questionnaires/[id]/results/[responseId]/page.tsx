import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DeleteResponseButton } from "@/components/admin/delete-response-button";

const TYPE_LABELS: Record<string, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  MULTIPLE_CHOICE: "Multiple choice",
  CHECKBOX: "Checkboxes",
  RATING: "Rating",
  LIKERT: "Likert",
};

export default async function ResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string; responseId: string }>;
}) {
  const { id, responseId } = await params;

  const response = await prisma.response.findUnique({
    where: { id: responseId },
    include: {
      questionnaire: { select: { title: true } },
      answers: {
        include: { question: true },
        orderBy: { question: { order: "asc" } },
      },
    },
  });

  if (!response || response.questionnaireId !== id) notFound();

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href={`/questionnaires/${id}/results`}
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            All responses
          </Link>
          <h1 className="text-xl font-semibold text-stone-900">
            Response
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            {formatDate(response.submittedAt)}
          </p>
        </div>
        <DeleteResponseButton
          responseId={responseId}
          questionnaireId={id}
        />
      </div>

      <div className="flex flex-col gap-4">
        {response.answers.map((answer) => {
          let displayValue: string = "—";
          if (answer.textValue) {
            displayValue = answer.textValue;
          } else if (
            Array.isArray(answer.selectedOptions) &&
            answer.selectedOptions.length > 0
          ) {
            displayValue = (answer.selectedOptions as string[]).join(", ");
          } else if (answer.numericValue != null) {
            displayValue = String(answer.numericValue);
          }

          return (
            <div
              key={answer.id}
              className="bg-white rounded-xl border border-stone-200 p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  {TYPE_LABELS[answer.question.type]}
                </span>
              </div>
              <p className="text-sm font-medium text-stone-700 mb-2">
                {answer.question.text}
              </p>
              <p className="text-sm text-stone-900 whitespace-pre-wrap">
                {displayValue}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
