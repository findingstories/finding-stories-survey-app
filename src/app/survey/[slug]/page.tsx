import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PublicQuestionnaireForm } from "@/components/public/questionnaire-form";
import type { Metadata } from "next";
import Link from "next/link";
import { isEmptyRichText } from "@/lib/rich-text";
import { DEFAULT_COVER_BUTTON_LABEL } from "@/lib/cover";
import { randomisedOptionOrders } from "@/lib/shuffle";

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
  searchParams: Promise<{ error?: string; start?: string }>;
}) {
  const { slug } = await params;
  const { error, start } = await searchParams;

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { slug },
    include: {
      questions: { orderBy: { order: "asc" } },
      coverImage: { select: { updatedAt: true } },
    },
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

  // With a cover page, respondents land on it first; the button (and any
  // validation error redirect) takes them to the questions.
  if (questionnaire.coverEnabled && !start && !error) {
    const coverBody = questionnaire.coverBody;
    return (
      <div className="min-h-screen bg-stone-50 py-12 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-stone-200 px-6 py-10 sm:px-12">
          {questionnaire.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/questionnaires/${questionnaire.id}/cover-image?v=${questionnaire.coverImage.updatedAt.getTime()}`}
              alt=""
              className="mx-auto mb-8 max-h-40 max-w-full object-contain"
            />
          )}
          <h1 className="text-3xl font-semibold text-stone-900 mb-6 text-center">
            {questionnaire.coverTitle || questionnaire.title}
          </h1>
          {!isEmptyRichText(coverBody) && (
            <div
              className="rich-text text-stone-700 text-base leading-relaxed"
              // Sanitised when saved (see sanitizeRichText)
              dangerouslySetInnerHTML={{ __html: coverBody! }}
            />
          )}
          <div className="mt-10 flex justify-center">
            <Link
              href={`/survey/${slug}?start=1`}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-base font-medium text-white hover:bg-brand-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              {questionnaire.coverButtonLabel || DEFAULT_COVER_BUTTON_LABEL}
            </Link>
          </div>
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
          {/* The cover page already introduces the survey, so only the title is shown */}
          {questionnaire.description && !questionnaire.coverEnabled && (
            <p className="text-stone-600 text-base leading-relaxed">
              {questionnaire.description}
            </p>
          )}
        </div>

        <PublicQuestionnaireForm
          questionnaireId={questionnaire.id}
          slug={slug}
          questions={questionnaire.questions}
          optionOrders={randomisedOptionOrders(questionnaire.questions)}
          initialError={error}
        />
      </div>
    </div>
  );
}
