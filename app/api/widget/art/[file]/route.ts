import { widgetArtResponse } from "@/components/og/WidgetArt";
import { WIDGET_ART_NAMES, parseWidgetArtFile, widgetArtFile } from "@/lib/widgetArt";

/**
 * The iPhone widget's static art (lib/widgetArt.ts, CLAUDE.md §5.9): 18 text-free PNGs (skies, tier slimes,
 * glyphs), prerendered at build. next/og sends `public, max-age=0, must-revalidate` (stored with the prerender),
 * which is fine: the art version is in the file name and the phone keeps each versioned file itself. Any other
 * name is a 404 with no render (dynamicParams = false).
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return WIDGET_ART_NAMES.map((name) => ({ file: widgetArtFile(name) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const spec = parseWidgetArtFile((await params).file);
  return spec ? widgetArtResponse(spec) : new Response(null, { status: 404 });
}
