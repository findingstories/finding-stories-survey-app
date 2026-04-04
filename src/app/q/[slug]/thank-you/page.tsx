import { prisma } from "@/lib/prisma";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default async function ThankYouPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { slug },
    select: { title: true },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md text-center">
        <CheckCircle className="w-14 h-14 text-brand-500 mx-auto mb-6" />
        <h1 className="text-2xl font-semibold text-stone-900 mb-3">
          Thank you!
        </h1>
        <p className="text-stone-500 mb-6">
          Your response to{" "}
          <span className="font-medium text-stone-700">
            {questionnaire?.title ?? "the questionnaire"}
          </span>{" "}
          has been recorded.
        </p>
        <Link
          href={`/q/${slug}`}
          className="text-sm text-brand-600 hover:underline"
        >
          Submit another response
        </Link>
      </div>
    </div>
  );
}
