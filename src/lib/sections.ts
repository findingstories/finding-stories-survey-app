// A SECTION item in a questionnaire's ordered question list starts a new page.
// Its text is the section heading and its instructions the supporting text.

type Item = { type: string };

export function isSection(item: Item) {
  return item.type === "SECTION";
}

export type Page<Q extends Item> = { section: Q | null; questions: Q[] };

// Questions before the first section form an opening page with no heading;
// it's dropped if empty. A survey with no sections is a single page.
export function splitIntoPages<Q extends Item>(items: Q[]): Page<Q>[] {
  const pages: Page<Q>[] = [{ section: null, questions: [] }];
  for (const item of items) {
    if (isSection(item)) pages.push({ section: item, questions: [] });
    else pages[pages.length - 1].questions.push(item);
  }
  if (pages.length > 1 && pages[0].questions.length === 0) pages.shift();
  return pages;
}
