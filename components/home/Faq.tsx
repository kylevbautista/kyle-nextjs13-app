import FaqAnalytics from "./FaqAnalytics";
import { MagicCircle } from "./NightSky";
import { CHAPTER_TITLE_CLASS, FOCUS_RING } from "./SageLine";
import Slime from "./Slime";

/**
 * Objections, answered honestly, right before the final ask. Every claim is
 * checked against CLAUDE.md (Google-only sign-in, first name only for
 * visitors, email never rendered, no ads or emails, 10-minute air-date
 * refresh, Pacific Time, no private lists, no import). Update "visibility"
 * and "import" if private lists or import ship.
 */
const QUESTIONS = [
  {
    q: "free",
    question: "Is it really free?",
    answer:
      "Yes. No ads, no premium tier, nothing to buy. It's a fan-built tracker running on AniList's public data.",
  },
  {
    q: "google",
    question: "What happens when I sign in with Google?",
    answer:
      "Your list is created, and that's it. Google shares your name, email address and profile photo so the site can recognize you next time. Nothing is posted anywhere, no emails are sent, and your email is never shown on the site. Google is the only sign-in option right now.",
  },
  {
    q: "visibility",
    question: "Who can see my list?",
    answer:
      "Anyone you give the link to. Your list has its own URL so friends can see what you're watching. Visitors see your first name and your shows, never your email or photo, and only you can make changes. Private lists aren't available yet.",
  },
  {
    q: "countdowns",
    question: "Where do the countdowns come from?",
    answer:
      "AniList's airing schedule. Countdowns tick live in your browser; dates and weekdays are shown in Pacific Time. When you open your list, air dates older than 10 minutes are refreshed automatically.",
  },
  {
    q: "import",
    question: "Can I import my MyAnimeList or AniList list?",
    answer: "Not yet. Search covers everything on AniList, and each show is one tap to add.",
  },
  {
    q: "phone",
    question: "Does it work on my phone?",
    answer:
      "Yes. It's a website, so there's nothing to install. Sign in with the same Google account on each device and your list follows you.",
  },
] as const;

export default function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="relative isolate mx-auto max-w-3xl scroll-mt-20 px-4 py-20 [contain:inline-size] sm:px-6"
    >
      <div
        data-reveal=""
        className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left"
      >
        <div className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center">
          <MagicCircle variant="ring" className="absolute inset-0 h-full w-full opacity-60" />
          <Slime size={80} mood="sage" className="relative" />
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-[#95ccff]">
            <span className="sr-only">Great Sage notice: </span>
            <span aria-hidden="true">《Notice》 </span>
            Common questions, analyzed
          </p>
          <h2 id="faq-title" className={`mt-3 ${CHAPTER_TITLE_CLASS}`}>
            Before you sign in
          </h2>
        </div>
      </div>

      <div className="mt-10 border-t border-[rgb(53,53,53)]">
        {QUESTIONS.map(({ q, question, answer }) => (
          <details key={q} name="faq" data-q={q} className="faq-item group border-b border-[rgb(53,53,53)]">
            {/* A grid (summary allows only phrasing and heading content, so no
                wrappers): the tag sits over the question on phones and beside
                it from 640px, where the answer indents to match. */}
            <summary
              className={`grid min-h-11 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 rounded-md py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
            >
              <span
                aria-hidden="true"
                className="col-start-1 row-start-1 font-mono text-xs text-[#95ccff] transition-[text-shadow] group-open:[text-shadow:0_0_12px_rgba(149,204,255,.8)] sm:mt-0.5"
              >
                《Question》
              </span>
              <h3 className="col-start-1 row-start-2 text-base font-semibold text-white transition-colors group-open:text-[#d6e8ff] sm:col-start-2 sm:row-start-1">
                {question}
              </h3>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="col-start-2 row-span-2 row-start-1 mt-1 h-4 w-4 self-center text-[rgb(164,164,164)] group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-200 sm:col-start-3 sm:row-span-1 sm:self-start"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </summary>
            <div className="faq-answer pb-5 text-sm leading-6 text-[rgb(200,206,218)] sm:pl-[92px]">
              <span aria-hidden="true" className="mr-1.5 font-mono text-xs text-[#95ccff]">
                《Answer》
              </span>
              {answer}
            </div>
          </details>
        ))}
      </div>

      <p className="mt-8 text-center sm:text-left">
        <a
          href="#quests"
          className={`inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-[#95ccff] underline-offset-2 hover:text-white hover:underline ${FOCUS_RING}`}
        >
          Still curious? The fastest answer is to try it <span aria-hidden="true">&nbsp;↓</span>
        </a>
      </p>

      <FaqAnalytics />
    </section>
  );
}
