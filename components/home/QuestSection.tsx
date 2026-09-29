import NightSky from "./NightSky";
import QuestLog from "./QuestLog";

/**
 * #quests: the final sign-up pitch when signed out, the Quest Log when signed
 * in. Every landing sign-in returns here (callbackUrl "/#quests"), so the
 * section keeps its min height in every state and nothing above it uses
 * content-visibility: the anchor jump must land exactly.
 */
export default function QuestSection({ airingIds }: { airingIds: number[] }) {
  return (
    <section
      id="quests"
      aria-labelledby="quests-title"
      className="relative isolate min-h-[640px] scroll-mt-20 overflow-hidden [contain:inline-size]"
    >
      <NightSky variant="finale" />
      <QuestLog airingIds={airingIds} />
    </section>
  );
}
