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
  Pencil,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Props {
  questionnaire: Questionnaire & { questions: Question[] };
  shareUrl: string;
}

export function QuestionnaireEditor({ questionnaire, shareUrl }: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(questionnaire.questions);
  const [isOpen, setIsOpen] = useState(questionnaire.isOpen);
  const [slug, setSlug] = useState(questionnaire.slug);
  const [editingSlug, setEditingSlug] = useState(false);

  // Title / description editing
  const [editingMeta, setEditingMeta] = useState(false);
  const [title, setTitle] = useState(questionnaire.title);
  const [description, setDescription] = useState(questionnaire.description ?? "");
  const [savingMeta, setSavingMeta] = useState(false);

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [completionMessage, setCompletionMessage] = useState(questionnaire.completionMessage ?? "");
  const [showFillAgain, setShowFillAgain] = useState(questionnaire.showFillAgain);
  const [alertEmailsRaw, setAlertEmailsRaw] = useState(
    Array.isArray(questionnaire.alertEmails)
      ? (questionnaire.alertEmails as string[]).join(", ")
      : ""
  );
  const [savingSettings, setSavingSettings] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const saveSlugTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
    const currentUrl = shareUrl.replace(questionnaire.slug, slug);
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

  async function handleSaveMeta() {
    if (!title.trim()) return;
    setSavingMeta(true);
    await fetch(`/api/questionnaires/${questionnaire.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
    });
    setSavingMeta(false);
    setEditingMeta(false);
    router.refresh();
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    const emails = alertEmailsRaw
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    await fetch(`/api/questionnaires/${questionnaire.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completionMessage: completionMessage.trim() || null,
        showFillAgain,
        alertEmails: emails,
      }),
    });
    setSavingSettings(false);
  }

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      const reordered = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({ ...q, order: i }));
      setQuestions(reordered);
      await fetch("/api/questions/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reordered.map((q) => ({ id: q.id, order: q.order })) }),
      });
    },
    [questions]
  );

  function handleQuestionAdded(q: Question) {
    setQuestions((prev) => [...prev, q]);
    setShowAddForm(false);
  }

  function handleQuestionUpdated(updated: Question) {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    setEditingId(null);
  }

  function handleQuestionDeleted(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/questionnaires/${questionnaire.id}/results`}>
            <Button variant="secondary" size="sm">
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">Results</span>
            </Button>
          </Link>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-brand-600" /> : <Link2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy link"}</span>
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
            {isOpen ? <><ToggleRight className="w-4 h-4" />Open</> : <><ToggleLeft className="w-4 h-4" />Closed</>}
          </button>
        </div>
      </div>

      {/* Title & description */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-4">
        {editingMeta ? (
          <div className="flex flex-col gap-3">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Questionnaire title"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Description (optional)</label>
              <textarea
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this questionnaire"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" loading={savingMeta} onClick={handleSaveMeta}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setTitle(questionnaire.title); setDescription(questionnaire.description ?? ""); setEditingMeta(false); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
              {description && <p className="text-stone-500 text-sm mt-1">{description}</p>}
            </div>
            <button
              onClick={() => setEditingMeta(true)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors flex-shrink-0"
              title="Edit title & description"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Slug row */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-stone-100">
          <span className="text-xs text-stone-400 font-mono truncate">
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
            <button onClick={() => setEditingSlug(true)} className="text-xs font-mono text-brand-600 hover:underline">
              {slug}
            </button>
          )}
          <Badge variant={isOpen ? "green" : "red"}>{isOpen ? "Open" : "Closed"}</Badge>
        </div>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-3 mb-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
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
        <p className="text-xs text-stone-400 text-center mb-4">
          Drag questions to reorder · Changes save automatically
        </p>
      )}

      {/* Survey settings */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Survey settings
          {settingsOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </button>

        {settingsOpen && (
          <div className="px-5 pb-5 flex flex-col gap-5 border-t border-stone-100">
            {/* Completion message */}
            <div className="flex flex-col gap-1.5 pt-4">
              <label className="text-sm font-medium text-stone-700">
                Completion message
              </label>
              <p className="text-xs text-stone-400">Shown on the thank-you page after submission.</p>
              <textarea
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={3}
                value={completionMessage}
                onChange={(e) => setCompletionMessage(e.target.value)}
                placeholder="Thank you for taking the time to fill this in. Your response has been recorded."
              />
            </div>

            {/* Fill again */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showFillAgain}
                onChange={(e) => setShowFillAgain(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p className="text-sm font-medium text-stone-700">Show "Submit another response" link</p>
                <p className="text-xs text-stone-400">Lets respondents submit multiple responses.</p>
              </div>
            </label>

            {/* Alert emails */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">
                Alert email addresses
              </label>
              <p className="text-xs text-stone-400">Receive an email each time someone submits. Separate multiple addresses with commas.</p>
              <textarea
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={2}
                value={alertEmailsRaw}
                onChange={(e) => setAlertEmailsRaw(e.target.value)}
                placeholder="alice@example.com, bob@example.com"
              />
            </div>

            <Button size="sm" loading={savingSettings} onClick={handleSaveSettings} className="self-start">
              Save settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
