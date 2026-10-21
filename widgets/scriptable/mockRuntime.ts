/**
 * A mock of Scriptable's runtime (https://docs.scriptable.app) for running kylevb-anime.js under vitest and in
 * the scratchpad preview: the documented classes with their documented defaults, plus the platform's known
 * quirks, recorded in `quirks` when the script trips one (alignment ignored in stacks, minimumScaleFactor on
 * a WidgetDate, loadJSON/loadImage, iCloud, unset gradient points, an element url in a small widget, …).
 * Web and Node APIs Scriptable lacks are shadowed to undefined. No vitest import: the clock is injected
 * (harness.ts wires it to vi.setSystemTime), so the preview can use this file as is.
 */

export type Family =
  | "small"
  | "medium"
  | "large"
  | "accessoryRectangular"
  | "accessoryInline"
  | "accessoryCircular";

export interface NetReply {
  status?: number;
  body?: string;
  bytes?: Uint8Array;
  /** When the reply is complete. Past timeoutInterval it times out, unless it `trickle`s. */
  latencyMs?: number;
  /**
   * Bytes keep arriving the whole time (a slow but steady link): iOS's timeoutInterval is an idle timeout, so it
   * never fires, however long the reply takes.
   */
  trickle?: boolean;
  /** A network failure: the request rejects with this message and `response` stays null. */
  error?: string;
  mimeType?: string;
}
export type NetTable = Record<string, NetReply | ((req: { url: string; headers: Record<string, string> }) => NetReply)>;
export type AlertAnswer = { choose: string; fields?: string[] } | "cancel";

export interface DeviceProfile {
  name: string;
  /** Points, portrait. */
  screen: [number, number];
  scale: 2 | 3;
}

export const DEVICE_PROFILES = {
  se3: { name: "iPhone SE (3rd generation)", screen: [375, 667], scale: 2 },
  x: { name: "iPhone 13 mini", screen: [375, 812], scale: 3 },
  iphone16: { name: "iPhone 16", screen: [393, 852], scale: 3 },
  iphone17pro: { name: "iPhone 17 Pro", screen: [402, 874], scale: 3 },
  promax: { name: "iPhone 17 Pro Max", screen: [440, 956], scale: 3 },
  air: { name: "iPhone Air", screen: [420, 912], scale: 3 },
  ipad: { name: "iPad Air", screen: [820, 1180], scale: 2 },
} as const satisfies Record<string, DeviceProfile>;

// ---------------------------------------------------------------------------
// The file system (persists across runs)
// ---------------------------------------------------------------------------

interface StoredFile {
  bytes: Uint8Array;
  mtime: number;
  ctime: number;
  /** Where the bytes came from (a URL), so a preview can show the real image. */
  origin: string | null;
}

export class MockFileSystem {
  files = new Map<string, StoredFile>();
  dirs = new Set<string>(["/", DOCUMENTS, LIBRARY, CACHES, TEMP]);
  /** The last run's kind: cache and temp aren't shared between the app and the widget. */
  lastKind: "widget" | "app" | null = null;

  /** Text of a stored file (tests). */
  text(path: string): string | null {
    const file = this.files.get(path);
    return file ? new TextDecoder().decode(file.bytes) : null;
  }
  list(prefix: string): string[] {
    return [...this.files.keys()].filter((path) => path.startsWith(prefix)).sort();
  }
}

export const DOCUMENTS = "/var/mobile/Documents";
const LIBRARY = "/var/mobile/Library";
const CACHES = "/var/mobile/Library/Caches";
const TEMP = "/var/mobile/tmp";

// ---------------------------------------------------------------------------
// Options and results
// ---------------------------------------------------------------------------

export interface RuntimeOptions {
  mode:
    | { kind: "widget"; family: Family; parameter?: string | null }
    | { kind: "app"; queryParameters?: Record<string, string>; alerts?: AlertAnswer[] };
  device?: DeviceProfile;
  nowMs: number;
  net?: NetTable;
  fs?: MockFileSystem;
  clock: { set(ms: number): void };
}

export interface RequestRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  timeoutInterval: number;
  outcome: string;
  /** A timer (the script's deadline) fired before the reply ended: the script moved on without it. */
  abandoned?: boolean;
}

export interface AlertRecord {
  title: string;
  message: string;
  actions: string[];
  fields: string[];
}

export interface RunResult {
  widget: WidgetNode | null;
  presented: { method: string; widget: WidgetNode }[];
  requests: RequestRecord[];
  setWidgetCalls: number;
  completeCalls: number;
  logs: string[];
  alerts: AlertRecord[];
  fs: MockFileSystem;
  exports: Record<string, unknown>;
  elapsedMs: number;
  quirks: string[];
}

// ---------------------------------------------------------------------------
// The recorded tree (plain JSON, shared by tests and the preview)
// ---------------------------------------------------------------------------

export type ColorJ = { hex: string; alpha: number } | { dynamic: { light: ColorJ; dark: ColorJ } };
export interface ImgJ {
  src: string;
  w: number;
  h: number;
}
export interface GradJ {
  colors: ColorJ[];
  locations: number[];
  start: [number, number];
  end: [number, number];
}
type Pad = [number, number, number, number];

export type WidgetNode =
  | {
      type: "widget";
      family: Family | null;
      props: {
        padding: Pad | "default";
        spacing: number;
        backgroundColor?: ColorJ;
        backgroundImage?: ImgJ;
        backgroundGradient?: GradJ;
        url?: string;
        refreshAfterDate?: number;
        accessoryBackground: boolean;
      };
      children: WidgetNode[];
    }
  | {
      type: "stack";
      props: {
        layout: "h" | "v";
        align: "top" | "center" | "bottom";
        size: [number, number];
        spacing: number;
        padding: Pad | null;
        backgroundColor?: ColorJ;
        backgroundImage?: ImgJ;
        backgroundGradient?: GradJ;
        cornerRadius: number;
        borderWidth: number;
        borderColor?: ColorJ;
        url?: string;
      };
      children: WidgetNode[];
    }
  | {
      type: "text";
      props: {
        text: string;
        font: string;
        textColor?: ColorJ;
        textOpacity: number;
        lineLimit: number;
        minimumScaleFactor: number;
        align: "left" | "center" | "right";
        url?: string;
      };
    }
  | {
      type: "date";
      props: {
        date: number;
        style: "date" | "time" | "relative" | "offset" | "timer";
        font: string;
        textColor?: ColorJ;
        lineLimit: number;
        minimumScaleFactor: number;
        url?: string;
      };
    }
  | {
      type: "image";
      props: {
        image: ImgJ;
        imageSize: [number, number] | null;
        cornerRadius: number;
        contentMode: "fit" | "fill";
        tintColor?: ColorJ;
        imageOpacity: number;
        containerRelativeShape: boolean;
        url?: string;
      };
    }
  | { type: "spacer"; props: { length: number | null } };

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** A minimal PNG header (signature + IHDR + IEND): enough for Image.size. */
export function fakePng(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(8 + 25 + 12);
  bytes.set(PNG_SIGNATURE, 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([73, 72, 68, 82], 12); // IHDR
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes.set([8, 6, 0, 0, 0], 24);
  view.setUint32(33, 0);
  bytes.set([73, 69, 78, 68], 37); // IEND
  return bytes;
}

/** Pixel size of PNG or JPEG bytes, else null. */
function imageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length >= 24 && PNG_SIGNATURE.every((b, i) => bytes[i] === b)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) return null;
      const marker = bytes[i + 1];
      const length = (bytes[i + 2] << 8) | bytes[i + 3];
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
      }
      i += 2 + length;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// The runtime
// ---------------------------------------------------------------------------

type AnyRecord = Record<string, unknown>;

/** Builds fresh Scriptable globals for one run. */
export function createRuntime(opts: RuntimeOptions): { globals: Record<string, unknown>; result(): RunResult } {
  const fs = opts.fs ?? new MockFileSystem();
  const device: DeviceProfile = opts.device ?? DEVICE_PROFILES.iphone16;
  const inWidget = opts.mode.kind === "widget";
  const family: Family | null = opts.mode.kind === "widget" ? opts.mode.family : null;
  const accessory = family !== null && family.startsWith("accessory");
  const alertQueue: AlertAnswer[] = opts.mode.kind === "app" ? [...(opts.mode.alerts ?? [])] : [];
  const net = opts.net ?? {};

  const quirks: string[] = [];
  const quirk = (text: string) => {
    if (!quirks.includes(text)) quirks.push(text);
  };
  const logs: string[] = [];
  const requests: RequestRecord[] = [];
  const alerts: AlertRecord[] = [];
  const presented: { method: string; widget: WidgetNode }[] = [];
  let setWidgetCalls = 0;
  let completeCalls = 0;
  let shownWidget: WidgetNode | null = null;
  let uuid = 0;
  const moduleObject: { exports: Record<string, unknown> } = { exports: {} };

  // Cache and temp aren't shared between the app and the widget extension.
  const kind = inWidget ? "widget" : "app";
  if (fs.lastKind !== null && fs.lastKind !== kind) {
    for (const path of [...fs.files.keys()]) if (path.startsWith(CACHES) || path.startsWith(TEMP)) fs.files.delete(path);
  }
  fs.lastKind = kind;

  // --- value classes ---------------------------------------------------------

  class Point {
    constructor(
      public x: number,
      public y: number
    ) {}
  }
  class Size {
    constructor(
      public width: number,
      public height: number
    ) {}
  }
  class Rect {
    constructor(
      public x: number,
      public y: number,
      public width: number,
      public height: number
    ) {}
    get origin() {
      return new Point(this.x, this.y);
    }
    get size() {
      return new Size(this.width, this.height);
    }
    get minX() {
      return this.x;
    }
    get minY() {
      return this.y;
    }
    get maxX() {
      return this.x + this.width;
    }
    get maxY() {
      return this.y + this.height;
    }
  }

  class Color {
    readonly hex: string;
    readonly alpha: number;
    dynamicPair: { light: Color; dark: Color } | null = null;
    constructor(hex: string, alpha?: number) {
      let h = String(hex ?? "").replace(/^#/, "").toLowerCase();
      if (!/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(h)) {
        quirk(`invalid Color hex "${hex}"`);
        h = "000000";
      }
      if (h.length === 3) h = [...h].map((c) => c + c).join("");
      let a = 1;
      if (h.length === 8) {
        a = Number.parseInt(h.slice(6), 16) / 255;
        h = h.slice(0, 6);
      }
      this.hex = h;
      this.alpha = typeof alpha === "number" ? alpha : a;
    }
    get red() {
      return Number.parseInt(this.hex.slice(0, 2), 16) / 255;
    }
    get green() {
      return Number.parseInt(this.hex.slice(2, 4), 16) / 255;
    }
    get blue() {
      return Number.parseInt(this.hex.slice(4, 6), 16) / 255;
    }
    static dynamic(light: Color, dark: Color): Color {
      const color = new Color(dark.hex, dark.alpha);
      color.dynamicPair = { light, dark };
      return color;
    }
    static black = () => new Color("000000");
    static darkGray = () => new Color("555555");
    static lightGray = () => new Color("aaaaaa");
    static white = () => new Color("ffffff");
    static gray = () => new Color("808080");
    static red = () => new Color("ff0000");
    static green = () => new Color("00ff00");
    static blue = () => new Color("0000ff");
    static cyan = () => new Color("00ffff");
    static yellow = () => new Color("ffff00");
    static magenta = () => new Color("ff00ff");
    static orange = () => new Color("ff8000");
    static purple = () => new Color("800080");
    static brown = () => new Color("996633");
    static clear = () => new Color("000000", 0);
  }

  class Font {
    constructor(
      public name: string,
      public size: number
    ) {}
    toString() {
      return this.name;
    }
  }
  const FontStatics = Font as unknown as Record<string, unknown>;
  for (const style of ["largeTitle", "title1", "title2", "title3", "headline", "subheadline", "body", "callout", "footnote", "caption1", "caption2"]) {
    FontStatics[style] = () => new Font(`${style}()`, 0);
  }
  const SIZED = [
    "systemFont",
    "ultraLightSystemFont",
    "thinSystemFont",
    "lightSystemFont",
    "regularSystemFont",
    "mediumSystemFont",
    "semiboldSystemFont",
    "boldSystemFont",
    "heavySystemFont",
    "blackSystemFont",
    "italicSystemFont",
    ...["ultraLight", "thin", "light", "regular", "medium", "semibold", "bold", "heavy", "black"].flatMap((weight) => [
      `${weight}MonospacedSystemFont`,
      `${weight}RoundedSystemFont`,
    ]),
  ];
  for (const name of SIZED) FontStatics[name] = (size: number) => new Font(`${name}(${size})`, size);

  class LinearGradient {
    colors: Color[] = [];
    locations: number[] = [];
    private _start = new Point(0, 1);
    private _end = new Point(0, 1);
    private startSet = false;
    private endSet = false;
    get startPoint() {
      return this._start;
    }
    set startPoint(point: Point) {
      this._start = point;
      this.startSet = true;
    }
    get endPoint() {
      return this._end;
    }
    set endPoint(point: Point) {
      this._end = point;
      this.endSet = true;
    }
    pointsSet() {
      return this.startSet && this.endSet;
    }
  }

  class Data {
    constructor(
      readonly bytes: Uint8Array,
      readonly origin: string | null = null
    ) {}
    static fromString(text: string) {
      return new Data(new TextEncoder().encode(text));
    }
    static fromFile(path: string) {
      const file = fs.files.get(path);
      return file ? new Data(file.bytes, file.origin) : null;
    }
    static fromBase64String(text: string) {
      try {
        return new Data(Uint8Array.from(atobImpl(text), (c) => c.charCodeAt(0)));
      } catch {
        return null;
      }
    }
    static fromPNG(image: MockImage) {
      return new Data(fakePng(image.size.width, image.size.height), image.source);
    }
    static fromJPEG(image: MockImage) {
      return Data.fromPNG(image);
    }
    static fromBytes(bytes: number[]) {
      return new Data(Uint8Array.from(bytes));
    }
    toRawString() {
      try {
        return new TextDecoder("utf-8", { fatal: true }).decode(this.bytes);
      } catch {
        return null;
      }
    }
    toBase64String() {
      return btoaImpl(String.fromCharCode(...this.bytes));
    }
    getBytes() {
      return [...this.bytes];
    }
  }

  class MockImage {
    constructor(
      readonly size: Size,
      readonly source: string
    ) {}
    static fromData(data: Data | null) {
      const dims = data ? imageDimensions(data.bytes) : null;
      return dims && data ? new MockImage(new Size(dims.width, dims.height), data.origin ?? "data") : null;
    }
    static fromFile(path: string) {
      const file = fs.files.get(path);
      const dims = file ? imageDimensions(file.bytes) : null;
      return dims && file ? new MockImage(new Size(dims.width, dims.height), file.origin ?? path) : null;
    }
  }

  const atobImpl = (text: string) => Buffer.from(text, "base64").toString("latin1");
  const btoaImpl = (text: string) => Buffer.from(text, "latin1").toString("base64");

  // --- widget elements --------------------------------------------------------

  const colorJ = (color: Color | null | undefined): ColorJ | undefined => {
    if (!color) return undefined;
    if (color.dynamicPair) {
      return { dynamic: { light: colorJ(color.dynamicPair.light) as ColorJ, dark: colorJ(color.dynamicPair.dark) as ColorJ } };
    }
    return { hex: `#${color.hex}`, alpha: Math.round(color.alpha * 1000) / 1000 };
  };
  const imgJ = (image: MockImage): ImgJ => ({ src: image.source, w: image.size.width, h: image.size.height });
  const gradJ = (gradient: LinearGradient): GradJ => {
    if (!gradient.pointsSet()) quirk("LinearGradient used with a default startPoint/endPoint (both (0,1))");
    if (gradient.colors.length !== gradient.locations.length) quirk("LinearGradient colors and locations differ in length");
    return {
      colors: gradient.colors.map((c) => colorJ(c) as ColorJ),
      locations: [...gradient.locations],
      start: [gradient.startPoint.x, gradient.startPoint.y],
      end: [gradient.endPoint.x, gradient.endPoint.y],
    };
  };
  const fontName = (font: Font | undefined) => (font ? font.name : "default");

  type Element = WidgetStack | WidgetText | WidgetDate | WidgetImage | WidgetSpacer;

  class Container {
    children: Element[] = [];
    backgroundColor: Color | null = null;
    backgroundImage: MockImage | null = null;
    backgroundGradient: LinearGradient | null = null;
    spacing = 0;
    url: string | null = null;
    padding: Pad | null = null;
    constructor(readonly inStack: boolean) {}
    addText(text: string) {
      const element = new WidgetText(String(text), this.inStack);
      this.children.push(element);
      return element;
    }
    addDate(date: Date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) quirk("addDate with an invalid Date");
      const element = new WidgetDate(date, this.inStack);
      this.children.push(element);
      return element;
    }
    addImage(image: MockImage) {
      if (!(image instanceof MockImage)) throw new TypeError("addImage needs an Image");
      const element = new WidgetImage(image);
      this.children.push(element);
      return element;
    }
    addSpacer(length?: number | null) {
      const element = new WidgetSpacer(length ?? null);
      this.children.push(element);
      return element;
    }
    addStack() {
      const element = new WidgetStack();
      this.children.push(element);
      return element;
    }
    setPadding(top: number, leading: number, bottom: number, trailing: number) {
      this.padding = [top, leading, bottom, trailing];
    }
    useDefaultPadding() {
      this.padding = null;
    }
  }

  class WidgetStack extends Container {
    size = new Size(0, 0);
    cornerRadius = 0;
    borderWidth = 0;
    borderColor: Color = Color.black();
    layout: "h" | "v" = "h";
    align: "top" | "center" | "bottom" = "top";
    constructor() {
      super(true);
    }
    layoutHorizontally() {
      this.layout = "h";
    }
    layoutVertically() {
      this.layout = "v";
    }
    topAlignContent() {
      this.align = "top";
    }
    centerAlignContent() {
      this.align = "center";
    }
    bottomAlignContent() {
      this.align = "bottom";
    }
  }

  class TextLike {
    textColor: Color | null = null;
    font: Font | undefined = undefined;
    textOpacity = 1;
    lineLimit = 0;
    minimumScaleFactor = 1;
    shadowColor: Color = Color.black();
    shadowRadius = 0;
    shadowOffset = new Point(0, 0);
    url: string | null = null;
    align: "left" | "center" | "right" = "left";
    constructor(protected readonly inStack: boolean) {}
    private aligned(align: "left" | "center" | "right") {
      this.align = align;
      if (this.inStack) quirk("text alignment is ignored in stacks (use spacers)");
    }
    leftAlignText() {
      this.aligned("left");
    }
    centerAlignText() {
      this.aligned("center");
    }
    rightAlignText() {
      this.aligned("right");
    }
  }

  class WidgetText extends TextLike {
    constructor(
      public text: string,
      inStack: boolean
    ) {
      super(inStack);
    }
  }

  class WidgetDate extends TextLike {
    style: "date" | "time" | "relative" | "offset" | "timer" = "date";
    constructor(
      public date: Date,
      inStack: boolean
    ) {
      super(inStack);
    }
    applyTimeStyle() {
      this.style = "time";
    }
    applyDateStyle() {
      this.style = "date";
    }
    applyRelativeStyle() {
      this.style = "relative";
    }
    applyOffsetStyle() {
      this.style = "offset";
    }
    applyTimerStyle() {
      this.style = "timer";
    }
  }

  class WidgetImage {
    resizable = true;
    imageSize: Size | null = null;
    imageOpacity = 1;
    cornerRadius = 0;
    borderWidth = 0;
    borderColor: Color = Color.black();
    containerRelativeShape = false;
    tintColor: Color | null = null;
    url: string | null = null;
    contentMode: "fit" | "fill" = "fit";
    constructor(public image: MockImage) {}
    leftAlignImage() {}
    centerAlignImage() {}
    rightAlignImage() {}
    applyFittingContentMode() {
      this.contentMode = "fit";
    }
    applyFillingContentMode() {
      this.contentMode = "fill";
    }
  }

  class WidgetSpacer {
    constructor(public length: number | null) {}
  }

  class ListWidget extends Container {
    addAccessoryWidgetBackground = false;
    refreshAfterDate: Date | null = null;
    constructor() {
      super(false);
    }
    private present(method: string) {
      presented.push({ method, widget: toTreeImpl(this, null) });
      return Promise.resolve();
    }
    presentSmall() {
      return this.present("presentSmall");
    }
    presentMedium() {
      return this.present("presentMedium");
    }
    presentLarge() {
      return this.present("presentLarge");
    }
    presentExtraLarge() {
      return this.present("presentExtraLarge");
    }
    presentAccessoryInline() {
      return this.present("presentAccessoryInline");
    }
    presentAccessoryCircular() {
      return this.present("presentAccessoryCircular");
    }
    presentAccessoryRectangular() {
      return this.present("presentAccessoryRectangular");
    }
  }

  function toTreeImpl(node: unknown, fam: Family | null): WidgetNode {
    if (node instanceof ListWidget) {
      const props: Extract<WidgetNode, { type: "widget" }>["props"] = {
        padding: node.padding ?? "default",
        spacing: node.spacing,
        accessoryBackground: node.addAccessoryWidgetBackground,
      };
      if (node.backgroundColor) props.backgroundColor = colorJ(node.backgroundColor);
      if (node.backgroundImage) props.backgroundImage = imgJ(node.backgroundImage);
      if (node.backgroundGradient) props.backgroundGradient = gradJ(node.backgroundGradient);
      if (node.url) props.url = node.url;
      if (node.refreshAfterDate) props.refreshAfterDate = node.refreshAfterDate.getTime();
      return { type: "widget", family: fam, props, children: node.children.map((c) => toTreeImpl(c, fam)) };
    }
    if (node instanceof WidgetStack) {
      const props: Extract<WidgetNode, { type: "stack" }>["props"] = {
        layout: node.layout,
        align: node.align,
        size: [node.size.width, node.size.height],
        spacing: node.spacing,
        padding: node.padding,
        cornerRadius: node.cornerRadius,
        borderWidth: node.borderWidth,
      };
      if (node.backgroundColor) props.backgroundColor = colorJ(node.backgroundColor);
      if (node.backgroundImage) props.backgroundImage = imgJ(node.backgroundImage);
      if (node.backgroundGradient) props.backgroundGradient = gradJ(node.backgroundGradient);
      if (node.borderWidth > 0) props.borderColor = colorJ(node.borderColor);
      if (node.url) props.url = node.url;
      return { type: "stack", props, children: node.children.map((c) => toTreeImpl(c, fam)) };
    }
    if (node instanceof WidgetText) {
      return {
        type: "text",
        props: {
          text: node.text,
          font: fontName(node.font),
          ...(node.textColor ? { textColor: colorJ(node.textColor) } : {}),
          textOpacity: node.textOpacity,
          lineLimit: node.lineLimit,
          minimumScaleFactor: node.minimumScaleFactor,
          align: node.align,
          ...(node.url ? { url: node.url } : {}),
        },
      };
    }
    if (node instanceof WidgetDate) {
      return {
        type: "date",
        props: {
          date: node.date.getTime(),
          style: node.style,
          font: fontName(node.font),
          ...(node.textColor ? { textColor: colorJ(node.textColor) } : {}),
          lineLimit: node.lineLimit,
          minimumScaleFactor: node.minimumScaleFactor,
          ...(node.url ? { url: node.url } : {}),
        },
      };
    }
    if (node instanceof WidgetImage) {
      return {
        type: "image",
        props: {
          image: imgJ(node.image),
          imageSize: node.imageSize ? [node.imageSize.width, node.imageSize.height] : null,
          cornerRadius: node.cornerRadius,
          contentMode: node.contentMode,
          ...(node.tintColor ? { tintColor: colorJ(node.tintColor) } : {}),
          imageOpacity: node.imageOpacity,
          containerRelativeShape: node.containerRelativeShape,
          ...(node.url ? { url: node.url } : {}),
        },
      };
    }
    if (node instanceof WidgetSpacer) return { type: "spacer", props: { length: node.length } };
    throw new TypeError("toTree: not a widget element");
  }

  /** The platform's checks on a widget handed to setWidget. */
  function inspectShown(tree: WidgetNode) {
    const walk = (node: WidgetNode, depth: number) => {
      if (node.type === "date" && node.props.minimumScaleFactor < 1) quirk("minimumScaleFactor on a WidgetDate (iOS 17–18 bug)");
      if (node.type === "image" && node.props.imageSize === null && !node.props.image.src.startsWith("sfsymbol:")) {
        quirk("a raster image without imageSize (Image.size is pixels)");
      }
      if (depth > 0 && "url" in node.props && node.props.url && family !== "medium" && family !== "large") {
        quirk(`an element url in a ${family} widget (only widget.url counts)`);
      }
      if ("children" in node) for (const child of node.children) walk(child, depth + 1);
    };
    walk(tree, 0);
    if (family === "accessoryInline") {
      const flat: WidgetNode[] = [];
      const collect = (node: WidgetNode) => {
        if (node.type !== "widget") flat.push(node);
        if ("children" in node) node.children.forEach(collect);
      };
      collect(tree);
      const images = flat.filter((n) => n.type === "image");
      const texts = flat.filter((n) => n.type === "text");
      if (images.length > 1 || texts.length > 1) quirk("inline keeps one image and one text; the rest are filtered away");
      if (flat.some((n) => n.type === "date")) quirk("a WidgetDate in an inline widget doesn't tick");
      if (flat.some((n) => n.type === "stack")) quirk("stacks in an inline widget are filtered away");
    }
  }

  // --- timers -----------------------------------------------------------------

  interface TimerEntry {
    at: number;
    fn: () => void;
    active: boolean;
  }
  const timers: TimerEntry[] = [];
  /** A request's reply end; `settled` once it has been delivered (it stays registered until its caller has run). */
  interface InFlight {
    end: number;
    record: RequestRecord;
    settled: boolean;
  }
  /** Requests whose replies haven't settled: reply ends and timers are delivered in time order. */
  const inFlight = new Set<InFlight>();
  const macrotask = () => new Promise((resolve) => setImmediate(resolve));

  /**
   * Fire every live timer due by `self`'s reply end (in time order), each followed by a real macrotask so the
   * script runs. A sibling whose reply ends before the timer settles first (it may invalidate the timer: its own
   * raced deadline), so a fast load never loses to a deadline that a slower request's end happened to pass.
   * A timer that fires marks every reply still pending past it abandoned. That assumes what the script does: the
   * waits running side by side share one deadline (each group reads timeLeft in one synchronous pass, and the JSON
   * is awaited alone), so a fired timer means the script stopped waiting for all of them.
   */
  async function fireTimers(self: InFlight): Promise<void> {
    // Requests started a few microtasks later (after an await) register before anything fires.
    if (timers.some((t) => t.active && t.at <= self.end)) await macrotask();
    for (;;) {
      const due = timers.filter((t) => t.active && t.at <= self.end).sort((a, b) => a.at - b.at)[0];
      if (!due) return;
      if ([...inFlight].some((other) => other !== self && other.end < due.at)) {
        await macrotask();
        continue;
      }
      due.active = false;
      for (const other of inFlight) if (!other.settled && other.end >= due.at) other.record.abandoned = true;
      opts.clock.set(Math.max(Date.now(), due.at));
      due.fn();
      await macrotask();
    }
  }

  /** Scriptable's Timer (timeInterval in ms). Whether it fires in a widget process is unconfirmed on a device. */
  class Timer {
    timeInterval = 0;
    repeats = false;
    private entry: TimerEntry | null = null;
    schedule(fn: () => void) {
      if (this.repeats) quirk("a repeating Timer");
      this.entry = { at: Date.now() + this.timeInterval, fn, active: true };
      timers.push(this.entry);
    }
    invalidate() {
      if (this.entry) this.entry.active = false;
    }
    static schedule(timeInterval: number, repeats: boolean, fn: () => void) {
      const timer = new Timer();
      timer.timeInterval = timeInterval;
      timer.repeats = repeats;
      timer.schedule(fn);
      return timer;
    }
  }

  // --- networking -------------------------------------------------------------

  const originOf = (url: string) => /^[a-z]+:\/\/[^/]+/i.exec(url)?.[0] ?? url;

  class Request {
    url: string;
    method = "GET";
    headers: Record<string, string> = {};
    body: unknown = null;
    timeoutInterval = 60;
    response: AnyRecord | null = null;
    allowInsecureRequest = false;
    onRedirect: unknown = null;
    constructor(url: string) {
      this.url = url;
    }
    private async send(): Promise<Uint8Array> {
      const started = Date.now();
      const record: RequestRecord = {
        url: this.url,
        method: this.method,
        headers: { ...this.headers },
        timeoutInterval: this.timeoutInterval,
        outcome: "pending",
      };
      requests.push(record);
      const route = net[this.url];
      let reply: NetReply;
      if (route) {
        reply = typeof route === "function" ? route({ url: this.url, headers: { ...this.headers } }) : route;
      } else if (Object.keys(net).some((key) => originOf(key) === originOf(this.url))) {
        reply = { status: 404, body: "Not Found", mimeType: "text/plain" };
      } else {
        quirk(`unrouted request ${this.url}`);
        reply = { error: "A server with the specified hostname could not be found." };
      }
      const latency = reply.latencyMs ?? 50;
      const timeoutMs = this.timeoutInterval * 1000;
      const timesOut = !reply.trickle && latency > timeoutMs;
      const end = started + (timesOut ? timeoutMs : latency);
      const status = reply.status ?? 200;
      record.outcome = timesOut ? "timeout" : reply.error ? "network" : String(status);
      // Registered before the first await, so requests started together all count when a timer is due.
      const self: InFlight = { end, record, settled: false };
      inFlight.add(self);
      try {
        await Promise.resolve();
        // Timers due before this reply ends fire first; once one has, the script has moved on (a raced deadline),
        // so the abandoned reply settles without moving the clock any further.
        await fireTimers(self);
        // Then replies land in end order: a sibling ending sooner settles (and its caller runs) at its own end.
        while ([...inFlight].some((other) => other !== self && other.end < self.end)) await macrotask();
      } finally {
        // Registered until the next macrotask, so a slower sibling waits until this reply's caller has run (at
        // this reply's end), not just until the reply itself settled.
        self.settled = true;
        setImmediate(() => inFlight.delete(self));
      }
      if (!record.abandoned) opts.clock.set(Math.max(Date.now(), end));
      if (timesOut) throw new Error("The request timed out.");
      if (reply.error) throw new Error(reply.error);
      const bytes = reply.bytes ?? new TextEncoder().encode(reply.body ?? "");
      this.response = {
        url: this.url,
        statusCode: status,
        mimeType: reply.mimeType ?? (reply.bytes ? "image/png" : "application/json"),
        textEncodingName: "utf-8",
        headers: {},
        cookies: [],
      };
      return bytes;
    }
    async load() {
      return new Data(await this.send(), this.url);
    }
    async loadString() {
      return new TextDecoder().decode(await this.send());
    }
    async loadJSON() {
      quirk("loadJSON used (hides HTTP errors, throws on HTML)");
      const text = new TextDecoder().decode(await this.send());
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("The data couldn't be read because it isn't in the correct format.");
      }
    }
    async loadImage() {
      quirk("loadImage used (downscaled to 500 px in widgets)");
      const image = MockImage.fromData(new Data(await this.send(), this.url));
      if (!image) throw new Error("The data couldn't be read because it isn't in the correct format.");
      if (inWidget && Math.max(image.size.width, image.size.height) > 500) {
        const k = 500 / Math.max(image.size.width, image.size.height);
        return new MockImage(new Size(Math.round(image.size.width * k), Math.round(image.size.height * k)), image.source);
      }
      return image;
    }
  }

  // --- files ------------------------------------------------------------------

  const parentOf = (path: string) => path.replace(/\/[^/]+\/?$/, "") || "/";
  const missing = (path: string) => new Error(`The file "${path.split("/").pop()}" couldn't be opened because there is no such file.`);

  class FileManager {
    private constructor(private readonly cloud: boolean) {}
    static local() {
      return new FileManager(false);
    }
    static iCloud() {
      quirk("FileManager.iCloud() used");
      return new FileManager(true);
    }
    documentsDirectory() {
      return DOCUMENTS;
    }
    libraryDirectory() {
      return LIBRARY;
    }
    cacheDirectory() {
      quirk("cacheDirectory() used (not shared between the app and the widget)");
      return CACHES;
    }
    temporaryDirectory() {
      quirk("temporaryDirectory() used (not shared between the app and the widget)");
      return TEMP;
    }
    joinPath(lhs: string, rhs: string) {
      return `${lhs.replace(/\/+$/, "")}/${rhs.replace(/^\/+/, "")}`;
    }
    fileExists(path: string) {
      return fs.files.has(path) || fs.dirs.has(path);
    }
    isDirectory(path: string) {
      return fs.dirs.has(path);
    }
    createDirectory(path: string, intermediate = false) {
      if (!intermediate && !fs.dirs.has(parentOf(path))) throw new Error(`createDirectory: no parent for ${path}`);
      let p = path;
      while (p && p !== "/" && !fs.dirs.has(p)) {
        fs.dirs.add(p);
        p = parentOf(p);
      }
    }
    listContents(path: string) {
      const prefix = `${path.replace(/\/+$/, "")}/`;
      const names = new Set<string>();
      for (const key of [...fs.files.keys(), ...fs.dirs]) {
        if (key.startsWith(prefix) && key.length > prefix.length) names.add(key.slice(prefix.length).split("/")[0]);
      }
      return [...names].sort();
    }
    private file(path: string) {
      const file = fs.files.get(path);
      if (!file) throw missing(path);
      return file;
    }
    read(path: string) {
      const file = this.file(path);
      return new Data(file.bytes, file.origin);
    }
    readString(path: string) {
      return new TextDecoder().decode(this.file(path).bytes);
    }
    readImage(path: string) {
      this.file(path);
      return MockImage.fromFile(path);
    }
    private put(path: string, bytes: Uint8Array, origin: string | null) {
      if (!fs.dirs.has(parentOf(path))) throw new Error(`The folder for "${path}" doesn't exist.`);
      const now = Date.now();
      const previous = fs.files.get(path);
      fs.files.set(path, { bytes, mtime: now, ctime: previous?.ctime ?? now, origin });
    }
    write(path: string, data: Data) {
      if (!(data instanceof Data)) throw new TypeError("write needs Data");
      this.put(path, data.bytes, data.origin);
    }
    writeString(path: string, text: string) {
      this.put(path, new TextEncoder().encode(String(text)), null);
    }
    writeImage(path: string, image: MockImage) {
      this.put(path, fakePng(image.size.width, image.size.height), image.source);
    }
    remove(path: string) {
      if (!fs.files.delete(path)) {
        if (fs.dirs.has(path)) {
          for (const key of [...fs.files.keys()]) if (key.startsWith(`${path}/`)) fs.files.delete(key);
          fs.dirs.delete(path);
        } else throw missing(path);
      }
    }
    move(src: string, dst: string) {
      const file = this.file(src);
      fs.files.delete(src);
      fs.files.set(dst, { ...file, mtime: Date.now() });
    }
    copy(src: string, dst: string) {
      if (fs.files.has(dst)) throw new Error(`"${dst.split("/").pop()}" couldn't be copied because an item with the same name already exists.`);
      fs.files.set(dst, { ...this.file(src) });
    }
    modificationDate(path: string) {
      const file = fs.files.get(path);
      return file ? new Date(file.mtime) : null;
    }
    creationDate(path: string) {
      const file = fs.files.get(path);
      return file ? new Date(file.ctime) : null;
    }
    fileSize(path: string) {
      return this.file(path).bytes.length / 1000;
    }
    fileName(path: string, includeExtension = false) {
      const name = path.split("/").pop() ?? "";
      return includeExtension ? name : name.replace(/\.[^.]+$/, "");
    }
    fileExtension(path: string) {
      return /\.([^./]+)$/.exec(path)?.[1] ?? "";
    }
    isFileStoredIniCloud() {
      return this.cloud;
    }
    isFileDownloaded() {
      return true;
    }
    downloadFileFromiCloud() {
      return Promise.resolve();
    }
  }

  // --- app UI -----------------------------------------------------------------

  class Alert {
    title = "";
    message = "";
    private actions: string[] = [];
    private cancel: string | null = null;
    private fields: { placeholder: string; text: string }[] = [];
    private values: string[] = [];
    addAction(title: string) {
      this.actions.push(title);
    }
    addDestructiveAction(title: string) {
      this.actions.push(title);
    }
    addCancelAction(title: string) {
      this.cancel = title;
    }
    addTextField(placeholder = "", text = "") {
      this.fields.push({ placeholder, text });
    }
    addSecureTextField(placeholder = "", text = "") {
      this.fields.push({ placeholder, text });
    }
    textFieldValue(index: number) {
      return this.values[index] ?? this.fields[index]?.text ?? "";
    }
    private answer(): Promise<number> {
      if (inWidget) throw new Error("Alerts are not supported in widgets.");
      alerts.push({
        title: this.title,
        message: this.message,
        actions: [...this.actions, ...(this.cancel ? [this.cancel] : [])],
        fields: this.fields.map((f) => f.text),
      });
      const next = alertQueue.shift() ?? "cancel";
      if (next === "cancel") return Promise.resolve(-1);
      this.values = next.fields ?? this.fields.map((f) => f.text);
      const index = this.actions.indexOf(next.choose);
      if (index === -1) {
        if (next.choose === this.cancel) return Promise.resolve(-1);
        quirk(`alert answer "${next.choose}" is not an action of "${this.title}"`);
        return Promise.resolve(-1);
      }
      return Promise.resolve(index);
    }
    present() {
      return this.answer();
    }
    presentAlert() {
      return this.answer();
    }
    presentSheet() {
      if (this.fields.length) quirk("text fields don't work in sheets");
      return this.answer();
    }
  }

  const unused = (name: string) =>
    new Proxy(function () {}, {
      get: (_t, key) => {
        if (key === "prototype") return {};
        quirk(`${name} used`);
        return () => null;
      },
      construct: () => {
        quirk(`${name} used`);
        return {};
      },
      apply: () => {
        quirk(`${name} used`);
        return null;
      },
    });

  const Script = {
    name: () => "kylevb-anime",
    setWidget(widget: unknown) {
      setWidgetCalls += 1;
      if (!(widget instanceof ListWidget)) throw new TypeError("setWidget needs a ListWidget");
      shownWidget = toTreeImpl(widget, family);
      inspectShown(shownWidget);
    },
    complete() {
      completeCalls += 1;
    },
    setShortcutOutput() {},
  };

  const config = {
    runsInApp: !inWidget,
    runsInActionExtension: false,
    runsWithSiri: false,
    runsInNotification: false,
    runsFromHomeScreen: false,
    runsInWidget: inWidget,
    runsInAccessoryWidget: accessory,
    widgetFamily: family ?? undefined,
  };

  const args = {
    widgetParameter: opts.mode.kind === "widget" ? (opts.mode.parameter ?? null) || null : null,
    queryParameters: opts.mode.kind === "app" ? { ...(opts.mode.queryParameters ?? {}) } : {},
    plainTexts: [],
    urls: [],
    fileURLs: [],
    images: [],
    shortcutParameter: null,
    notification: null,
  };

  const Device = {
    name: () => device.name,
    systemName: () => "iOS",
    systemVersion: () => "26.0",
    model: () => (device.name.startsWith("iPad") ? "iPad" : "iPhone"),
    isPhone: () => !device.name.startsWith("iPad"),
    isPad: () => device.name.startsWith("iPad"),
    screenSize: () => new Size(device.screen[0], device.screen[1]),
    screenResolution: () => new Size(device.screen[0] * device.scale, device.screen[1] * device.scale),
    screenScale: () => device.scale,
    isUsingDarkAppearance: () => {
      quirk("Device.isUsingDarkAppearance() used");
      if (inWidget) throw new Error("isUsingDarkAppearance is not supported in widgets.");
      return true;
    },
    locale: () => "en_US",
    language: () => "en",
    preferredLanguages: () => ["en-US"],
  };

  const URLScheme = {
    forRunningScript: () => "scriptable:///run/kylevb-anime",
    forOpeningScript: () => "scriptable:///open/kylevb-anime",
    forOpeningScriptSettings: () => "scriptable:///open/kylevb-anime?openSettings=true",
  };

  const capture = (prefix: string) => (...parts: unknown[]) => {
    logs.push(prefix + parts.map((p) => (typeof p === "string" ? p : p instanceof Error ? p.message : JSON.stringify(p))).join(" "));
  };

  const globals: Record<string, unknown> = {
    ListWidget,
    WidgetStack,
    WidgetText,
    WidgetDate,
    WidgetImage,
    WidgetSpacer,
    Color,
    Font,
    LinearGradient,
    Point,
    Size,
    Rect,
    Image: MockImage,
    Data,
    Request,
    FileManager,
    Script,
    config,
    args,
    Device,
    Alert,
    URLScheme,
    UUID: { string: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}` },
    SFSymbol: unused("SFSymbol"),
    Keychain: unused("Keychain"),
    Timer,
    Safari: unused("Safari"),
    DateFormatter: unused("DateFormatter"),
    RelativeDateTimeFormatter: unused("RelativeDateTimeFormatter"),
    DrawContext: unused("DrawContext"),
    Path: unused("Path"),
    log: capture(""),
    logWarning: capture("warn: "),
    logError: capture("error: "),
    console: { log: capture(""), warn: capture("warn: "), error: capture("error: ") },
    atob: atobImpl,
    btoa: btoaImpl,
    module: moduleObject,
    importModule: () => {
      quirk("importModule used");
      throw new Error("importModule: no such module");
    },
  };
  for (const name of [
    "fetch",
    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",
    "queueMicrotask",
    "URL",
    "URLSearchParams",
    "TextEncoder",
    "TextDecoder",
    "Intl",
    "structuredClone",
    "window",
    "document",
    "navigator",
    "localStorage",
    "process",
    "require",
    "Buffer",
    "global",
    "globalThis",
  ]) {
    globals[name] = undefined;
  }

  return {
    globals,
    result: () => {
      if (inWidget && setWidgetCalls !== 1) quirk(`Script.setWidget called ${setWidgetCalls} times in a widget run`);
      if (completeCalls !== 1) quirk(`Script.complete called ${completeCalls} times`);
      return {
      widget: shownWidget,
      presented,
      requests,
      setWidgetCalls,
      completeCalls,
      logs,
      alerts,
      fs,
      exports: moduleObject.exports,
      elapsedMs: Date.now() - opts.nowMs,
      quirks,
      };
    },
  };
}
