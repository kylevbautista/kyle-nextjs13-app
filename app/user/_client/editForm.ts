/**
 * Edit dialog form state <-> UserAnimeData. Inputs are kept as strings so a
 * field can be empty while the user types; parsing happens on Save.
 */
import type { ListStatus, UserAnimeData } from "@/lib/anime/types";

export interface EditFormValues {
  status: ListStatus;
  progress: string;
  score: string;
  /** "YYYY-MM-DD" (UTC calendar date) or "". */
  startDate: string;
  finishDate: string;
}

export type EditFormField = "progress" | "score" | "startDate" | "finishDate";
export type EditFormErrors = Partial<Record<EditFormField, string>>;

const DATE_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Epoch ms → value for <input type="date"> (UTC calendar date). */
export function msToDateInput(ms: number | null | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "";
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  const iso = date.toISOString().slice(0, 10);
  return DATE_INPUT_RE.test(iso) ? iso : "";
}

/** <input type="date"> value → epoch ms at UTC midnight; null when empty/invalid. */
export function dateInputToMs(value: string): number | null {
  const match = DATE_INPUT_RE.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const ms = Date.UTC(year, month - 1, day);
  // Reject rollovers such as 2026-02-31.
  return msToDateInput(ms) === `${match[1]}-${match[2]}-${match[3]}` ? ms : null;
}

export const formValuesFrom = (userData: UserAnimeData): EditFormValues => ({
  status: userData.listType,
  progress: String(userData.episodeProgressNumber),
  score: userData.score === null ? "" : String(userData.score),
  startDate: msToDateInput(userData.startDate),
  finishDate: msToDateInput(userData.finishDate),
});

export type EditFormResult =
  | { ok: true; userData: UserAnimeData }
  | { ok: false; errors: EditFormErrors };

/**
 * Validates the form. Dates the user did not touch keep their original
 * timestamp (the server stores auto-set dates with a time of day).
 */
export function parseEditForm(
  values: EditFormValues,
  { episodes, initial }: { episodes: number | null; initial: UserAnimeData }
): EditFormResult {
  const errors: EditFormErrors = {};
  const total = episodes && episodes > 0 ? episodes : null;

  const progressText = values.progress.trim();
  const progress = Number(progressText);
  if (progressText === "" || !Number.isInteger(progress) || progress < 0) {
    errors.progress = "Enter a whole number of episodes (0 or more).";
  } else if (total !== null && progress > total) {
    errors.progress = `This show has ${total} episode${total === 1 ? "" : "s"}.`;
  }

  const scoreText = values.score.trim();
  let score: number | null = null;
  if (scoreText !== "") {
    const parsed = Number(scoreText);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
      errors.score = "Score must be between 0 and 10.";
    } else {
      score = Math.round(parsed * 10) / 10;
    }
  }

  const parseDate = (field: "startDate" | "finishDate"): number | null => {
    const text = values[field].trim();
    if (text === "") return null;
    if (text === msToDateInput(initial[field])) return initial[field];
    const ms = dateInputToMs(text);
    if (ms === null) errors[field] = "Enter a valid date.";
    return ms;
  };
  const startDate = parseDate("startDate");
  const finishDate = parseDate("finishDate");
  if (
    !errors.startDate &&
    !errors.finishDate &&
    startDate !== null &&
    finishDate !== null &&
    values.finishDate < values.startDate
  ) {
    errors.finishDate = "The finish date can't be before the start date.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    userData: {
      listType: values.status,
      episodeProgressNumber: progress,
      score,
      startDate,
      finishDate,
    },
  };
}
