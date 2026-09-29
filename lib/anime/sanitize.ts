/**
 * AniList descriptions are HTML (<br>, <i>, <b>, entities). They are rendered
 * with dangerouslySetInnerHTML, and list entries are user-writable and shown on
 * public list pages, so every description must pass through here — both when it
 * is stored and when it is rendered (older stored entries were never sanitized).
 *
 * Output contains only bare <br>, <i>, <b>, <em>, <strong> tags that this
 * function emits itself (no attributes); every other "<" / ">" is escaped.
 */

const ALLOWED_TAGS = new Set(["br", "i", "b", "em", "strong"]);

/** Elements whose text content should be dropped along with the tags. */
const DROP_CONTENT_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "template",
  "noscript",
  "textarea",
  "title",
  "svg",
  "math",
]);

const TAG_RE = /<!--[\s\S]*?(?:-->|$)|<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;
const BARE_AMPERSAND_RE = /&(?![a-zA-Z][a-zA-Z0-9]{1,31};|#\d{1,7};|#[xX][0-9a-fA-F]{1,6};)/g;

const escapeText = (text: string) =>
  text
    .replace(BARE_AMPERSAND_RE, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const MAX_DESCRIPTION_LENGTH = 10_000;

export function sanitizeDescription(
  input: unknown,
  maxLength: number = MAX_DESCRIPTION_LENGTH
): string | null {
  if (typeof input !== "string") return null;
  const source = input.slice(0, maxLength);

  let output = "";
  let lastIndex = 0;
  let droppingUntil: string | null = null;
  // Formatting tags must come out balanced: AniList sometimes leaves an <i>
  // unclosed, and the browser's parser then carries it into the elements that
  // follow the description, which breaks hydration of the rest of the card.
  const open: string[] = [];

  for (const match of source.matchAll(TAG_RE)) {
    const index = match.index ?? 0;
    if (!droppingUntil) output += escapeText(source.slice(lastIndex, index));
    lastIndex = index + match[0].length;

    const name = match[1]?.toLowerCase();
    if (!name) continue; // HTML comment
    const closing = match[0][1] === "/";

    if (droppingUntil) {
      if (closing && name === droppingUntil) droppingUntil = null;
      continue;
    }
    if (DROP_CONTENT_TAGS.has(name)) {
      if (!closing && !match[0].endsWith("/>")) droppingUntil = name;
      continue;
    }
    if (!ALLOWED_TAGS.has(name)) continue;
    if (name === "br") {
      output += "<br>";
    } else if (!closing) {
      output += `<${name}>`;
      open.push(name);
    } else if (open.includes(name)) {
      // Close everything opened after it too (mis-nested <i><b></i>).
      while (open.length) {
        const top = open.pop()!;
        output += `</${top}>`;
        if (top === name) break;
      }
    }
    // A closing tag with nothing to close is dropped.
  }
  if (!droppingUntil) output += escapeText(source.slice(lastIndex));
  while (open.length) output += `</${open.pop()}>`;

  const trimmed = output.trim();
  return trimmed.length ? trimmed : null;
}

/** Plain-text version (for meta descriptions, alt text, etc.). */
export function descriptionToText(input: unknown): string {
  const html = sanitizeDescription(input);
  if (!html) return "";
  return html
    .replace(/<br>/g, "\n")
    .replace(/<\/?(?:i|b|em|strong)>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}
