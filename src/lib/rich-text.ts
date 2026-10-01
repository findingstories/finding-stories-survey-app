import sanitizeHtml from "sanitize-html";

// Only the formatting the cover page editor can produce is kept; anything
// else (scripts, styles, event handlers) is stripped before saving.
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h2", "h3", "ul", "ol", "li", "blockquote", "a", "hr",
    ],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  });
}

// True when the HTML has no visible text (e.g. an empty "<p></p>").
export function isEmptyRichText(html: string | null | undefined): boolean {
  return !html || sanitizeHtml(html, { allowedTags: [] }).trim() === "";
}
