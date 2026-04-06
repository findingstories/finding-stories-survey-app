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

const BRAND_COLORS = ["#1f9678", "#3ab495", "#6ccdb3", "#a3e2cd", "#d1f0e6"];

const TYPE_LABELS: Record<string, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  MULTIPLE_CHOICE: "Multiple choice",
  CHECKBOX: "Checkboxes",
  RATING: "Rating",
  LIKERT: "Likert",
  NPS: "NPS",
  MATRIX: "Matrix",
  RANKING: "Ranking",
  DATE: "Date",
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
  const answers = responses.flatMap((r) => r.answers).filter((a) => a.questionId === question.id);

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
      <h3 className="text-base font-medium text-stone-900 mb-4">{question.text}</h3>

      {(question.type === "MULTIPLE_CHOICE" || question.type === "CHECKBOX") && (
        <ChoiceChart question={question} answers={answers} />
      )}
      {(question.type === "RATING" || question.type === "LIKERT") && (
        <NumericChart question={question} answers={answers} />
      )}
      {(question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") && (
        <TextAnswerList answers={answers} />
      )}
      {question.type === "NPS" && (
        <NpsChart answers={answers} />
      )}
      {question.type === "MATRIX" && (
        <MatrixChart question={question} answers={answers} />
      )}
      {question.type === "RANKING" && (
        <RankingChart question={question} answers={answers} />
      )}
      {question.type === "DATE" && (
        <DateAnswerList answers={answers} />
      )}
    </div>
  );
}

// ── Choice chart ───────────────────────────────────────────────────────────

function ChoiceChart({ question, answers }: { question: Question; answers: Answer[] }) {
  const options = Array.isArray(question.options) ? (question.options as string[]) : [];
  const counts = options.map((opt) => ({
    name: opt,
    count: answers.filter(
      (a) => Array.isArray(a.selectedOptions) && (a.selectedOptions as string[]).includes(opt)
    ).length,
  }));
  const total = answers.length || 1;

  return (
    <div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={counts} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: "#78716c" }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#292524" }} />
            <Tooltip
              formatter={(v) => [`${Number(v)} (${Math.round((Number(v) / total) * 100)}%)`, "Responses"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7e5e4" }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {counts.map((_, i) => <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="text-left py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">Option</th>
              <th className="text-right py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">Count</th>
              <th className="text-right py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {counts.map(({ name, count }) => (
              <tr key={name}>
                <td className="py-2 text-stone-700">{name}</td>
                <td className="py-2 text-right text-stone-900 font-medium">{count}</td>
                <td className="py-2 text-right text-stone-400">{Math.round((count / total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Numeric (rating / likert) chart ────────────────────────────────────────

function NumericChart({ question, answers }: { question: Question; answers: Answer[] }) {
  const config = (question.config ?? {}) as {
    min?: number; max?: number; labels?: string[]; minLabel?: string; maxLabel?: string;
  };
  const numericAnswers = answers.filter((a) => a.numericValue != null).map((a) => a.numericValue as number);
  if (numericAnswers.length === 0) return <p className="text-sm text-stone-400">No answers yet.</p>;

  const avg = numericAnswers.reduce((a, b) => a + b, 0) / numericAnswers.length;

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
        Average: <span className="font-semibold text-stone-900">{avg.toFixed(1)}</span>
        {question.type === "RATING" && ` / ${config.max ?? 5}`}
      </p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ left: -8, right: 8, top: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#78716c" }} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
            <Tooltip
              formatter={(v) => [Number(v), "Responses"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7e5e4" }}
            />
            <Bar dataKey="count" fill="#1f9678" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Text answer list ───────────────────────────────────────────────────────

function TextAnswerList({ answers }: { answers: Answer[] }) {
  const texts = answers.filter((a) => a.textValue?.trim()).map((a) => a.textValue as string);
  if (texts.length === 0) return <p className="text-sm text-stone-400">No answers yet.</p>;
  return (
    <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
      {texts.map((t, i) => (
        <li key={i} className="text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-2">{t}</li>
      ))}
    </ul>
  );
}

// ── NPS chart ──────────────────────────────────────────────────────────────

function NpsChart({ answers }: { answers: Answer[] }) {
  const scores = answers.filter((a) => a.numericValue != null).map((a) => a.numericValue as number);
  if (scores.length === 0) return <p className="text-sm text-stone-400">No answers yet.</p>;

  const total = scores.length;
  const promoters = scores.filter((s) => s >= 9).length;
  const passives = scores.filter((s) => s >= 7 && s <= 8).length;
  const detractors = scores.filter((s) => s <= 6).length;

  const pctPromoters = Math.round((promoters / total) * 100);
  const pctPassives = Math.round((passives / total) * 100);
  const pctDetractors = Math.round((detractors / total) * 100);
  const npsScore = pctPromoters - pctDetractors;

  // Per-score distribution (0–10)
  const buckets = Array.from({ length: 11 }, (_, i) => ({
    name: String(i),
    count: scores.filter((s) => s === i).length,
    fill: i <= 6 ? "#ef4444" : i <= 8 ? "#f59e0b" : "#22c55e",
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* NPS score + segments */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[120px] bg-stone-50 rounded-xl p-4 text-center">
          <p className="text-xs text-stone-500 mb-1">NPS Score</p>
          <p className={`text-3xl font-bold ${npsScore >= 50 ? "text-green-600" : npsScore >= 0 ? "text-amber-600" : "text-red-600"}`}>
            {npsScore > 0 ? "+" : ""}{npsScore}
          </p>
          <p className="text-xs text-stone-400 mt-1">{total} response{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex-1 min-w-[100px] bg-green-50 rounded-xl p-4 text-center">
          <p className="text-xs text-green-700 font-medium mb-1">Promoters</p>
          <p className="text-2xl font-bold text-green-700">{pctPromoters}%</p>
          <p className="text-xs text-green-500 mt-1">Score 9–10 · {promoters}</p>
        </div>
        <div className="flex-1 min-w-[100px] bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-xs text-amber-700 font-medium mb-1">Passives</p>
          <p className="text-2xl font-bold text-amber-700">{pctPassives}%</p>
          <p className="text-xs text-amber-500 mt-1">Score 7–8 · {passives}</p>
        </div>
        <div className="flex-1 min-w-[100px] bg-red-50 rounded-xl p-4 text-center">
          <p className="text-xs text-red-700 font-medium mb-1">Detractors</p>
          <p className="text-2xl font-bold text-red-700">{pctDetractors}%</p>
          <p className="text-xs text-red-500 mt-1">Score 0–6 · {detractors}</p>
        </div>
      </div>

      {/* Score distribution */}
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Score distribution</p>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ left: -8, right: 8, top: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#78716c" }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
              <Tooltip
                formatter={(v) => [`${Number(v)} (${Math.round((Number(v) / total) * 100)}%)`, "Responses"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7e5e4" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {buckets.map((b, i) => <Cell key={i} fill={b.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">Score</th>
                <th className="text-right py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">Count</th>
                <th className="text-right py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {buckets.map(({ name, count }) => (
                <tr key={name}>
                  <td className="py-1.5 text-stone-700">{name}</td>
                  <td className="py-1.5 text-right text-stone-900 font-medium">{count}</td>
                  <td className="py-1.5 text-right text-stone-400">{Math.round((count / total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Matrix chart ───────────────────────────────────────────────────────────

function MatrixChart({ question, answers }: { question: Question; answers: Answer[] }) {
  const rows = (question.config as { rows?: string[] })?.rows ?? [];
  const columns = Array.isArray(question.options) ? (question.options as string[]) : [];
  const total = answers.length || 1;

  if (answers.length === 0) return <p className="text-sm text-stone-400">No answers yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="text-left py-2 pr-4 text-xs font-medium text-stone-500 uppercase tracking-wide">Row</th>
            {columns.map((col) => (
              <th key={col} className="text-center py-2 px-2 text-xs font-medium text-stone-500 uppercase tracking-wide whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
          {rows.map((row, ri) => {
            const rowAnswers = answers
              .map((a) => (Array.isArray(a.selectedOptions) ? (a.selectedOptions as string[])[ri] : null))
              .filter(Boolean) as string[];
            const rowTotal = rowAnswers.length || 1;

            return (
              <tr key={ri}>
                <td className="py-3 pr-4 text-stone-700 font-medium">{row}</td>
                {columns.map((col) => {
                  const count = rowAnswers.filter((v) => v === col).length;
                  const pct = Math.round((count / rowTotal) * 100);
                  return (
                    <td key={col} className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold text-stone-900">{pct}%</span>
                        <span className="text-xs text-stone-400">{count}</span>
                        {/* Visual bar */}
                        <div className="w-10 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-stone-400 mt-2">{answers.length} response{answers.length !== 1 ? "s" : ""} · percentages per row</p>
    </div>
  );
}

// ── Ranking chart ──────────────────────────────────────────────────────────

function RankingChart({ question, answers }: { question: Question; answers: Answer[] }) {
  const items = Array.isArray(question.options) ? (question.options as string[]) : [];
  if (answers.length === 0) return <p className="text-sm text-stone-400">No answers yet.</p>;

  // Calculate average rank position for each item (1-indexed)
  const avgRanks = items.map((item) => {
    const ranks = answers
      .map((a) => {
        if (!Array.isArray(a.selectedOptions)) return null;
        const idx = (a.selectedOptions as string[]).indexOf(item);
        return idx === -1 ? null : idx + 1; // 1-indexed rank
      })
      .filter((r): r is number => r !== null);

    const avg = ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : items.length;
    return { name: item, avgRank: avg, count: ranks.length };
  });

  // Sort by average rank ascending (lower = ranked higher)
  const sorted = [...avgRanks].sort((a, b) => a.avgRank - b.avgRank);
  const maxRank = items.length;

  return (
    <div>
      <p className="text-xs text-stone-500 mb-4">Average rank position — lower is ranked higher</p>
      <div className="flex flex-col gap-3">
        {sorted.map(({ name, avgRank, count }, i) => {
          const barPct = Math.round(((maxRank - avgRank) / (maxRank - 1 || 1)) * 100);
          return (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-500 text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-stone-800">{name}</span>
                </div>
                <span className="text-xs text-stone-400">avg {avgRank.toFixed(1)} · {count} resp.</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Date answer list ───────────────────────────────────────────────────────

function DateAnswerList({ answers }: { answers: Answer[] }) {
  const dates = answers.filter((a) => a.textValue?.trim()).map((a) => a.textValue as string);
  if (dates.length === 0) return <p className="text-sm text-stone-400">No answers yet.</p>;

  // Count frequency per date
  const counts: Record<string, number> = {};
  for (const d of dates) counts[d] = (counts[d] ?? 0) + 1;
  const sorted = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
      {sorted.map(([date, count]) => (
        <div key={date} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
          <span className="text-sm text-stone-700">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "long" })}
          </span>
          {count > 1 && (
            <span className="text-xs font-medium text-stone-500 bg-white border border-stone-200 rounded-full px-2 py-0.5">
              ×{count}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
