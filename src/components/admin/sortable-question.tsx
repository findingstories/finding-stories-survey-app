"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { GripVertical, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";

const TYPE_LABELS: Record<string, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  MULTIPLE_CHOICE: "Multiple choice",
  CHECKBOX: "Checkboxes",
  RATING: "Rating",
  LIKERT: "Likert",
};

interface Props {
  question: Question;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

export function SortableQuestion({ question, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/questions/${question.id}`, { method: "DELETE" });
    setDeleting(false);
    setConfirmDelete(false);
    onDelete(question.id);
  }

  const options = Array.isArray(question.options)
    ? (question.options as string[])
    : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-stone-200 p-4 flex items-start gap-3"
    >
      <button
        className="mt-1 cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
            {TYPE_LABELS[question.type]}
          </span>
          {question.required && (
            <span className="text-xs text-stone-400">Required</span>
          )}
        </div>
        <p className="text-sm text-stone-900 font-medium">{question.text}</p>
        {options.length > 0 && (
          <p className="text-xs text-stone-400 mt-1">
            {options.slice(0, 4).join(" · ")}
            {options.length > 4 && ` + ${options.length - 4} more`}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete question?"
      >
        <p className="text-sm text-stone-600 mb-6">
          This will remove the question and all collected answers for it.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
