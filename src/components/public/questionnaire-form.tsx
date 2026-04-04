"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface Props {
  questionnaireId: string;
  slug: string;
  questions: Question[];
}

interface AnswerState {
  textValue?: string;
  selectedOptions?: string[];
  numericValue?: number;
}

export function PublicQuestionnaireForm({ questionnaireId, slug, questions }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setAnswer(qId: string, update: AnswerState) {
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], ...update } }));
    setErrors((prev) => ({ ...prev, [qId]: "" }));
  }

  function toggleOption(qId: string, option: string, multi: boolean) {
    const current = answers[qId]?.selectedOptions ?? [];
    const selected = multi
      ? current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      : [option];
    setAnswer(qId, { selectedOptions: selected });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate required
    const newErrors: Record<string, string> = {};
    for (const q of questions) {
      if (!q.required) continue;
      const a = answers[q.id];
      const hasValue =
        a?.textValue?.trim() ||
        (a?.selectedOptions && a.selectedOptions.length > 0) ||
        a?.numericValue != null;
      if (!hasValue) {
        newErrors[q.id] = "This question is required.";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    const payload = {
      questionnaireId,
      answers: questions
        .filter((q) => answers[q.id])
        .map((q) => ({
          questionId: q.id,
          ...answers[q.id],
        })),
    };

    const res = await fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (res.ok) {
      router.push(`/q/${slug}/thank-you`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {questions.map((q, i) => (
        <div key={q.id} className="bg-white rounded-xl border border-stone-200 p-6">
          <p className="text-base font-medium text-stone-900 mb-1">
            <span className="text-stone-400 font-normal text-sm mr-2">
              {i + 1}.
            </span>
            {q.text}
            {q.required && <span className="text-red-500 ml-1">*</span>}
          </p>

          {errors[q.id] && (
            <p className="text-xs text-red-600 mt-1 mb-3">{errors[q.id]}</p>
          )}

          <div className="mt-4">
            {q.type === "SHORT_TEXT" && (
              <input
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Your answer"
                value={answers[q.id]?.textValue ?? ""}
                onChange={(e) => setAnswer(q.id, { textValue: e.target.value })}
              />
            )}

            {q.type === "LONG_TEXT" && (
              <textarea
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Your answer"
                value={answers[q.id]?.textValue ?? ""}
                onChange={(e) => setAnswer(q.id, { textValue: e.target.value })}
              />
            )}

            {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") && (
              <div className="flex flex-col gap-2.5">
                {(Array.isArray(q.options) ? (q.options as string[]) : []).map(
                  (opt) => {
                    const selected =
                      answers[q.id]?.selectedOptions?.includes(opt) ?? false;
                    return (
                      <label
                        key={opt}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded-${
                            q.type === "CHECKBOX" ? "md" : "full"
                          } border-2 flex items-center justify-center transition-colors ${
                            selected
                              ? "border-brand-600 bg-brand-600"
                              : "border-stone-300 group-hover:border-brand-400"
                          }`}
                          onClick={() =>
                            toggleOption(
                              q.id,
                              opt,
                              q.type === "CHECKBOX"
                            )
                          }
                        >
                          {selected && (
                            <svg
                              className="w-3 h-3 text-white"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              {q.type === "CHECKBOX" ? (
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              ) : (
                                <circle cx="6" cy="6" r="3" fill="white" />
                              )}
                            </svg>
                          )}
                        </span>
                        <span
                          className="text-sm text-stone-700"
                          onClick={() =>
                            toggleOption(
                              q.id,
                              opt,
                              q.type === "CHECKBOX"
                            )
                          }
                        >
                          {opt}
                        </span>
                      </label>
                    );
                  }
                )}
              </div>
            )}

            {q.type === "RATING" && (
              <RatingInput
                config={q.config as { min?: number; max?: number; minLabel?: string; maxLabel?: string } ?? {}}
                value={answers[q.id]?.numericValue}
                onChange={(v) => setAnswer(q.id, { numericValue: v })}
              />
            )}

            {q.type === "LIKERT" && (
              <LikertInput
                labels={(q.config as { labels?: string[] })?.labels ?? []}
                value={answers[q.id]?.numericValue}
                onChange={(v) => setAnswer(q.id, { numericValue: v })}
              />
            )}
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={submitting} size="lg">
          Submit
        </Button>
      </div>
    </form>
  );
}

function RatingInput({
  config,
  value,
  onChange,
}: {
  config: { min?: number; max?: number; minLabel?: string; maxLabel?: string };
  value?: number;
  onChange: (v: number) => void;
}) {
  const min = config.min ?? 1;
  const max = config.max ?? 5;
  const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              value === n
                ? "bg-brand-600 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(config.minLabel || config.maxLabel) && (
        <div className="flex justify-between mt-2 text-xs text-stone-400">
          <span>{config.minLabel}</span>
          <span>{config.maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function LikertInput({
  labels,
  value,
  onChange,
}: {
  labels: string[];
  value?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
      {labels.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className={`flex-1 px-3 py-2.5 rounded-lg text-sm text-center transition-colors border ${
            value === i + 1
              ? "border-brand-600 bg-brand-50 text-brand-700 font-medium"
              : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
