/**
 * The pieces both share images share: the banner's eyebrow, Great Sage box,
 * h1, sub and the "kylevb.com" footer, in Satori's dialect (CLAUDE.md §9.24).
 */
import type { ShareTitle } from "./shareCard";
import { OG_MONO } from "./fonts";

/** EYEBROW_CLASS in Satori: mono, upper case, wide tracking, sage. */
export function OgEyebrow({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", fontFamily: OG_MONO, fontSize: 22, letterSpacing: 4.4, color: "#95ccff" }}>
      {text.toUpperCase()}
    </div>
  );
}

/**
 * The banner's Great Sage line (SAGE_FRAME): the 《Kind》 tag inline in sage, then one flex item per word so the
 * line wraps like text (Satori can't wrap mixed-color inline text). maxLines × 30px, overflow hidden.
 */
export function OgSageBox({ kind, text, maxWidth, maxLines }: { kind: string; text: string; maxWidth: number; maxLines: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        maxWidth,
        marginTop: 14,
        padding: "10px 16px",
        borderRadius: 8,
        border: "1.5px solid rgba(149, 204, 255, 0.3)",
        backgroundColor: "rgba(10, 21, 40, 0.78)",
        boxShadow: "0 0 24px -8px rgba(149, 204, 255, 0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          columnGap: 13.2,
          maxHeight: 30 * maxLines,
          overflow: "hidden",
          fontFamily: OG_MONO,
          fontSize: 22,
          lineHeight: "30px",
          color: "#cfe8ff",
        }}
      >
        <span style={{ color: "#95ccff" }}>{`《${kind}》`}</span>
        {text.split(" ").map((word, index) => (
          <span key={index}>{word}</span>
        ))}
      </div>
    </div>
  );
}

/** The page h1 (PAGE_TITLE_CLASS): moonlit white, bold faked with a stroke. fitTitle already made it fit. */
export function OgTitle({ title, maxWidth }: { title: ShareTitle; maxWidth: number }) {
  const stroke = title.size >= 68 ? 2 : 1.5;
  // Room below the baseline inside the clip box (overflow hidden keeps the ellipsis): a CJK name's
  // fallback font lowers the baseline, which cut the descenders of "airing" flat.
  const descent = Math.round(title.size * 0.15);
  return (
    <div
      style={{
        display: "flex",
        marginTop: 16,
        paddingBottom: descent,
        marginBottom: -descent,
        maxWidth,
        fontSize: title.size,
        lineHeight: 1.08,
        letterSpacing: -0.5,
        color: "#f4f9ff",
        WebkitTextStroke: `${stroke}px #f4f9ff`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {title.text}
    </div>
  );
}

/** The banner's sub (#c9d6e6), two lines at most. */
export function OgSub({ text, maxWidth }: { text: string; maxWidth: number }) {
  return (
    <div style={{ display: "block", marginTop: 8, maxWidth, fontSize: 26, lineHeight: "34px", color: "#c9d6e6", lineClamp: 2 }}>
      {text}
    </div>
  );
}

/** "kylevb.com", bottom left on the treeline (the landing image's footer). */
export function OgFooter() {
  return <div style={{ position: "absolute", left: 64, bottom: 26, fontSize: 24, color: "#c9d6e6" }}>kylevb.com</div>;
}
