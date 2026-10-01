// Skip logic: a single-answer multiple choice question can map each option to
// a later question/section (by id) or to END_SURVEY. Stored in the question's
// config as skipLogic: { [option]: targetId | "END" }. Questions between the
// answered question and its target are hidden; END_SURVEY hides everything
// after it. Rules on hidden questions don't apply, and rules whose target is
// missing or not after the question are ignored.

export const END_SURVEY = "END";

type Item = { id: string; type: string; config?: unknown };
type AnswerLike = { selectedOptions?: string[] };

export function skipRules(question: Item): Record<string, string> {
  if (question.type !== "MULTIPLE_CHOICE") return {};
  const rules = (question.config as { skipLogic?: unknown } | null)?.skipLogic;
  if (!rules || typeof rules !== "object") return {};
  return Object.fromEntries(
    Object.entries(rules as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== ""
    )
  );
}

export function hasSkipLogic(question: Item): boolean {
  return Object.keys(skipRules(question)).length > 0;
}

// True if a rule's target exists and comes after the question (or ends the survey)
export function isValidSkipTarget(items: Item[], questionId: string, target: string): boolean {
  if (target === END_SURVEY) return true;
  const from = items.findIndex((i) => i.id === questionId);
  const to = items.findIndex((i) => i.id === target);
  return from !== -1 && to > from;
}

// Ids of questions and sections hidden by skip logic, given the answers so far
export function hiddenItemIds(
  items: Item[],
  answers: Record<string, AnswerLike | undefined>
): Set<string> {
  const hidden = new Set<string>();
  let skipUntil: number | null = null;

  items.forEach((item, index) => {
    if (skipUntil !== null && index < skipUntil) {
      hidden.add(item.id);
      return;
    }
    skipUntil = null;

    const selected = answers[item.id]?.selectedOptions?.[0];
    const target = selected !== undefined ? skipRules(item)[selected] : undefined;
    if (!target) return;
    if (target === END_SURVEY) {
      skipUntil = Infinity;
    } else {
      const targetIndex = items.findIndex((i) => i.id === target);
      if (targetIndex > index) skipUntil = targetIndex;
    }
  });

  return hidden;
}
