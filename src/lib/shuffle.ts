type QuestionLike = { id: string; type: string; options: unknown; config: unknown };

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Random option orders for questions with "Randomise" on, keyed by question id.
// Computed once on the server per page load and passed to the form, so the
// server-rendered HTML and the browser agree on the order.
export function randomisedOptionOrders(questions: QuestionLike[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const q of questions) {
    const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
    const cfg = (q.config ?? {}) as { randomise?: boolean };
    if (
      (q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX" || q.type === "RANKING") &&
      cfg.randomise &&
      opts.length > 0
    ) {
      map[q.id] = shuffled(opts);
    }
  }
  return map;
}
