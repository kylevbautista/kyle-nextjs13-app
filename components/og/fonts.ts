import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The share images' fonts (assets/og, OFL: assets/og/OFL.txt). Passing `fonts` to ImageResponse replaces next/og's
 * bundled Geist, so Geist comes too. Weight is faked with WebkitTextStroke, as on the landing card.
 * - Geist-Regular.ttf: copied from next/dist/compiled/@vercel/og. Covers Latin, Latin Extended, Cyrillic, Greek
 *   and Vietnamese.
 * - GeistMono-Regular.ttf: the whole font from Google Fonts css2 `family=Geist+Mono` (TTF via a legacy Safari user
 *   agent), with the same coverage as Geist, so a name inside a mono line stays mono. The Great Sage's mono voice:
 *   eyebrows, the Sage line, stat labels.
 * - SageBrackets.ttf: the same API, `family=Noto+Sans+JP&text=《》`. Satori falls back glyph by glyph across loaded
 *   fonts, so 《》 never trigger a render-time Google Fonts fetch.
 * Names in kana, kanji, Hangul or other scripts neither font covers, and emoji, still use @vercel/og's dynamic
 * fallback, which fetches Noto or twemoji at render time (CLAUDE.md §10).
 * The paths are literal so the file tracer ships exactly these files (next.config.js also lists them).
 */
export const OG_SANS = "Geist";
export const OG_MONO = "Geist Mono";

type OgFont = { name: string; data: Buffer; weight: 400; style: "normal" };
let loading: Promise<OgFont[]> | null = null;

export function ogFonts(): Promise<OgFont[]> {
  loading ??= Promise.all([
    readFile(join(process.cwd(), "assets/og/Geist-Regular.ttf")),
    readFile(join(process.cwd(), "assets/og/GeistMono-Regular.ttf")),
    readFile(join(process.cwd(), "assets/og/SageBrackets.ttf")),
  ]).then(([sans, mono, brackets]): OgFont[] => [
    { name: OG_SANS, data: sans, weight: 400, style: "normal" },
    { name: OG_MONO, data: mono, weight: 400, style: "normal" },
    { name: "Sage Brackets", data: brackets, weight: 400, style: "normal" },
  ]);
  loading.catch(() => {
    loading = null; // a failed read is retried by the next render
  });
  return loading;
}
