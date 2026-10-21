/**
 * Shared by the widget's tests and the scratchpad preview: the fake network (art, covers, the data route)
 * and walks over the recorded widget tree.
 */
import { WIDGET_ART_NAMES, parseWidgetArtFile, widgetArtFile, widgetArtPixels } from "@/lib/widgetArt";
import type { WidgetPayload } from "@/lib/widget";
import { DOCUMENTS, fakePng, type ColorJ, type NetReply, type NetTable, type WidgetNode } from "./mockRuntime";
import { USER_ID } from "./fixtures";

export const DATA_URL = `https://kylevb.com/api/widget/v1/list/${USER_ID}`;
export const LINK = `https://kylevb.com/user/${USER_ID}`;
export const WIDGET_DIR = `${DOCUMENTS}/kylevb-anime`;
export const FAMILIES = [
  "small",
  "medium",
  "large",
  "accessoryRectangular",
  "accessoryInline",
  "accessoryCircular",
] as const;

/** Every art file, at its real pixel size, for art version `version`. */
export function artNet(version = 1, latencyMs = 40): NetTable {
  const net: NetTable = {};
  for (const name of WIDGET_ART_NAMES) {
    const spec = parseWidgetArtFile(widgetArtFile(name))!;
    const { width, height } = widgetArtPixels(spec);
    net[`https://kylevb.com/api/widget/art/${widgetArtFile(name, version)}`] = { bytes: fakePng(width, height), latencyMs };
  }
  return net;
}

/** A 230×325 cover for every row (AniList's "large"). */
export function coverNet(payload: WidgetPayload, latencyMs = 60): NetTable {
  const net: NetTable = {};
  for (const row of payload.rows) if (row.cover) net[row.cover] = { bytes: fakePng(230, 325), latencyMs };
  return net;
}

/** The data route answering with `reply` (a payload is sent as JSON), plus every art file and cover. */
export function siteNet(reply: WidgetPayload | NetReply, extra: NetTable = {}): NetTable {
  const isPayload = "schema" in reply;
  const payload = isPayload ? (reply as WidgetPayload) : null;
  return {
    ...artNet(),
    ...(payload ? coverNet(payload) : {}),
    [DATA_URL]: payload ? { body: JSON.stringify(payload), latencyMs: 120 } : (reply as NetReply),
    ...extra,
  };
}

export interface Visit {
  node: WidgetNode;
  ancestors: WidgetNode[];
}

/** Every node in document order with its ancestors (the widget first). */
export function walk(node: WidgetNode, ancestors: WidgetNode[] = [], out: Visit[] = []): Visit[] {
  out.push({ node, ancestors });
  if ("children" in node) for (const child of node.children) walk(child, [...ancestors, node], out);
  return out;
}

export const textsOf = (tree: WidgetNode) =>
  walk(tree).flatMap(({ node }) => (node.type === "text" ? [node.props.text] : []));
export const nodesOf = <K extends WidgetNode["type"]>(tree: WidgetNode, type: K) =>
  walk(tree).filter((v): v is Visit & { node: Extract<WidgetNode, { type: K }> } => v.node.type === type);

/** A color's alpha (a dynamic color: its higher one). */
export const alphaOf = (color: ColorJ | undefined): number =>
  !color ? 0 : "dynamic" in color ? Math.max(alphaOf(color.dynamic.light), alphaOf(color.dynamic.dark)) : color.alpha;
export const hexOf = (color: ColorJ | undefined): string | null => (!color ? null : "dynamic" in color ? null : color.hex);

/** Whether a stack paints anything behind its content. */
export const hasFill = (node: WidgetNode) =>
  node.type === "stack" &&
  (alphaOf(node.props.backgroundColor) > 0 || Boolean(node.props.backgroundImage) || Boolean(node.props.backgroundGradient));
