import Image from "next/image";
import { airingStatusLabel, formatAirDate, nextAiring, premiereLabel } from "@/lib/anime/airing";
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

/** Compact rows for list entries without an upcoming episode. */
export default function NotAiringList({ entries }: { entries: ListEntry[] }) {
  return (
    <ul className="divide-y divide-[rgb(53,53,53)] overflow-hidden rounded-md border border-[rgb(53,53,53)] bg-[rgb(30,30,30)]">
      {entries.map((entry) => {
        const title = displayTitle(entry);
        const cover = entry.coverImage?.medium || entry.coverImage?.large;
        return (
          <li key={entry.id} className="flex min-w-0 items-center gap-3 p-2">
            {cover ? (
              <Image
                src={cover}
                alt={`${title} cover`}
                width={40}
                height={56}
                className="h-14 w-10 shrink-0 rounded-sm object-cover"
              />
            ) : (
              <div aria-hidden className="h-14 w-10 shrink-0 rounded-sm bg-[rgb(53,53,53)]" />
            )}
            <div className="min-w-0 flex-1">
              <a
                href={`https://anilist.co/anime/${entry.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block break-words rounded-sm text-white hover:text-[#95ccff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] md:truncate"
              >
                {title}
                <span className="sr-only"> (AniList, opens in a new tab)</span>
              </a>
              <p className="break-words text-xs text-[rgb(164,164,164)] md:truncate">
                {LIST_STATUS_LABELS[entry.userData.listType]} · {scheduleNote(entry)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
