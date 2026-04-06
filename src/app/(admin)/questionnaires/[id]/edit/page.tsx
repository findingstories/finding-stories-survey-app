import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { QuestionnaireEditor } from "@/components/admin/questionnaire-editor";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!questionnaire) notFound();

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  return (
    <QuestionnaireEditor
      questionnaire={questionnaire}
      shareUrl={`${baseUrl}/survey/${questionnaire.slug}`}
    />
  );
}
