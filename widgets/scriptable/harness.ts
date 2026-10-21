/**
 * Runs the real widgets/scriptable/kylevb-anime.js inside the mock runtime (mockRuntime.ts) under vitest:
 * the source is wrapped in an AsyncFunction whose parameters are Scriptable's globals (so top-level await
 * works and Web APIs are shadowed), in this realm, so the script's Date is vitest's fake clock.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { vi } from "vitest";
import { createRuntime, type RunResult, type RuntimeOptions } from "./mockRuntime";

export const SCRIPT_SOURCE = readFileSync(new URL("./kylevb-anime.js", import.meta.url), "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...params: string[]
) => (...values: unknown[]) => Promise<unknown>;

export interface RunOptions extends Omit<RuntimeOptions, "clock"> {
  /** Changes the globals before the run (e.g. a method that throws). */
  patch?: (globals: Record<string, any>) => void;
  /** Another source run the same way (a probe of what the script would see); defaults to the script. */
  source?: string;
}

// The ES builtins: eslint-config-next's own globals table, like eslint.config.mjs's Scriptable block (resolved from
// that package, so its pinned copy when it has one; Node falls back to a hoisted copy otherwise).
const requireHere = createRequire(import.meta.url);
const ES_BUILTINS: ReadonlySet<string> = new Set(
  Object.keys(createRequire(requireHere.resolve("eslint-config-next"))("globals").builtin)
);
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Every global of this Node realm that isn't an ES builtin or one of Scriptable's (performance, crypto,
 * setImmediate, AbortController…): the script sees undefined, as on the phone.
 */
export function realmOnlyGlobals(provided: Record<string, unknown>): string[] {
  return Object.getOwnPropertyNames(globalThis).filter(
    (name) => IDENTIFIER.test(name) && !ES_BUILTINS.has(name) && !(name in provided) && name !== "eval" && name !== "arguments"
  );
}

export async function runScript({ patch, source = SCRIPT_SOURCE, ...opts }: RunOptions): Promise<RunResult> {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(opts.nowMs);
  const runtime = createRuntime({ ...opts, clock: { set: (ms) => vi.setSystemTime(ms) } });
  patch?.(runtime.globals);
  for (const name of realmOnlyGlobals(runtime.globals)) runtime.globals[name] = undefined;
  const names = Object.keys(runtime.globals);
  await new AsyncFunction(...names, source)(...names.map((name) => runtime.globals[name]));
  return runtime.result();
}

/** The script's pure helpers (module.exports), from an app run whose menu is cancelled. */
export async function scriptExports(nowMs = Date.UTC(2026, 9, 15, 14, 5)): Promise<Record<string, unknown>> {
  return (await runScript({ mode: { kind: "app", alerts: [] }, nowMs })).exports;
}
