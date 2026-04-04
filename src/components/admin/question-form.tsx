"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

const QUESTION_TYPES = [
  { value: "SHORT_TEXT", label: "Short text" },
  { value: "LONG_TEXT", label: "Long text" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "CHECKBOX", label: "Checkboxes" },
  { value: "RATING", label: "Rating scale" },
  { value: "LIKERT", label: "Likert scale" },
] as const;

type QuestionTypeName = (typeof QUESTION_TYPES)[number]["value"];

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
  const [required, setRequired] = useState(existingQuestion?.required ?? false);
  const [options, setOptions] = useState<string[]>(
    Array.isArray(existingQuestion?.options)
      ? (existingQuestion.options as string[])
      : ["Option 1", "Option 2"]
  );
  const [config, setConfig] = useState<QuestionConfig>({
    min: 1,
    max: 5,
    minLabel: "",
    maxLabel: "",
    labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    ...(existingQuestion?.config as QuestionConfig ?? {}),
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

  async function handleSave() {
    if (!text.trim()) return;
    setLoading(true);

    const body: Record<string, unknown> = { type, text, required };
    if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX") {
      body.options = options.filter((o) => o.trim());
    }
    if (type === "RATING") {
      body.config = { min: config.min, max: config.max, minLabel: config.minLabel, maxLabel: config.maxLabel };
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
                type === value
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

      {/* Options for choice questions */}
      {(type === "MULTIPLE_CHOICE" || type === "CHECKBOX") && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-stone-700">Options</p>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              <button
                onClick={() => removeOption(i)}
                className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addOption}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium mt-1"
          >
            <Plus className="w-4 h-4" />
            Add option
          </button>
        </div>
      )}

      {/* Rating config */}
      {type === "RATING" && (
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
                    labels: (c.labels ?? []).map((l, j) =>
                      j === i ? e.target.value : l
                    ),
                  }))
                }
              />
            </div>
          ))}
        </div>
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
        <Button onClick={handleSave} loading={loading} size="sm">
          {existingQuestion ? "Save changes" : "Add question"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
