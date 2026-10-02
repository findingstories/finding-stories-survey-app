// Client-safe helpers for fields that used to hold plain text and now hold
// formatted HTML from the rich text editor (e.g. the completion message).

// Messages saved by the rich text editor always start with a block tag
export function isRichText(value: string | null | undefined): boolean {
  return !!value && value.trimStart().startsWith("<");
}

// Turn an older plain-text value into editor HTML, one paragraph per line
export function plainTextToHtml(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\r?\n/)
    .map((line) => `<p>${escape(line)}</p>`)
    .join("");
}
