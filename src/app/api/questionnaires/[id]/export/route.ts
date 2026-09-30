import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowsOther, OTHER_OPTION } from "@/lib/answers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: {
        orderBy: { submittedAt: "asc" },
        include: {
          answers: true,
        },
      },
    },
  });

  if (!questionnaire) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Questions with an "Other" option get an extra column for the typed text
  const headers = [
    "Response ID",
    "Submitted At",
    ...questionnaire.questions.flatMap((q) =>
      allowsOther(q) ? [q.text, `${q.text} (${OTHER_OPTION} - please specify)`] : [q.text]
    ),
  ];

  const rows = questionnaire.responses.map((r) => {
    const answerMap = new Map(
      r.answers.map((a) => [a.questionId, a])
    );
    return [
      r.id,
      r.submittedAt.toISOString(),
      ...questionnaire.questions.flatMap((q) => {
        const a = answerMap.get(q.id);
        if (allowsOther(q)) {
          const selected = Array.isArray(a?.selectedOptions)
            ? (a.selectedOptions as string[])
            : [];
          return [
            selected.join("; "),
            selected.includes(OTHER_OPTION) ? a?.textValue ?? "" : "",
          ];
        }
        if (!a) return "";
        if (a.textValue != null) return a.textValue;
        if (a.numericValue != null) return String(a.numericValue);
        if (Array.isArray(a.selectedOptions)) {
          return (a.selectedOptions as string[]).join("; ");
        }
        return "";
      }),
    ];
  });

  const escape = (v: string) =>
    `"${String(v).replace(/"/g, '""')}"`;

  const csv = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${questionnaire.slug}-responses.csv"`,
    },
  });
}
