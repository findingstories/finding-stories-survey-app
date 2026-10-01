"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { OTHER_OPTION } from "@/lib/answers";
import { Plus, X } from "lucide-react";

const QUESTION_TYPES = [
  { value: "SHORT_TEXT", label: "Short text" },
  { value: "LONG_TEXT", label: "Long text" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "RATING", label: "Rating scale" },
  { value: "LIKERT", label: "Likert scale" },
  { value: "NPS", label: "NPS" },
  { value: "MATRIX", label: "Matrix" },
  { value: "RANKING", label: "Ranking" },
  { value: "DATE", label: "Date" },
] as const;

// "Multiple choice" covers both stored types: MULTIPLE_CHOICE (single answer)
// and CHECKBOX (multiple answers)
type QuestionTypeName = (typeof QUESTION_TYPES)[number]["value"] | "CHECKBOX";

interface Props {
  questionnaireId: string;
  existingQuestion?: Question;
  onSaved: (q: Question) => void;
  onCancel: () => void;
}

interface QuestionConfig {
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  labels?: string[];
  style?: "buttons" | "stars";
  rows?: string[];
  randomise?: boolean;
  allowOther?: boolean;
  maxSelections?: number;
}

export function QuestionForm({
  questionnaireId,
  existingQuestion,
  onSaved,
  onCancel,
}: Props) {
  const [type, setType] = useState<QuestionTypeName>(
    (existingQuestion?.type as QuestionTypeName) ?? "SHORT_TEXT"
  );
  const [text, setText] = useState(existingQuestion?.text ?? "");
  const [instructions, setInstructions] = useState(existingQuestion?.instructions ?? "");
  const [required, setRequired] = useState(existingQuestion?.required ?? false);
  const [options, setOptions] = useState<string[]>(
    Array.isArray(existingQuestion?.options)
      ? (existingQuestion.options as string[])
      : ["Option 1", "Option 2"]
  );
  const existingConfig = (existingQuestion?.config as QuestionConfig) ?? {};
  const [config, setConfig] = useState<QuestionConfig>({
    min: 1,
    max: 5,
    minLabel: "",
    maxLabel: "",
    style: "buttons",
    labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    rows: ["Row 1", "Row 2"],
    ...existingConfig,
  });
  const [loading, setLoading] = useState(false);

  function addOption() {
    setOptions((prev) => [...prev, `Option ${prev.length + 1}`]);
  }
  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }

  function addRow() {
    setConfig((c) => ({ ...c, rows: [...(c.rows ?? []), `Row ${(c.rows ?? []).length + 1}`] }));
  }
  function removeRow(i: number) {
    setConfig((c) => ({ ...c, rows: (c.rows ?? []).filter((_, idx) => idx !== i) }));
  }
  function updateRow(i: number, val: string) {
    setConfig((c) => ({ ...c, rows: (c.rows ?? []).map((r, idx) => (idx === i ? val : r)) }));
  }

  const isChoice = type === "MULTIPLE_CHOICE" || type === "CHECKBOX";
  const otherClash =
    isChoice &&
    !!config.allowOther &&
    options.some((o) => o.trim().toLowerCase() === OTHER_OPTION.toLowerCase());

  const choiceCount =
    options.filter((o) => o.trim()).length + (isChoice && config.allowOther ? 1 : 0);
  const limitError =
    type === "CHECKBOX" && config.maxSelections !== undefined
      ? !Number.isInteger(config.maxSelections) || config.maxSelections < 1
        ? "Enter a whole number of 1 or more."
        : config.maxSelections > choiceCount
          ? `The limit can't be more than the number of options (${choiceCount}).`
          : ""
      : "";

  async function handleSave() {
    if (!text.trim() || otherClash || limitError) return;
    setLoading(true);

    const body: Record<string, unknown> = {
      type,
      text,
      instructions: instructions.trim() || null,
      required,
    };

    if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "RANKING") {
      body.options = options.filter((o) => o.trim());
      body.config = { randomise: config.randomise ?? false };
      if (isChoice && config.allowOther) {
        body.config = { ...(body.config as object), allowOther: true };
      }
      if (type === "CHECKBOX" && config.maxSelections !== undefined) {
        body.config = { ...(body.config as object), maxSelections: config.maxSelections };
      }
    }
    if (type === "MATRIX") {
      body.options = options.filter((o) => o.trim()); // columns
      body.config = { rows: (config.rows ?? []).filter((r) => r.trim()) };
    }
    if (type === "RATING") {
      body.config = {
        min: config.min,
        max: config.max,
        minLabel: config.minLabel,
        maxLabel: config.maxLabel,
        style: config.style ?? "buttons",
      };
    }
    if (type === "LIKERT") {
      body.config = { labels: config.labels };
    }

    let res: Response;
    if (existingQuestion) {
      res = await fetch(`/api/questions/${existingQuestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch(`/api/questionnaires/${questionnaireId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      onSaved(data);
    }
  }

  const needsOptions = type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "RANKING";

  return (
    <div className="bg-white rounded-xl border-2 border-brand-200 p-5 flex flex-col gap-4">
      {/* Type selector */}
      {!existingQuestion && (
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                type === value || (value === "MULTIPLE_CHOICE" && type === "CHECKBOX")
                  ? "bg-brand-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <Input
        label="Question text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. How satisfied are you with our service?"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-stone-700">Instructions (optional)</label>
        <textarea
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          rows={2}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Additional guidance for respondents"
        />
      </div>

      {/* NPS info */}
      {type === "NPS" && (
        <p className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
          Respondents choose a score from 0–10. Results will show the NPS score,
          promoters (9–10), passives (7–8), and detractors (0–6).
        </p>
      )}

      {/* Date info */}
      {type === "DATE" && (
        <p className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
          Respondents will see a date picker to select a specific date.
        </p>
      )}

      {/* Single or multiple answers — choice types only */}
      {isChoice && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-stone-700">Answers allowed</label>
          <div className="flex flex-wrap gap-2">
            {([
              ["MULTIPLE_CHOICE", "Single answer (radio buttons)"],
              ["CHECKBOX", "Multiple answers (checkboxes)"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  type === value
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Options for choice / ranking questions */}
      {needsOptions && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-stone-700">
            {type === "RANKING" ? "Items to rank" : "Options"}
          </p>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={type === "RANKING" ? `Item ${i + 1}` : `Option ${i + 1}`}
              />
              <button onClick={() => removeOption(i)} className="p-1.5 text-stone-400 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addOption}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium mt-1"
          >
            <Plus className="w-4 h-4" />
            {type === "RANKING" ? "Add item" : "Add option"}
          </button>
        </div>
      )}

      {/* Selection limit — multiple answers only */}
      {type === "CHECKBOX" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.maxSelections !== undefined}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    maxSelections: e.target.checked ? Math.min(2, Math.max(choiceCount, 1)) : undefined,
                  }))
                }
                className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-stone-700">Limit how many can be selected</span>
            </label>
            {config.maxSelections !== undefined && (
              <span className="flex items-center gap-2 text-sm text-stone-700">
                up to
                <input
                  type="number"
                  min={1}
                  max={choiceCount}
                  value={Number.isNaN(config.maxSelections) ? "" : config.maxSelections}
                  onChange={(e) => setConfig((c) => ({ ...c, maxSelections: e.target.valueAsNumber }))}
                  className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </span>
            )}
          </div>
          {limitError ? (
            <p className="text-xs text-red-600">{limitError}</p>
          ) : (
            config.maxSelections !== undefined && (
              <p className="text-xs text-stone-400">
                Respondents will see &ldquo;Select up to {config.maxSelections}&rdquo;.
                {config.allowOther && ` '${OTHER_OPTION}' counts towards the limit.`}
              </p>
            )
          )}
        </div>
      )}

      {/* "Other" option — choice types only */}
      {isChoice && (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={config.allowOther ?? false}
              onChange={(e) => setConfig((c) => ({ ...c, allowOther: e.target.checked }))}
              className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-stone-700">
              Add an &lsquo;{OTHER_OPTION}&rsquo; option with a free-text answer (always shown last)
            </span>
          </label>
          {otherClash && (
            <p className="text-xs text-red-600">
              Remove the &lsquo;{OTHER_OPTION}&rsquo; option from the list above — it&rsquo;s added
              automatically when this box is ticked.
            </p>
          )}
        </div>
      )}

      {/* Matrix config */}
      {type === "MATRIX" && (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-stone-700">Rows (sub-questions)</p>
            {(config.rows ?? []).map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  value={row}
                  onChange={(e) => updateRow(i, e.target.value)}
                  placeholder={`Row ${i + 1}`}
                />
                <button onClick={() => removeRow(i)} className="p-1.5 text-stone-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium mt-1"
            >
              <Plus className="w-4 h-4" />
              Add row
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-stone-700">Columns (answer options)</p>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Column ${i + 1}`}
                />
                <button onClick={() => removeOption(i)} className="p-1.5 text-stone-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addOption}
              className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium mt-1"
            >
              <Plus className="w-4 h-4" />
              Add column
            </button>
          </div>
        </>
      )}

      {/* Rating config */}
      {type === "RATING" && (
        <div className="flex flex-col gap-3">
          {/* Style toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Display style</label>
            <div className="flex gap-2">
              {(["buttons", "stars"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, style: s }))}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    config.style === s
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  )}
                >
                  {s === "buttons" ? "Rectangles" : "Stars"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Min value"
              type="number"
              value={config.min}
              onChange={(e) => setConfig((c) => ({ ...c, min: +e.target.value }))}
            />
            <Input
              label="Max value"
              type="number"
              value={config.max}
              onChange={(e) => setConfig((c) => ({ ...c, max: +e.target.value }))}
            />
            {config.style !== "stars" && (
              <>
                <Input
                  label="Min label (optional)"
                  value={config.minLabel}
                  onChange={(e) => setConfig((c) => ({ ...c, minLabel: e.target.value }))}
                  placeholder="e.g. Very poor"
                />
                <Input
                  label="Max label (optional)"
                  value={config.maxLabel}
                  onChange={(e) => setConfig((c) => ({ ...c, maxLabel: e.target.value }))}
                  placeholder="e.g. Excellent"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Likert config */}
      {type === "LIKERT" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-stone-700">Scale labels</p>
          {(config.labels ?? []).map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 text-xs text-stone-400">{i + 1}</span>
              <input
                className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                value={label}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    labels: (c.labels ?? []).map((l, j) => (j === i ? e.target.value : l)),
                  }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Randomise toggle — choice and ranking types only */}
      {(type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "RANKING") && (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={config.randomise ?? false}
            onChange={(e) => setConfig((c) => ({ ...c, randomise: e.target.checked }))}
            className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-stone-700">Randomise option order for each respondent</span>
        </label>
      )}

      {/* Required toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
          className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-stone-700">Required</span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button onClick={handleSave} loading={loading} disabled={otherClash || !!limitError} size="sm">
          {existingQuestion ? "Save changes" : "Add question"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
