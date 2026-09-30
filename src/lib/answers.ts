// Value stored in selectedOptions when a respondent picks the "Other" option.
// The free text they type is stored in the answer's textValue.
export const OTHER_OPTION = "Other";

type QuestionLike = { type: string; config?: unknown };
type AnswerLike = {
  textValue: string | null;
  selectedOptions: unknown;
  numericValue: number | null;
};

export function isChoiceType(type: string) {
  return type === "MULTIPLE_CHOICE" || type === "CHECKBOX";
}

export function allowsOther(question: QuestionLike) {
  return (
    isChoiceType(question.type) &&
    !!(question.config as { allowOther?: boolean } | null)?.allowOther
  );
}

// Human-readable answer. For choice questions an "Other" selection is shown
// as "Other: <text>"; every other case matches the original display logic.
export function formatAnswer(
  question: QuestionLike,
  answer: AnswerLike,
  optionSeparator = ", "
): string | null {
  const selected = Array.isArray(answer.selectedOptions)
    ? (answer.selectedOptions as string[])
    : null;

  if (isChoiceType(question.type) && selected && selected.length > 0) {
    const otherText = answer.textValue?.trim();
    return selected
      .map((o) => (o === OTHER_OPTION && otherText ? `${OTHER_OPTION}: ${otherText}` : o))
      .join(optionSeparator);
  }

  if (answer.textValue) return answer.textValue;
  if (selected && selected.length > 0) return selected.join(optionSeparator);
  if (answer.numericValue != null) return String(answer.numericValue);
  return null;
}

// Choice questions only keep textValue when "Other" is enabled and selected.
export function dropStrayOtherText<
  A extends { questionId: string; textValue?: string; selectedOptions?: string[] },
>(answers: A[], questions: (QuestionLike & { id: string })[]): A[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return answers.map((a) => {
    const q = byId.get(a.questionId);
    if (!q || !isChoiceType(q.type)) return a;
    const keep = allowsOther(q) && !!a.selectedOptions?.includes(OTHER_OPTION);
    return keep ? a : { ...a, textValue: undefined };
  });
}
