import type { Metadata } from "next";
import AiringNext from "@/components/home/AiringNext";
import Faq from "@/components/home/Faq";
import Hero from "@/components/home/Hero";
import LandingProvider from "@/components/home/LandingProvider";
import PostCredits from "@/components/home/PostCredits";
import QuestSection from "@/components/home/QuestSection";
import Reveal from "@/components/home/Reveal";
import SageSearch from "@/components/home/SageSearch";
import ScheduleDemo from "@/components/home/ScheduleDemo";
import StickyCta from "@/components/home/StickyCta";
import TempestArchive from "@/components/home/TempestArchive";
import TrackerDemo from "@/components/home/TrackerDemo";
import type { LandingClientData } from "@/lib/landing";
import { loadLandingData } from "@/server/lib/landing";

/**
 * The landing page. Static and ISR (10 min): it reads no cookies, headers or
 * search params, and nothing on the server knows who is visiting. Session UI
 * lives in client islands (components/home/useLandingSession.ts).
 * loadLandingData() spends at most 2 AniList requests. When AniList fails
 * during a regeneration it throws, and ISR keeps the last good page; the
 * build renders fallbacks instead.
 */
export const revalidate = 600;

const DESCRIPTION =
  "Live countdowns for every anime this season, a list that remembers your last episode, and a weekly airing schedule built from what you watch. Free with Google.";

export const metadata: Metadata = {
  title: { absolute: "kylevb — never miss an episode again" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "kylevb",
    title: "That time you never missed an episode again.",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

function Hairline() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-[#95ccff]/30 to-transparent"
    />
  );
}

export default async function Home() {
  const data = await loadLandingData();
  const clientData: LandingClientData = {
    generatedAt: data.generatedAt,
    season: data.season,
    mediaById: data.mediaById,
    continuingIds: data.continuingIds,
  };

  return (
    // min-w-0: the body grid's single column is `auto`, so without it any
    // min-content overflow in a section would widen the whole page on phones.
    <main id="landing" className="min-w-0 overflow-x-clip pb-20 text-white lg:pb-0">
      <LandingProvider value={clientData}>
        <Hero season={data.season} airingIds={data.airingIds} />
        <AiringNext
          season={data.season}
          airingIds={data.airingIds}
          continuingIds={data.continuingIds}
        />
        <Hairline />
        <TrackerDemo />
        <Hairline />
        <ScheduleDemo airingIds={data.airingIds} />
        <Hairline />
        <SageSearch />
        <TempestArchive tempest={data.tempest} />
        <Faq />
        <QuestSection airingIds={data.airingIds} />
        <PostCredits />
        <StickyCta />
        <Reveal />
      </LandingProvider>
    </main>
  );
}
