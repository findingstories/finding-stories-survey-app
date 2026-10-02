import { prisma } from "@/lib/prisma";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { isRichText } from "@/lib/rich-text-format";
import { isEmptyRichText } from "@/lib/rich-text";

export default async function ThankYouPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { slug },
    select: { title: true, completionMessage: true, showFillAgain: true },
  });

  const saved = questionnaire?.completionMessage?.trim();
  const richMessage = isRichText(saved) && !isEmptyRichText(saved) ? saved : null;
  const message =
    saved ||
    `Your response to ${questionnaire?.title ?? "the questionnaire"} has been recorded.`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className={`${richMessage ? "max-w-xl" : "max-w-md"} text-center`}>
        <CheckCircle className="w-14 h-14 text-brand-500 mx-auto mb-6" />
        <h1 className="text-2xl font-semibold text-stone-900 mb-3">
          Thank you!
        </h1>
        {richMessage ? (
          <div
            className="rich-text rich-text-centered text-stone-600 mb-6"
            // Sanitised when saved (see sanitizeRichText)
            dangerouslySetInnerHTML={{ __html: richMessage }}
          />
        ) : (
          <p className="text-stone-500 mb-6">{message}</p>
        )}
        {questionnaire?.showFillAgain && (
          <Link
            href={`/survey/${slug}`}
            className="text-sm text-brand-600 hover:underline"
          >
            Submit another response
          </Link>
        )}
      </div>
    </div>
  );
}
