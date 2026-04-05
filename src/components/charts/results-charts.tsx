"use client";

import type { Question, Response, Answer } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type ResponseWithAnswers = Response & { answers: Answer[] };

interface Props {
  questions: Question[];
  responses: ResponseWithAnswers[];
}

const BRAND_COLORS = [
  "#1f9678",
  "#3ab495",
  "#6ccdb3",
  "#a3e2cd",
  "#d1f0e6",
];

const TYPE_LABELS: Record<string, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  MULTIPLE_CHOICE: "Multiple choice",
  CHECKBOX: "Checkboxes",
  RATING: "Rating",
  LIKERT: "Likert",
};

export function ResultsCharts({ questions, responses }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-stone-900">Summary</h2>
      {questions.map((q) => (
        <QuestionSummary key={q.id} question={q} responses={responses} />
      ))}
    </div>
  );
}

function QuestionSummary({
  question,
  responses,
}: {
  question: Question;
  responses: ResponseWithAnswers[];
}) {
  const answers = responses
    .flatMap((r) => r.answers)
    .filter((a) => a.questionId === question.id);

  const answeredCount = answers.filter((a) => {
    if (a.textValue) return true;
    if (a.numericValue != null) return true;
    if (Array.isArray(a.selectedOptions) && (a.selectedOptions as string[]).length > 0) return true;
    return false;
  }).length;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
          {TYPE_LABELS[question.type]}
        </span>
        <span className="text-xs text-stone-400">
          {answeredCount} / {responses.length} answered
        </span>
      </div>
      <h3 className="text-base font-medium text-stone-900 mb-4">
        {question.text}
      </h3>

      {(question.type === "MULTIPLE_CHOICE" || question.type === "CHECKBOX") && (
        <ChoiceChart question={question} answers={answers} />
      )}

      {(question.type === "RATING" || question.type === "LIKERT") && (
        <NumericChart question={question} answers={answers} />
      )}

      {(question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") && (
        <TextAnswerList answers={answers} />
      )}
    </div>
  );
}

function ChoiceChart({
  question,
  answers,
}: {
  question: Question;
  answers: Answer[];
}) {
  const options = Array.isArray(question.options)
    ? (question.options as string[])
    : [];

  const counts = options.map((opt) => ({
    name: opt,
    count: answers.filter((a) =>
      Array.isArray(a.selectedOptions) &&
      (a.selectedOptions as string[]).includes(opt)
    ).length,
  }));

  const total = answers.length || 1;

  return (
    <div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={counts}
            layout="vertical"
            margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
          >
            <XAxis type="number" tick={{ fontSize: 11, fill: "#78716c" }} />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 11, fill: "#292524" }}
            />
            <Tooltip
              formatter={(v) => [
                `${Number(v)} (${Math.round((Number(v) / total) * 100)}%)`,
                "Responses",
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e7e5e4",
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {counts.map((_, i) => (
                <Cell
                  key={i}
                  fill={BRAND_COLORS[i % BRAND_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="text-left py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">
                Option
              </th>
              <th className="text-right py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">
                Count
              </th>
              <th className="text-right py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">
                %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {counts.map(({ name, count }) => (
              <tr key={name}>
                <td className="py-2 text-stone-700">{name}</td>
                <td className="py-2 text-right text-stone-900 font-medium">
                  {count}
                </td>
                <td className="py-2 text-right text-stone-400">
                  {Math.round((count / total) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumericChart({
  question,
  answers,
}: {
  question: Question;
  answers: Answer[];
}) {
  const config = (question.config ?? {}) as {
    min?: number;
    max?: number;
    labels?: string[];
    minLabel?: string;
    maxLabel?: string;
  };

  const numericAnswers = answers
    .filter((a) => a.numericValue != null)
    .map((a) => a.numericValue as number);

  if (numericAnswers.length === 0) {
    return <p className="text-sm text-stone-400">No answers yet.</p>;
  }

  const avg =
    numericAnswers.reduce((a, b) => a + b, 0) / numericAnswers.length;

  let buckets: { name: string; count: number }[];

  if (question.type === "LIKERT" && config.labels) {
    buckets = config.labels.map((label, i) => ({
      name: label,
      count: numericAnswers.filter((v) => v === i + 1).length,
    }));
  } else {
    const min = config.min ?? 1;
    const max = config.max ?? 5;
    buckets = Array.from({ length: max - min + 1 }, (_, i) => ({
      name: String(i + min),
      count: numericAnswers.filter((v) => v === i + min).length,
    }));
  }

  return (
    <div>
      <p className="text-sm text-stone-500 mb-4">
        Average:{" "}
        <span className="font-semibold text-stone-900">{avg.toFixed(1)}</span>
        {question.type === "RATING" &&
          ` / ${config.max ?? 5}`}
      </p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={buckets}
            margin={{ left: -8, right: 8, top: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#78716c" }}
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
            <Tooltip
              formatter={(v) => [Number(v), "Responses"]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e7e5e4",
              }}
            />
            <Bar dataKey="count" fill="#1f9678" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TextAnswerList({ answers }: { answers: Answer[] }) {
  const texts = answers
    .filter((a) => a.textValue && a.textValue.trim())
    .map((a) => a.textValue as string);

  if (texts.length === 0) {
    return <p className="text-sm text-stone-400">No answers yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
      {texts.map((t, i) => (
        <li
          key={i}
          className="text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-2"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}
