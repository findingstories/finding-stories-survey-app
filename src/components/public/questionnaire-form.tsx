"use client";

import { useState, useMemo, useRef, useLayoutEffect } from "react";
import type { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { allowsOther, displayOptions, maxSelections, OTHER_OPTION } from "@/lib/answers";
import { isSection, splitIntoPages, type Page } from "@/lib/sections";
import { hiddenItemIds } from "@/lib/skip-logic";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star } from "lucide-react";

interface Props {
  questionnaireId: string;
  slug: string;
  questions: Question[];
  // Shuffled option orders for randomised questions (from randomisedOptionOrders)
  optionOrders: Record<string, string[]>;
  initialError?: string;
}

interface AnswerState {
  textValue?: string;
  selectedOptions?: string[];
  numericValue?: number;
}

export function PublicQuestionnaireForm({ questionnaireId, slug, questions, optionOrders, initialError }: Props) {
  const payloadRef = useRef<HTMLInputElement>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Section breaks split the survey into pages; with none it's a single page
  const pages = useMemo(() => splitIntoPages(questions), [questions]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageWarning, setPageWarning] = useState("");
  const page = pages[pageIndex];
  const formRef = useRef<HTMLFormElement>(null);
  const pageTopRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // After moving to another section, jump to the very top of the page once the
  // new section is in the DOM (before it's painted), so respondents never land
  // part-way down. Focus moves to the top too, for keyboard/screen reader users.
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    pageTopRef.current?.focus({ preventScroll: true });
    // Repeat on the next frame in case the layout shifts again (e.g. the
    // mobile keyboard finishing closing after Next is tapped)
    const frame = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(frame);
  }, [pageIndex]);

  // Skip logic hides questions (and whole pages) based on the answers so far;
  // changing an answer back makes them reappear
  const hidden = useMemo(() => hiddenItemIds(questions, answers), [questions, answers]);
  const visibleQuestions = (p: Page<Question>) => p.questions.filter((q) => !hidden.has(q.id));
  const isPageVisible = (p: Page<Question>) =>
    p.questions.length > 0
      ? visibleQuestions(p).length > 0
      : !!p.section && !hidden.has(p.section.id);
  const visiblePageIndexes = pages
    .map((_, i) => i)
    .filter((i) => i === pageIndex || isPageVisible(pages[i]));
  const position = visiblePageIndexes.indexOf(pageIndex);
  const nextPageIndex = visiblePageIndexes[position + 1];
  const prevPageIndex = visiblePageIndexes[position - 1];
  const isLastPage = nextPageIndex === undefined;

  // Question numbers run across the whole survey, skipping section breaks
  const questionNumbers = useMemo(() => {
    const map: Record<string, number> = {};
    questions.filter((q) => !isSection(q)).forEach((q, i) => (map[q.id] = i + 1));
    return map;
  }, [questions]);

  function setAnswer(qId: string, update: AnswerState) {
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], ...update } }));
    setErrors((prev) => ({ ...prev, [qId]: "" }));
  }

  function toggleOption(qId: string, option: string, multi: boolean, max?: number) {
    const current = answers[qId]?.selectedOptions ?? [];
    if (multi && max !== undefined && !current.includes(option) && current.length >= max) return;
    const selected = multi
      ? current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      : [option];
    // Discard any "Other" text once "Other" is no longer selected
    setAnswer(qId, {
      selectedOptions: selected,
      ...(!selected.includes(OTHER_OPTION) && { textValue: undefined }),
    });
  }

  function setMatrixRow(qId: string, rowIndex: number, value: string) {
    const current = [...(answers[qId]?.selectedOptions ?? [])];
    current[rowIndex] = value;
    setAnswer(qId, { selectedOptions: current });
  }

  function validate(qs: Question[]): Record<string, string> {
    const newErrors: Record<string, string> = {};
    for (const q of qs) {
      if (isSection(q) || hidden.has(q.id)) continue;
      const selectedOther = answers[q.id]?.selectedOptions?.includes(OTHER_OPTION);
      if (allowsOther(q) && selectedOther && !answers[q.id]?.textValue?.trim()) {
        newErrors[q.id] = `Please fill in your '${OTHER_OPTION}' answer.`;
        continue;
      }
      const max = maxSelections(q);
      if (max !== undefined && (answers[q.id]?.selectedOptions?.length ?? 0) > max) {
        newErrors[q.id] = `Please select no more than ${max}.`;
        continue;
      }
      if (!q.required) continue;
      const a = answers[q.id];

      if (q.type === "MATRIX") {
        const rows = (q.config as { rows?: string[] })?.rows ?? [];
        const selections = a?.selectedOptions ?? [];
        const allAnswered = rows.every((_, i) => selections[i] && selections[i] !== "");
        if (!allAnswered) {
          newErrors[q.id] = "Please answer all rows.";
        }
      } else {
        const hasValue =
          a?.textValue?.trim() ||
          (a?.selectedOptions && a.selectedOptions.length > 0) ||
          a?.numericValue != null;
        if (!hasValue) {
          newErrors[q.id] = "This question is required.";
        }
      }
    }

    return newErrors;
  }

  function scrollToFirstError(newErrors: Record<string, string>) {
    const firstId = questions.find((q) => newErrors[q.id])?.id;
    if (firstId) document.getElementById(`question-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleNext() {
    const newErrors = validate(visibleQuestions(page));
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setPageWarning("Please answer the required questions on this page before continuing.");
      scrollToFirstError(newErrors);
      return;
    }
    setPageWarning("");
    setPageIndex(nextPageIndex);
  }

  function handleBack() {
    setPageWarning("");
    setPageIndex(prevPageIndex);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Pressing Enter in a text box on an earlier page moves on rather than submitting
    if (!isLastPage) {
      e.preventDefault();
      handleNext();
      return;
    }

    const newErrors = validate(questions);
    if (Object.keys(newErrors).length > 0) {
      e.preventDefault();
      setErrors(newErrors);
      // Shouldn't happen as each page is checked on Next, but jump back if so
      const errorPage = pages.findIndex((p) => p.questions.some((q) => newErrors[q.id]));
      if (errorPage !== pageIndex) {
        setPageIndex(errorPage);
      } else {
        scrollToFirstError(newErrors);
      }
      if (pages.length > 1) {
        setPageWarning("Please answer the required questions before submitting.");
      }
      return;
    }

    // Populate the hidden payload input and let the browser POST natively
    if (payloadRef.current) {
      payloadRef.current.value = JSON.stringify({
        questionnaireId,
        slug,
        // Answers to questions hidden by skip logic are discarded
        answers: questions
          .filter((q) => answers[q.id] && !hidden.has(q.id))
          .map((q) => ({ questionId: q.id, ...answers[q.id] })),
      });
    }
  }

  return (
    <form
      ref={formRef}
      method="POST"
      action="/api/submit-survey"
      encType="application/x-www-form-urlencoded"
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
    >
      <input ref={payloadRef} type="hidden" name="payload" />
      <div ref={pageTopRef} tabIndex={-1} className="sr-only" aria-live="polite">
        {pages.length > 1 && `Section ${position + 1} of ${visiblePageIndexes.length}`}
      </div>

      {pages.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-stone-500">
            Section {position + 1} of {visiblePageIndexes.length}
          </p>
          <div
            className="h-1.5 rounded-full bg-stone-200 overflow-hidden"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={visiblePageIndexes.length}
            aria-valuenow={position + 1}
          >
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${((position + 1) / visiblePageIndexes.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {page.section && (
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{page.section.text}</h2>
          {page.section.instructions && (
            <p className="text-stone-600 text-base leading-relaxed mt-2 whitespace-pre-line">
              {page.section.instructions}
            </p>
          )}
        </div>
      )}

      {visibleQuestions(page).map((q) => (
        <div key={q.id} id={`question-${q.id}`} className="bg-white rounded-xl border border-stone-200 p-6">
          <p className="text-base font-medium text-stone-900 mb-1">
            <span className="text-stone-400 font-normal text-sm mr-2">{questionNumbers[q.id]}.</span>
            {q.text}
            {q.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          {q.instructions && (
            <p className="text-sm text-stone-500 mt-1">{q.instructions}</p>
          )}
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
                {maxSelections(q) !== undefined && (
                  <p className="text-sm text-stone-500 -mt-1">
                    Select up to {maxSelections(q)}
                    <span className="text-stone-400">
                      {" "}({answers[q.id]?.selectedOptions?.length ?? 0} of {maxSelections(q)} selected)
                    </span>
                  </p>
                )}
                {/* Shuffled options, then "Other", then pinned options — even when randomised */}
                {displayOptions(q, optionOrders[q.id]).map((opt) => {
                  const isCheckbox = q.type === "CHECKBOX";
                  const selected = answers[q.id]?.selectedOptions?.includes(opt) ?? false;
                  const isOther = opt === OTHER_OPTION && allowsOther(q);
                  const max = maxSelections(q);
                  // Once the limit is reached, unselected options can't be picked
                  const atLimit =
                    isCheckbox && max !== undefined && !selected &&
                    (answers[q.id]?.selectedOptions?.length ?? 0) >= max;
                  return (
                    <div key={opt} className="flex flex-col gap-2">
                      <label className={`flex items-center gap-3 group ${atLimit ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
                        <input
                          type={isCheckbox ? "checkbox" : "radio"}
                          name={`q-${q.id}`}
                          value={opt}
                          checked={selected}
                          disabled={atLimit}
                          onChange={() => toggleOption(q.id, opt, isCheckbox, max)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`flex-shrink-0 w-5 h-5 rounded-${isCheckbox ? "md" : "full"} border-2 flex items-center justify-center transition-colors ${
                            selected
                              ? "border-brand-600 bg-brand-600"
                              : atLimit
                                ? "border-stone-300"
                                : "border-stone-300 group-hover:border-brand-400"
                          }`}
                        >
                          {selected && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              {isCheckbox ? (
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              ) : (
                                <circle cx="6" cy="6" r="3" fill="white" />
                              )}
                            </svg>
                          )}
                        </span>
                        <span className="text-sm text-stone-700">{opt}</span>
                      </label>
                      {isOther && selected && (
                        <input
                          className="ml-8 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                          placeholder="Please specify"
                          aria-label={`${OTHER_OPTION} — please specify`}
                          autoFocus
                          maxLength={1000}
                          value={answers[q.id]?.textValue ?? ""}
                          onChange={(e) => setAnswer(q.id, { textValue: e.target.value })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === "RATING" && (
              <RatingInput
                config={q.config as { min?: number; max?: number; minLabel?: string; maxLabel?: string; style?: string } ?? {}}
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

            {q.type === "NPS" && (
              <NpsInput
                value={answers[q.id]?.numericValue}
                onChange={(v) => setAnswer(q.id, { numericValue: v })}
              />
            )}

            {q.type === "MATRIX" && (
              <MatrixInput
                rows={(q.config as { rows?: string[] })?.rows ?? []}
                columns={Array.isArray(q.options) ? (q.options as string[]) : []}
                selections={answers[q.id]?.selectedOptions ?? []}
                onChange={(rowIndex, value) => setMatrixRow(q.id, rowIndex, value)}
              />
            )}

            {q.type === "RANKING" && (
              <RankingInput
                options={optionOrders[q.id] ?? (Array.isArray(q.options) ? (q.options as string[]) : [])}
                value={answers[q.id]?.selectedOptions}
                onChange={(ordered) => setAnswer(q.id, { selectedOptions: ordered })}
              />
            )}

            {q.type === "DATE" && (
              <input
                type="date"
                className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                value={answers[q.id]?.textValue ?? ""}
                onChange={(e) => setAnswer(q.id, { textValue: e.target.value })}
              />
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-col items-end gap-2 pt-2">
        {initialError && (
          <p className="text-sm text-red-600">{initialError}</p>
        )}
        {pageWarning && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2" role="alert">
            {pageWarning}
          </p>
        )}
        <div className="flex w-full items-center justify-end gap-3">
          {prevPageIndex !== undefined && (
            <Button type="button" variant="secondary" size="lg" onClick={handleBack} className="mr-auto">
              Back
            </Button>
          )}
          {/* Distinct keys so React swaps the element rather than turning the
              clicked Next button into a submit button mid-click (which would
              submit the form as soon as the last page appears) */}
          {isLastPage ? (
            <Button key="submit" type="submit" size="lg">
              Submit
            </Button>
          ) : (
            <Button key="next" type="button" size="lg" onClick={handleNext}>
              Next
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

// ── Rating (buttons or stars) ──────────────────────────────────────────────

function RatingInput({
  config,
  value,
  onChange,
}: {
  config: { min?: number; max?: number; minLabel?: string; maxLabel?: string; style?: string };
  value?: number;
  onChange: (v: number) => void;
}) {
  const min = config.min ?? 1;
  const max = config.max ?? 5;
  const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const isStars = config.style === "stars";

  if (isStars) {
    return (
      <div className="flex gap-1">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                value != null && n <= value
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-stone-300 hover:text-amber-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  }

  const hasLabels = config.minLabel || config.maxLabel;
  return (
    <div className="flex gap-2 flex-wrap">
      {nums.map((n, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === nums.length - 1;
        const label = isFirst && config.minLabel ? config.minLabel : isLast && config.maxLabel ? config.maxLabel : null;
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`rounded-lg text-sm font-medium transition-colors ${
              hasLabels && (isFirst || isLast) ? "px-3 py-2 min-w-[2.5rem]" : "w-10 h-10"
            } ${selected ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
          >
            {label ? (
              <span className="flex flex-col items-center leading-tight">
                <span>{n}</span>
                <span className={`text-[10px] font-normal ${selected ? "text-white/80" : "text-stone-400"}`}>{label}</span>
              </span>
            ) : n}
          </button>
        );
      })}
    </div>
  );
}

// ── Likert ─────────────────────────────────────────────────────────────────

function LikertInput({ labels, value, onChange }: { labels: string[]; value?: number; onChange: (v: number) => void }) {
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

// ── NPS ────────────────────────────────────────────────────────────────────

function NpsInput({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: 11 }, (_, i) => {
        const selected = value === i;
        const label = i === 0 ? "Not at all likely" : i === 10 ? "Extremely likely" : null;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`rounded-lg text-sm font-medium border transition-colors ${
              label ? "px-3 py-2 min-w-[2.5rem]" : "w-10 h-10"
            } ${
              selected
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200"
            }`}
          >
            {label ? (
              <span className="flex flex-col items-center leading-tight">
                <span>{i}</span>
                <span className={`text-[10px] font-normal ${selected ? "text-white/80" : "text-stone-400"}`}>{label}</span>
              </span>
            ) : i}
          </button>
        );
      })}
    </div>
  );
}

// ── Matrix ─────────────────────────────────────────────────────────────────

function MatrixInput({
  rows,
  columns,
  selections,
  onChange,
}: {
  rows: string[];
  columns: string[];
  selections: string[];
  onChange: (rowIndex: number, value: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 font-normal text-stone-400 text-xs w-1/3" />
            {columns.map((col) => (
              <th key={col} className="text-center py-2 px-3 font-medium text-stone-600 text-xs whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-stone-50/50" : ""}>
              <td className="py-3 pr-4 text-stone-700 text-sm align-middle">{row}</td>
              {columns.map((col) => {
                const selected = selections[ri] === col;
                return (
                  <td key={col} className="py-3 px-3 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => onChange(ri, col)}
                      className={`w-5 h-5 rounded-full border-2 mx-auto flex items-center justify-center transition-colors ${
                        selected ? "border-brand-600 bg-brand-600" : "border-stone-300 hover:border-brand-400"
                      }`}
                    >
                      {selected && <span className="w-2 h-2 rounded-full bg-white block" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Ranking ────────────────────────────────────────────────────────────────

function SortableRankItem({ id, rank }: { id: string; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isDragging ? "border-brand-400 bg-brand-50 shadow-md z-10 relative" : "border-stone-200 bg-white"
      }`}
    >
      <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-500 text-xs font-semibold flex items-center justify-center flex-shrink-0">
        {rank}
      </span>
      <span className="flex-1 text-sm text-stone-800">{id}</span>
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 touch-none p-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
    </div>
  );
}

function RankingInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string[];
  onChange: (ordered: string[]) => void;
}) {
  const [items, setItems] = useState<string[]>(() => value ?? [...options]);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const next = arrayMove(prev, oldIndex, newIndex);
        onChange(next);
        return next;
      });
    }
  }

  return (
    <div>
      <p className="text-xs text-stone-400 mb-3">Drag to reorder from most to least preferred</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <SortableRankItem key={item} id={item} rank={i + 1} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
