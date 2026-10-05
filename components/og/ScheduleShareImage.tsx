/* eslint-disable @next/next/no-img-element -- next/og (Satori) renders plain <img> from data URIs */
import { ImageResponse } from "next/og";
import { slimeBaseY, slimeMarkupHeight, slimeSvgMarkup } from "@/components/home/slimeArt";
import { DAY_TINTS } from "@/components/theme/tokens";
import { SCHEDULE_EYEBROW } from "@/lib/anime/listCopy";
import { OG_SANS, ogFonts } from "./fonts";
import { OG_SKY_GRADIENT, ogAurora, ogStars, ogTreeline, svgDataUri } from "./OgSky";
import { OgEyebrow, OgFooter, OgSageBox, OgSub, OgTitle } from "./parts";
import { SCHEDULE_TITLE_WIDTH, type ScheduleShareCard } from "./shareCard";

const SLIME_SIZE = 150;
/** The perched slime's base: 6px above the strip's top edge (its shadow lands on the edge). */
const PERCH_Y = 408;
const STRIP_TOP = 414;
const tabCountSize = (count: number) => (String(count).length <= 3 ? 52 : 40);

/**
 * The Airing Schedule's visitor banner at 1200×630 (CLAUDE.md §5.8): eyebrow,
 * the standing Great Sage line, the h1 and sub, then the week panel's tab row
 * (All + Mon…Sun with each day's count) with the tier slime perched on it, or
 * the empty state's title. Counts come from the stored next episodes, by
 * Pacific Time weekday; no clock, so no "today".
 */
function ScheduleShareArt({ card }: { card: ScheduleShareCard }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundImage: OG_SKY_GRADIENT,
        color: "#ffffff",
        fontFamily: OG_SANS,
      }}
    >
      {ogStars()}
      {ogAurora()}
      {ogTreeline()}

      <div style={{ position: "absolute", left: 64, top: 40, width: 1072, display: "flex", flexDirection: "column" }}>
        <OgEyebrow text={SCHEDULE_EYEBROW} />
        <OgSageBox kind={card.sage.kind} text={card.sage.text} maxWidth={1072} maxLines={2} />
        <OgTitle title={card.title} maxWidth={SCHEDULE_TITLE_WIDTH} />
        <OgSub text={card.sub} maxWidth={880} />
      </div>

      {card.tabs && (
        <div
          style={{
            position: "absolute",
            left: 64,
            top: STRIP_TOP,
            width: 1072,
            height: 132,
            display: "flex",
            alignItems: "flex-end",
            padding: "0 16px 14px",
            borderRadius: 20,
            border: "1.5px solid rgb(53, 53, 53)",
            backgroundColor: "rgba(30, 30, 30, 0.92)",
            boxShadow: "0 24px 60px -30px rgba(93, 174, 241, 0.35)",
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 9, width: 1069, display: "flex", justifyContent: "center", gap: 12 }}>
            {DAY_TINTS.map((color) => (
              <div key={color} style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: color, opacity: 0.6 }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {card.tabs.map((tab) => {
              const color = tab.selected || tab.count > 0 ? "#ffffff" : "#787878";
              return (
                <div
                  key={tab.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 122,
                    height: 100,
                    borderRadius: 12,
                    backgroundColor: tab.selected ? "#2563eb" : "rgba(0, 0, 0, 0)",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 24, color: tab.selected ? "#ffffff" : "rgb(200, 206, 218)" }}>
                    {tab.label}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      marginTop: 4,
                      fontSize: tabCountSize(tab.count),
                      lineHeight: 1,
                      color,
                      WebkitTextStroke: `1.25px ${color}`,
                    }}
                  >
                    {String(tab.count)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {card.empty && (
        <div
          style={{
            position: "absolute",
            left: 64,
            top: STRIP_TOP,
            width: 1072,
            height: 120,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 32px",
            borderRadius: 20,
            border: "1.5px solid rgb(53, 53, 53)",
            backgroundColor: "rgba(30, 30, 30, 0.92)",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, color: "#ffffff", WebkitTextStroke: "1px #ffffff" }}>{card.empty}</div>
        </div>
      )}

      <img
        src={svgDataUri(slimeSvgMarkup({ size: SLIME_SIZE, tier: card.tier }))}
        alt=""
        width={SLIME_SIZE}
        height={slimeMarkupHeight(SLIME_SIZE, card.tier)}
        style={{ position: "absolute", left: 966, top: PERCH_Y - slimeBaseY(SLIME_SIZE, card.tier) }}
      />

      <OgFooter />
    </div>
  );
}

/** Image B: a 1200×630 PNG (see app/mylist/og/[id]/[v]/route.ts). */
export async function scheduleShareImage(card: ScheduleShareCard) {
  return new ImageResponse(<ScheduleShareArt card={card} />, { width: 1200, height: 630, fonts: await ogFonts() });
}
