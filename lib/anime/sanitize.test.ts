import { describe, expect, it } from "vitest";
import { descriptionToText, sanitizeDescription } from "./sanitize";

describe("sanitizeDescription", () => {
  it("keeps AniList's formatting tags and entities", () => {
    const input =
      "Frieren&rsquo;s journey.<br><br>\n<i>(Source: Crunchyroll)</i> <b>Note</b> <Br>";
    expect(sanitizeDescription(input)).toBe(
      "Frieren&rsquo;s journey.<br><br>\n<i>(Source: Crunchyroll)</i> <b>Note</b> <br>"
    );
  });

  it("strips attributes from allowed tags", () => {
    expect(sanitizeDescription('<i onclick="alert(1)" class="x">hi</i>')).toBe("<i>hi</i>");
    expect(sanitizeDescription("<br/><BR />")).toBe("<br><br>");
  });

  it("removes disallowed elements and executable content", () => {
    expect(sanitizeDescription('a<img src=x onerror="alert(1)">b')).toBe("ab");
    expect(sanitizeDescription("a<script>alert(1)</script>b")).toBe("ab");
    expect(sanitizeDescription("a<style>*{}</style>b")).toBe("ab");
    expect(sanitizeDescription('<a href="javascript:alert(1)">link</a>')).toBe("link");
    expect(sanitizeDescription("<svg onload=alert(1)><circle/></svg>ok")).toBe("ok");
    expect(sanitizeDescription("x<!-- <script>alert(1)</script> -->y")).toBe("xy");
  });

  it("escapes anything that could still form markup", () => {
    expect(sanitizeDescription("a < b && c > d")).toBe("a &lt; b &amp;&amp; c &gt; d");
    expect(sanitizeDescription("<img src=x onerror=alert(1)//")).toBe(
      "&lt;img src=x onerror=alert(1)//"
    );
    expect(sanitizeDescription("<scr<script>ipt>alert(1)</script>")).toBe("ipt&gt;alert(1)");
    expect(sanitizeDescription("<<i>>")).toBe("&lt;<i>&gt;</i>");
  });

  it("never emits a tag it did not generate", () => {
    const hostile = [
      '"><svg/onload=alert(1)>',
      "<iframe srcdoc='<script>alert(1)</script>'></iframe>",
      "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
      "<details open ontoggle=alert(1)>",
      "<<script>script>alert(1)<</script>/script>",
      "<IMG SRC=JaVaScRiPt:alert('XSS')>",
      "<a\nhref=javascript:alert(1)>x</a>",
    ];
    for (const input of hostile) {
      const out = sanitizeDescription(input) ?? "";
      const tags = out.match(/<[^>]*>/g) ?? [];
      for (const tag of tags) expect(tag).toMatch(/^<\/?(br|i|b|em|strong)>$/);
    }
  });

  it("always emits balanced formatting tags", () => {
    // Real AniList data (Re:Zero S4) ends with an unclosed <i>.
    expect(sanitizeDescription("(Source: Crunchyroll)<br><br><i>Note: pre-screened early.")).toBe(
      "(Source: Crunchyroll)<br><br><i>Note: pre-screened early.</i>"
    );
    expect(sanitizeDescription("a</i>b</b>")).toBe("ab");
    expect(sanitizeDescription("<i>x<b>y</i>z</b>")).toBe("<i>x<b>y</b></i>z");
    expect(sanitizeDescription("<b><i>deep")).toBe("<b><i>deep</i></b>");
    expect(sanitizeDescription("<i>cut off", 5)).toBe("<i>cu</i>");
  });

  it("handles non-strings, empty input and length caps", () => {
    expect(sanitizeDescription(null)).toBeNull();
    expect(sanitizeDescription({ html: "<b>x</b>" })).toBeNull();
    expect(sanitizeDescription("   ")).toBeNull();
    expect(sanitizeDescription("a".repeat(50), 10)).toBe("a".repeat(10));
  });
});

describe("descriptionToText", () => {
  it("returns readable plain text", () => {
    expect(descriptionToText("One<br>Two <i>three</i> &amp; four")).toBe(
      "One\nTwo three & four"
    );
  });
});
