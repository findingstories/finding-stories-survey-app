import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PublicQuestionnaireForm } from "@/components/public/questionnaire-form";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { slug },
    select: { title: true, description: true },
  });

  const title = questionnaire?.title ?? "Survey";
  const description = questionnaire?.description ?? "Please take a moment to complete this survey.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function PublicQuestionnairePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { slug },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!questionnaire) notFound();

  if (!questionnaire.isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-stone-900 mb-3">
            {questionnaire.title}
          </h1>
          <p className="text-stone-500">
            This questionnaire is currently closed and not accepting responses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-stone-900 mb-3">
            {questionnaire.title}
          </h1>
          {questionnaire.description && (
            <p className="text-stone-600 text-base leading-relaxed">
              {questionnaire.description}
            </p>
          )}
        </div>

        <PublicQuestionnaireForm
          questionnaireId={questionnaire.id}
          slug={slug}
          questions={questionnaire.questions}
          initialError={error}
        />
      </div>
    </div>
  );
}
