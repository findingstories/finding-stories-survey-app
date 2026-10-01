"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  questionnaireId: string;
  existingSection?: Question;
  onSaved: (q: Question) => void;
  onCancel: () => void;
}

export function SectionForm({ questionnaireId, existingSection, onSaved, onCancel }: Props) {
  const [text, setText] = useState(existingSection?.text ?? "");
  const [instructions, setInstructions] = useState(existingSection?.instructions ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!text.trim()) return;
    setLoading(true);
    const body = { type: "SECTION", text: text.trim(), instructions: instructions.trim() || null };
    const res = existingSection
      ? await fetch(`/api/questions/${existingSection.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch(`/api/questionnaires/${questionnaireId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
    setLoading(false);
    if (res.ok) onSaved(await res.json());
  }

  return (
    <div className="bg-white rounded-xl border-2 border-brand-200 p-5 flex flex-col gap-4">
      <p className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
        A section starts a new page. The questions below it, up to the next section, appear on
        that page.
      </p>
      <Input
        label="Section heading"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. About your return to work"
        maxLength={500}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-stone-700">Supporting text (optional)</label>
        <textarea
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          rows={3}
          maxLength={1000}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="A short introduction shown under the heading"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <Button onClick={handleSave} loading={loading} disabled={!text.trim()} size="sm">
          {existingSection ? "Save section" : "Add section"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
