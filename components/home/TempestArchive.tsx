import Image from "next/image";
import rimuru from "@/public/rimuru.png";
import type { LandingTempest, TempestEntry } from "@/lib/landing";
import {
  CHAPTER_SUB_CLASS,
  CHAPTER_TITLE_CLASS,
  EYEBROW_CLASS,
  FOCUS_RING,
  SAGE_FRAME,
  SageLine,
} from "./SageLine";
import TempestShelf from "./TempestShelf";

const ARROW_DOTS = ["#95ccff", "#a3c4fe", "#afbefe", "#bab9fd", "#c4b5fd"];

const FACTS: { term: string; detail: string; compact: boolean }[] = [
  { term: "Previous life", detail: "Satoru Mikami, 37, a salaryman in Tokyo", compact: true },
  { term: "Reborn as", detail: "a slime in a cave, next to the sealed Storm Dragon", compact: false },
  { term: "Unique skills", detail: "Great Sage, Predator", compact: true },
  { term: "Named by", detail: "Veldora the Storm Dragon, sharing the surname Tempest", compact: false },
  {
    term: "Occupation",
    detail: "Ruler of the Jura Tempest Federation. Demon Lord. Mascot of this website.",
    compact: true,
  },
];

/** "A (Spring 2027)", "A (…) and B (…)", "A, B and C". */
function upcomingList(entries: TempestEntry[]) {
  const names = entries.map((e) => (e.seasonLabel ? `${e.shortLabel} (${e.seasonLabel})` : e.shortLabel));
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function CornerBrackets() {
  const corner = "absolute h-3 w-3 border-[#95ccff]";
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className={`${corner} -left-px -top-px rounded-tl-md border-l-2 border-t-2`} />
      <span className={`${corner} -right-px -top-px rounded-tr-md border-r-2 border-t-2`} />
      <span className={`${corner} -bottom-px -left-px rounded-bl-md border-b-2 border-l-2`} />
      <span className={`${corner} -bottom-px -right-px rounded-br-md border-b-2 border-r-2`} />
    </span>
  );
}

/**
 * The Tempest Archive: the Tensura band behind the site's theme. The S1
 * banner, an "Analyze" card with the slime → Rimuru evolution chart, the
 * upcoming-entries callout, and the franchise shelf. Official art comes only
 * from AniList's CDN (plus the site's existing /rimuru.png mascot).
 */
export default function TempestArchive({ tempest }: { tempest: LandingTempest }) {
  const { bannerUrl, portraitUrl, characterUrl, entries, live } = tempest;
  const upcoming = entries.filter((entry) => entry.upcoming);

  return (
    <section
      id="tempest"
      aria-labelledby="tempest-title"
      className="relative isolate scroll-mt-20 overflow-hidden [contain:inline-size] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(93,174,241,.06),transparent_75%)]"
    >
      {/* The banner fades in at the top too, so the band never starts on a hard edge. */}
      <div
        aria-hidden="true"
        className="relative h-[180px] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_24%,black_45%,transparent)] [mask-image:linear-gradient(to_bottom,transparent,black_24%,black_45%,transparent)] sm:h-[280px]"
      >
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt=""
            fill
            sizes="100vw"
            loading="lazy"
            fetchPriority="low"
            className="object-cover object-[50%_30%] opacity-35"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(93,174,241,.16),transparent_70%)]" />
        )}
      </div>

      <div className="relative mx-auto -mt-20 max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          {/* Analyze card: horizontal and compact below lg, the full chart on lg. */}
          <div
            data-reveal=""
            className="relative rounded-xl border border-[#95ccff]/30 bg-[#0a1528]/85 p-4 shadow-[0_0_40px_-12px_rgba(149,204,255,.45)] sm:p-5"
          >
            <CornerBrackets />
            <div className="flex gap-4 lg:flex-col lg:gap-5">
              <div className="flex shrink-0 items-end gap-3 self-start lg:self-auto lg:justify-between">
                <figure
                  className={`flex-col items-center gap-2 ${portraitUrl ? "hidden lg:flex" : "flex"} ${
                    portraitUrl ? "" : "lg:mx-auto"
                  }`}
                >
                  <div className="relative flex h-[76px] w-[96px] items-end justify-center">
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-6 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(149,204,255,.45),transparent_70%)]"
                    />
                    <Image
                      src={rimuru}
                      alt="Rimuru in slime form, the kylevb mascot"
                      width={96}
                      height={68}
                      className="relative h-[68px] w-[96px]"
                    />
                  </div>
                  <figcaption className="font-mono text-[11px] text-[rgb(164,164,164)]">Slime form</figcaption>
                </figure>

                {portraitUrl && (
                  <>
                    <div aria-hidden="true" className="mb-12 hidden items-center gap-1.5 lg:flex">
                      {ARROW_DOTS.map((color, index) => (
                        <span
                          key={color}
                          className="h-1 w-1 rounded-full animate-dot-flow"
                          style={{ backgroundColor: color, animationDelay: `${index * 0.2}s` }}
                        />
                      ))}
                    </div>
                    <figure className="flex flex-col items-center gap-2">
                      <div className="tempest-sheen relative h-[108px] w-[72px] overflow-hidden rounded-xl bg-[rgb(38,38,38)] shadow-[0_0_40px_-10px_rgba(149,204,255,.5)] ring-2 ring-[#95ccff]/40 lg:h-[156px] lg:w-[104px]">
                        <Image
                          src={portraitUrl}
                          alt="Rimuru Tempest, character art from AniList"
                          width={104}
                          height={156}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <figcaption className="hidden font-mono text-[11px] text-[rgb(164,164,164)] lg:block">
                        Rimuru Tempest
                      </figcaption>
                    </figure>
                  </>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`inline-flex max-w-full px-2.5 py-1.5 text-xs sm:text-[13px] ${SAGE_FRAME}`}>
                  <span className="min-w-0">
                    <span className="sr-only">Great Sage analysis: </span>
                    <span aria-hidden="true" className="mr-1.5 text-[#95ccff]">
                      《Analyze》
                    </span>
                    Rimuru Tempest (<span lang="ja">リムル・テンペスト</span>)
                  </span>
                </p>
                <dl className="mt-3 flex flex-col gap-2 text-xs leading-5 sm:text-[13px]">
                  {FACTS.map((fact) => (
                    <div key={fact.term} className={fact.compact ? "" : "hidden sm:block"}>
                      <dt className="inline font-semibold text-[#95ccff]">{fact.term}: </dt>
                      <dd className="inline text-[rgb(200,206,218)]">{fact.detail}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs italic text-[rgb(164,164,164)] sm:text-[13px]">
                  Named monsters evolve.
                </p>
                <a
                  href={characterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-1 inline-flex min-h-11 items-center rounded text-xs font-semibold text-[#95ccff] underline-offset-2 hover:text-white hover:underline sm:text-[13px] ${FOCUS_RING}`}
                >
                  Rimuru Tempest on AniList
                  <span aria-hidden="true">&nbsp;↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div data-reveal="">
              <p className={EYEBROW_CLASS}>Archive · Jura Tempest Federation</p>
              <SageLine kind="Notice" scan="reveal" className="mt-4">
                Record found: That Time I Got Reincarnated as a Slime.
              </SageLine>
              <h2 id="tempest-title" className={`mt-5 ${CHAPTER_TITLE_CLASS}`}>
                The slime that started it all.
              </h2>
              <p className={`mt-4 max-w-2xl ${CHAPTER_SUB_CLASS}`}>
                kylevb&apos;s mascot has always been Rimuru. Catch up on every season, then line up
                what&apos;s next.
              </p>
            </div>

            {upcoming.length > 0 && (
              <div className="mt-6 rounded-xl border border-[#95ccff]/25 bg-[#0a1528]/70 p-4">
                <p className="font-mono text-[13px] leading-6 text-[#cfe8ff]">
                  <span className="sr-only">Great Sage notice: </span>
                  <span aria-hidden="true" className="mr-1.5 text-[#95ccff]">
                    《Notice》
                  </span>
                  New entries detected: {upcomingList(upcoming)}.
                </p>
                <p className="mt-1 text-sm leading-6 text-[rgb(200,206,218)]">
                  Add them now. Their countdowns show up on your list as soon as AniList schedules
                  episode 1.
                </p>
              </div>
            )}

            <div className="mt-8">
              <TempestShelf entries={entries} live={live} />
            </div>

            <p className="mt-4 text-xs leading-5 text-[rgb(164,164,164)]">
              Fan-made. kylevb isn&apos;t affiliated with the Tensura anime, its creators or publishers.
              Images and data from AniList.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
