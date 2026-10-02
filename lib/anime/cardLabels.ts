/**
 * Labels for the anime cards (components/theme/AnimeInfoCard.tsx, the
 * classic layout, and AnimeCard.tsx, the poster) and their details sheet
 * (components/theme/AnimeDetailsDialog.tsx). Pure, so the season page,
 * /search and the landing print identical text, and the tests pin down the
 * rule that a card face never claims "TBA", "N/A" or "? eps": a field AniList
 * doesn't have is null and left out, and the sheet says plainly that AniList
 * doesn't list it.
 */
import { formatAirDate, nextAiring, premiereAiring, premiereLabel } from "./airing";
import type { AnimeMedia } from "./types";
import { formatLabel, seasonLabel } from "@/lib/landing";

type CardMedia = Pick<
  AnimeMedia,
  | "status"
  | "format"
  | "episodes"
  | "duration"
  | "source"
  | "genres"
  | "averageScore"
  | "studios"
  | "startDate"
  | "season"
  | "seasonYear"
  | "upComingAirDate"
  | "upcomingEpisode"
  | "firstEpisode"
>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** AniList's start date as written ("Nov 13, 2026", "Nov 2026", "2027"); null without a year. */
function startDateText({ year, month, day }: CardMedia["startDate"]): string | null {
  if (!year) return null;
  if (!month) return String(year);
  return day ? `${MONTHS[month - 1]} ${day}, ${year}` : `${MONTHS[month - 1]} ${year}`;
}

const isMovie = (media: Pick<CardMedia, "format">) => media.format === "MOVIE";
/** A one-part movie: no "Episodes" row, and "110 min" rather than "per episode". */
export const isSinglePartMovie = (media: Pick<CardMedia, "format" | "episodes">) =>
  isMovie(media) && (media.episodes === null || media.episodes <= 1);

/** Number + unit, kept on one line ("12 × 24 min" breaks as "12 ×" / "24 min"). */
const NBSP = "\u00A0";
const eps = (n: number) => `${n}${NBSP}${n === 1 ? "ep" : "eps"}`;

/**
 * The release status when no episode is scheduled, as a kind and a detail
 * ("Finished" / "28 eps"): the classic card's HUD shows them on two lines,
 * the poster's chip joins them (cardStatusLabel). Never "TBA": a date AniList
 * doesn't have is "not listed".
 */
export function cardStatusParts(media: CardMedia): { kind: string; detail: string | null } {
  switch (media.status) {
    case "FINISHED":
      if (isSinglePartMovie(media)) return { kind: "Released", detail: null };
      return { kind: "Finished", detail: media.episodes ? eps(media.episodes) : null };
    case "RELEASING":
      return { kind: "Airing", detail: "next date not listed" };
    case "NOT_YET_RELEASED":
      return { kind: "Premiere", detail: startDateText(media.startDate) ?? "date not listed" };
    case "HIATUS":
      return { kind: "On hiatus", detail: null };
    case "CANCELLED":
      return { kind: "Cancelled", detail: null };
    default:
      return { kind: "Schedule unknown", detail: null };
  }
}

/** The poster card's chip when no episode is scheduled: "Finished · 28 eps". */
export function cardStatusLabel(media: CardMedia): string {
  const { kind, detail } = cardStatusParts(media);
  return detail ? `${kind} · ${detail}` : kind;
}

/** First main studio's name, if AniList lists one. */
const firstStudio = (media: Pick<CardMedia, "studios">) =>
  media.studios?.nodes?.find((node) => node?.name)?.name ?? null;

/** The card's meta line: "★ 7.6 · TV · CloverWorks". Unknown parts are left out. */
export function cardMeta(media: CardMedia): { score: string | null; rest: string } {
  return {
    score: media.averageScore ? (media.averageScore / 10).toFixed(1) : null,
    rest: [formatLabel(media.format), firstStudio(media)].filter(Boolean).join(" · "),
  };
}

/** Up to three genres, "Action · Drama · History"; "" without any. */
export const genresLine = (media: Pick<CardMedia, "genres">) =>
  (media.genres ?? []).filter(Boolean).slice(0, 3).join(" · ");

/** "LIGHT_NOVEL" → "Light Novel"; null without a source. */
export function formatSource(source: string | null | undefined): string | null {
  if (!source) return null;
  return source
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Every main studio, "MAPPA × Studio Bind"; null without one. */
export function studiosLabel(media: Pick<CardMedia, "studios">): string | null {
  const names = (media.studios?.nodes ?? []).map((node) => node?.name).filter(Boolean);
  return names.length ? names.join(" × ") : null;
}

/** Every genre AniList lists, in its order (the classic card's chips). */
export const allGenres = (media: Pick<CardMedia, "genres">) => (media.genres ?? []).filter(Boolean);

/** The classic card's Studio row: "Studio" / "Studios" + "MAPPA × Studio Bind"; null without one. */
export function studioFact(media: Pick<CardMedia, "studios">): { term: "Studio" | "Studios"; value: string } | null {
  const value = studiosLabel(media);
  if (!value) return null;
  const count = (media.studios?.nodes ?? []).filter((node) => node?.name).length;
  return { term: count > 1 ? "Studios" : "Studio", value };
}

/**
 * The classic card's Premiere row: the first episode's date and time (PT)
 * when AniList has it, else its start date as written; null without a year.
 */
export function premiereParts(media: CardMedia): { date: string; time: string | null } | null {
  const first = premiereAiring(media)?.airingAt;
  if (first) {
    const text = formatAirDate(first); // "Oct 2, 2026, 9:53 AM PDT"
    const cut = text.lastIndexOf(", ");
    return cut > 0 ? { date: text.slice(0, cut), time: text.slice(cut + 2) } : { date: text, time: null };
  }
  const date = startDateText(media.startDate);
  return date ? { date, time: null } : null;
}

/**
 * The classic card's Episodes cell: "12 × 24 min", "12 eps", "25 min each"
 * (long runners), or "Length 110 min" for a one-part movie; null when AniList
 * has neither count nor length.
 */
export function episodesFact(media: CardMedia): { term: "Episodes" | "Length"; value: string } | null {
  const minutes = media.duration ? `${media.duration}${NBSP}min` : null;
  if (isSinglePartMovie(media)) return minutes ? { term: "Length", value: minutes } : null;
  // Breaks only after the "×" ("12 ×" / "24 min"), never inside a number + unit.
  if (media.episodes && minutes) return { term: "Episodes", value: `${media.episodes}${NBSP}× ${minutes}` };
  if (media.episodes) return { term: "Episodes", value: eps(media.episodes) };
  if (minutes) return { term: "Episodes", value: `${minutes} each` };
  return null;
}

/** The next episode's number when AniList numbers past the listed count (a second cour: EP 13 of 12). */
export function nextNumberedPast(media: CardMedia): number | null {
  const next = nextAiring(media)?.episode;
  return media.episodes && next && next > media.episodes ? next : null;
}

/** The classic card's note under the readout, when AniList numbers past the count. */
export function numberingNote(media: CardMedia): string | null {
  const n = nextNumberedPast(media);
  return n ? `AniList numbers the next one EP ${n}.` : null;
}

/** The cover's pill: "★ 8.2 · TV"; null when AniList has neither. */
export function scorePill(media: CardMedia): { score: string | null; format: string | null } | null {
  const score = media.averageScore ? (media.averageScore / 10).toFixed(1) : null;
  const format = formatLabel(media.format);
  return score || format ? { score, format } : null;
}

/** The synopsis line when AniList has none (the card and the sheet). */
export const NO_SYNOPSIS = "AniList has no synopsis for this show.";

/**
 * The card's colors from its cover: the hover glow always; for a #rrggbb
 * cover color also the readout tint and the border's warm end. Hex alpha,
 * not color-mix(): a var() inside an unsupported function would invalidate
 * the whole background.
 */
export function coverTint(color: string | null | undefined): Record<string, string> {
  const vars: Record<string, string> = { "--card-glow": color ?? "rgba(93,174,241,.55)" };
  if (color && /^#[0-9a-f]{6}$/i.test(color)) {
    vars["--card-tint"] = `${color}2b`;
    vars["--card-edge"] = `${color}73`;
  }
  return vars;
}

/** What the sheet prints for a field AniList doesn't have yet. */
export const unknownText = (media: Pick<CardMedia, "status">) =>
  media.status === "NOT_YET_RELEASED" ? "TBA" : "Not listed on AniList";

export interface SheetFact {
  term: string;
  value: string;
}

/** The details sheet's facts, in display order. */
export function sheetFacts(media: CardMedia, continuing: boolean): SheetFact[] {
  const unknown = unknownText(media);
  const facts: SheetFact[] = [];
  const premiere = premiereLabel(media);
  facts.push({ term: "Premiere", value: premiere === "Premiere TBA" ? unknown : premiere });
  facts.push({ term: "Format", value: formatLabel(media.format) ?? unknown });

  if (!isSinglePartMovie(media)) {
    let value = media.episodes ? String(media.episodes) : unknown;
    // AniList sometimes numbers a second cour on from the first (EP 13 of a 12-episode entry).
    const past = nextNumberedPast(media);
    if (past) value += ` · AniList numbers the next one EP ${past}`;
    facts.push({ term: "Episodes", value });
  }

  facts.push({
    term: "Length",
    value: media.duration
      ? isSinglePartMovie(media)
        ? `${media.duration} min`
        : `${media.duration} min per episode`
      : unknown,
  });
  facts.push({ term: "Source", value: formatSource(media.source) ?? unknown });

  const studios = studiosLabel(media);
  const studioCount = (media.studios?.nodes ?? []).filter((node) => node?.name).length;
  facts.push({ term: studioCount > 1 ? "Studios" : "Studio", value: studios ?? unknown });

  facts.push({
    term: "AniList score",
    value: media.averageScore ? `${(media.averageScore / 10).toFixed(1)} / 10` : "No AniList score",
  });

  const genres = (media.genres ?? []).filter(Boolean);
  facts.push({ term: "Genres", value: genres.length ? genres.join(", ") : unknown });

  const from = continuing ? seasonLabel(media.season, media.seasonYear ?? media.startDate.year) : null;
  if (from) facts.push({ term: "Continuing", value: `Started ${from}` });
  return facts;
}

export interface ExternalLink {
  site: "AniList" | "MyAnimeList" | "Crunchyroll";
  url: string;
}

const isHttpUrl = (url: string | null | undefined): url is string => !!url && /^https?:\/\//i.test(url);

/** The classic card's footer order (the owner's): MyAnimeList, AniList, Crunchyroll. */
const FOOTER_ORDER: Record<ExternalLink["site"], number> = { MyAnimeList: 0, AniList: 1, Crunchyroll: 2 };
export const footerLinks = (media: Pick<AnimeMedia, "id" | "idMal" | "externalLinks">) =>
  externalLinks(media).sort((a, b) => FOOTER_ORDER[a.site] - FOOTER_ORDER[b.site]);

/** AniList always; MyAnimeList with a MAL id; Crunchyroll when AniList links an http(s) page. */
export function externalLinks(media: Pick<AnimeMedia, "id" | "idMal" | "externalLinks">): ExternalLink[] {
  const links: ExternalLink[] = [{ site: "AniList", url: `https://anilist.co/anime/${media.id}` }];
  if (media.idMal) links.push({ site: "MyAnimeList", url: `https://myanimelist.net/anime/${media.idMal}` });
  const crunchyroll = (media.externalLinks ?? []).find(
    (link) => link?.site === "Crunchyroll" && isHttpUrl(link.url)
  )?.url;
  if (crunchyroll) links.push({ site: "Crunchyroll", url: crunchyroll });
  return links;
}

/** What an add or remove from the details sheet did. */
export type AnimeActionResult = { op: "add" | "remove"; ok: boolean };

/** The sheet's own line for an add/remove made inside it (its status speaks it). */
export function sheetActionText({ op, ok }: AnimeActionResult): { kind: "Answer" | "Warning"; text: string } {
  if (ok) return { kind: "Answer", text: op === "add" ? "Added to your list." : "Removed from your list." };
  return {
    kind: "Warning",
    text: op === "add" ? "Couldn't add it to your list. Try again." : "Couldn't remove it from your list. Try again.",
  };
}
