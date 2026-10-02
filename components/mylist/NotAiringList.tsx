import Image from "next/image";
import { airingStatusLabel, formatAirDate, nextAiring, premiereLabel } from "@/lib/anime/airing";
import { STATUS_DOT_CLASS } from "@/lib/anime/statusBadge";
import { LIST_STATUS_LABELS, displayTitle, type ListEntry } from "@/lib/anime/types";

/** ICU versions differ on U+202F / U+00A0 before AM/PM; keep SSR and browser text identical. */
const plainSpaces = (text: string) => text.replace(/[  ]/g, " ");

function scheduleNote(entry: ListEntry) {
  // Marked completed while episodes are still scheduled.
  const next = nextAiring(entry);
  if (next) {
    const when = plainSpaces(formatAirDate(next.airingAt));
    return next.episode ? `Ep ${next.episode} airs ${when}` : `Next episode ${when}`;
  }
  if (entry.status === "NOT_YET_RELEASED") {
    const premiere = plainSpaces(premiereLabel(entry));
    return premiere === "Premiere TBA" ? premiere : `Premieres ${premiere}`;
  }
  return airingStatusLabel(entry);
}

/** Compact rows for list entries without an upcoming episode (inside a panel). */
export default function NotAiringList({ entries }: { entries: ListEntry[] }) {
  return (
    <ul className="flex flex-col divide-y divide-[rgb(53,53,53)]">
      {entries.map((entry) => {
        const title = displayTitle(entry);
        const cover = entry.coverImage?.medium || entry.coverImage?.large;
        const status = entry.userData.listType;
        return (
          <li key={entry.id} className="flex min-w-0 items-center gap-3 px-1 py-2">
            <div
              className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[rgb(53,53,53)]"
              style={entry.coverImage?.color ? { backgroundColor: entry.coverImage.color } : undefined}
            >
              {cover && (
                <Image
                  src={cover}
                  alt=""
                  width={40}
                  height={56}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <a
                href={`https://anilist.co/anime/${entry.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="line-clamp-2 break-words rounded-sm text-sm font-semibold text-white hover:text-[#95ccff] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
              >
                <span title={title}>{title}</span>
                <span className="sr-only"> (AniList, opens in a new tab)</span>
              </a>
              <p className="flex min-w-0 items-start gap-1.5 text-xs text-[rgb(164,164,164)]">
                <span aria-hidden="true" className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`} />
                <span className="min-w-0 break-words">
                  {LIST_STATUS_LABELS[status]} · {scheduleNote(entry)}
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
