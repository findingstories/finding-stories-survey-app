"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Question, Questionnaire } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuestionForm } from "./question-form";
import { SortableQuestion } from "./sortable-question";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  ArrowLeft,
  Plus,
  Link2,
  ToggleLeft,
  ToggleRight,
  Check,
  BarChart2,
} from "lucide-react";

interface Props {
  questionnaire: Questionnaire & { questions: Question[] };
  shareUrl: string;
}

export function QuestionnaireEditor({ questionnaire, shareUrl }: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(
    questionnaire.questions
  );
  const [isOpen, setIsOpen] = useState(questionnaire.isOpen);
  const [slug, setSlug] = useState(questionnaire.slug);
  const [editingSlug, setEditingSlug] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const saveSlugTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleToggle() {
    setToggling(true);
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    await fetch(`/api/questionnaires/${questionnaire.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: newOpen }),
    });
    setToggling(false);
  }

  async function handleCopy() {
    const currentUrl = shareUrl.replace(
      questionnaire.slug,
      slug
    );
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSlugChange(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
    setSlug(clean);
    if (saveSlugTimeout.current) clearTimeout(saveSlugTimeout.current);
    saveSlugTimeout.current = setTimeout(async () => {
      await fetch(`/api/questionnaires/${questionnaire.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: clean }),
      });
      router.refresh();
    }, 800);
  }

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      const reordered = arrayMove(questions, oldIndex, newIndex).map(
        (q, i) => ({ ...q, order: i })
      );
      setQuestions(reordered);

      await fetch("/api/questions/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: reordered.map((q) => ({ id: q.id, order: q.order })),
        }),
      });
    },
    [questions]
  );

  function handleQuestionAdded(q: Question) {
    setQuestions((prev) => [...prev, q]);
    setShowAddForm(false);
  }

  function handleQuestionUpdated(updated: Question) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q))
    );
    setEditingId(null);
  }

  function handleQuestionDeleted(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  const currentShareUrl = `${shareUrl.substring(0, shareUrl.lastIndexOf("/") + 1)}${slug}`;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/questionnaires/${questionnaire.id}/results`}>
            <Button variant="secondary" size="sm">
              <BarChart2 className="w-4 h-4" />
              Results
            </Button>
          </Link>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-brand-600" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
            style={{
              background: isOpen ? "rgb(240 249 246)" : "rgb(245 245 244)",
              color: isOpen ? "rgb(20 95 77)" : "rgb(87 83 78)",
            }}
          >
            {isOpen ? (
              <>
                <ToggleRight className="w-4 h-4" />
                Open
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4" />
                Closed
              </>
            )}
          </button>
        </div>
      </div>

      {/* Title & slug */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900 mb-3">
          {questionnaire.title}
        </h1>
        {questionnaire.description && (
          <p className="text-stone-500 mb-4">{questionnaire.description}</p>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 font-mono">
            {shareUrl.replace(questionnaire.slug, "")}
          </span>
          {editingSlug ? (
            <input
              className="text-xs font-mono border-b border-brand-400 outline-none text-stone-900 bg-transparent"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              onBlur={() => setEditingSlug(false)}
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingSlug(true)}
              className="text-xs font-mono text-brand-600 hover:underline"
            >
              {slug}
            </button>
          )}
          <Badge variant={isOpen ? "green" : "red"} className="ml-1">
            {isOpen ? "Open" : "Closed"}
          </Badge>
        </div>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-3 mb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={questions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            {questions.map((q) =>
              editingId === q.id ? (
                <QuestionForm
                  key={q.id}
                  questionnaireId={questionnaire.id}
                  existingQuestion={q}
                  onSaved={handleQuestionUpdated}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <SortableQuestion
                  key={q.id}
                  question={q}
                  onEdit={() => setEditingId(q.id)}
                  onDelete={handleQuestionDeleted}
                />
              )
            )}
          </SortableContext>
        </DndContext>

        {showAddForm ? (
          <QuestionForm
            questionnaireId={questionnaire.id}
            onSaved={handleQuestionAdded}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-stone-200 rounded-xl text-sm text-stone-400 hover:border-brand-300 hover:text-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add question
          </button>
        )}
      </div>

      {questions.length > 0 && (
        <p className="text-xs text-stone-400 text-center">
          Drag questions to reorder · Changes save automatically
        </p>
      )}
    </div>
  );
}
