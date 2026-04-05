import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ResultsCharts } from "@/components/charts/results-charts";
import { ResponsesTable } from "@/components/admin/responses-table";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: {
        orderBy: { submittedAt: "desc" },
        include: {
          answers: true,
        },
      },
    },
  });

  if (!questionnaire) notFound();

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-stone-900">
            {questionnaire.title}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-stone-500 text-sm">
              {questionnaire.responses.length} response
              {questionnaire.responses.length !== 1 ? "s" : ""}
            </p>
            <Badge variant={questionnaire.isOpen ? "green" : "red"}>
              {questionnaire.isOpen ? "Open" : "Closed"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/questionnaires/${id}/edit`}>
            <span className="text-sm text-brand-600 hover:underline">
              Edit
            </span>
          </Link>
          {questionnaire.responses.length > 0 && (
            <a
              href={`/api/questionnaires/${id}/export`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </a>
          )}
        </div>
      </div>

      {questionnaire.responses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-stone-200">
          <p className="text-stone-500">No responses yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Charts summary */}
          <ResultsCharts
            questions={questionnaire.questions}
            responses={questionnaire.responses as Parameters<typeof ResultsCharts>[0]["responses"]}
          />

          {/* Responses list */}
          <div>
            <h2 className="text-lg font-semibold text-stone-900 mb-4">
              All responses
            </h2>
            <ResponsesTable
              questionnaireId={id}
              responses={questionnaire.responses.map((r) => ({
                id: r.id,
                submittedAt: r.submittedAt,
                preview: (() => {
                  const first = r.answers[0];
                  if (!first) return "—";
                  if (first.textValue) return first.textValue.slice(0, 60);
                  if (Array.isArray(first.selectedOptions)) {
                    return (first.selectedOptions as string[]).join(", ");
                  }
                  if (first.numericValue != null)
                    return String(first.numericValue);
                  return "—";
                })(),
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
