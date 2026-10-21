import { createRequire } from "node:module";
import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// The globals tables eslint-config-next itself uses, so the Scriptable block turns off exactly what the preset turns
// on (resolved from that package: its own pinned copy, else Node's fallback to a hoisted one).
const globals = createRequire(createRequire(import.meta.url).resolve("eslint-config-next"))("globals");

/** What Scriptable's JavaScriptCore gives the iPhone widget's script (widgets/scriptable, CLAUDE.md §9.26). */
const SCRIPTABLE_GLOBALS = Object.fromEntries(
  [
    "Alert",
    "args",
    "atob",
    "btoa",
    "Color",
    "config",
    "console",
    "Data",
    "Device",
    "FileManager",
    "Font",
    "Image",
    "importModule",
    "LinearGradient",
    "ListWidget",
    "log",
    "logError",
    "logWarning",
    "module",
    "Point",
    "Rect",
    "Request",
    "Script",
    "Size",
    "Timer",
    "URLScheme",
    "UUID",
    "WidgetDate",
    "WidgetImage",
    "WidgetSpacer",
    "WidgetStack",
    "WidgetText",
  ].map((name) => [name, "readonly"])
);
/**
 * Every browser and Node global eslint-config-next enables is "off" for the script (no-undef reports it), so only
 * the ES builtins and SCRIPTABLE_GLOBALS (spread last: console, atob and Image are in both) remain: an allowlist.
 * The names below are listed again for readers; JavaScriptCore has none of them.
 */
const NOT_IN_SCRIPTABLE = Object.fromEntries(
  [
    ...Object.keys({ ...globals.browser, ...globals.node, ...globals.nodeBuiltin }),
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
  ].map((name) => [name, "off"])
);

export default defineConfig([
  globalIgnores([".next/**", "node_modules/**"]),
  { extends: [...nextCoreWebVitals] },
  {
    files: ["widgets/scriptable/**/*.js"],
    languageOptions: { globals: { ...NOT_IN_SCRIPTABLE, ...SCRIPTABLE_GLOBALS } },
    rules: {
      "no-undef": "error",
      "no-restricted-properties": [
        "error",
        { property: "loadImage", message: "Widgets downscale loadImage() to 500 px: use load() + Image.fromData()." },
        { property: "loadJSON", message: "loadJSON hides HTTP errors and throws on HTML: use loadString() + statusCode." },
        { object: "FileManager", property: "iCloud", message: "Use FileManager.local(): iCloud reads stall or fail." },
        { object: "Device", property: "isUsingDarkAppearance", message: "Not supported in widgets: use Color.dynamic()." },
        { property: "applyTimeStyle", message: "Prints the device's zone; the widget's times say PT (server labels)." },
        { property: "applyDateStyle", message: "Prints the device's zone; the widget's dates say PT (server labels)." },
        { property: "applyRelativeStyle", message: "No direction words and unknown width: use the timer + the when-line." },
        { property: "applyOffsetStyle", message: "Its sign reads backwards (future = minus): not in v1." },
        { property: "toLocaleString", message: "Device locale and zone: the server formats every label." },
        { property: "toLocaleDateString", message: "Device locale and zone: the server formats every label." },
        { property: "toLocaleTimeString", message: "Device locale and zone: the server formats every label." },
      ],
    },
  },
]);
