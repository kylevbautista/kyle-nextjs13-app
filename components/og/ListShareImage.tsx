/* eslint-disable @next/next/no-img-element -- next/og (Satori) renders plain <img> from data URIs */
import { ImageResponse } from "next/og";
import { magicCircleSvgMarkup } from "@/components/home/skyArt";
import { slimeBaseY, slimeMarkupHeight, slimeSvgMarkup } from "@/components/home/slimeArt";
import { LIST_EYEBROW } from "@/lib/anime/listCopy";
import { OG_MONO, OG_SANS, ogFonts } from "./fonts";
import { OG_SKY_GRADIENT, ogAurora, ogStars, ogTreeline, svgDataUri } from "./OgSky";
import { OgEyebrow, OgFooter, OgSageBox, OgSub, OgTitle } from "./parts";
import { LIST_TITLE_WIDTH, type ListShareCard } from "./shareCard";

const CIRCLE_SRC = svgDataUri(magicCircleSvgMarkup(224));
const SLIME_SIZE = 150;
/** The slime's base line inside the 312×236 stage (the ground glow is centered on it). */
const STAGE_GROUND = 196;
const statValueSize = (value: string) => (value.length <= 4 ? 56 : value.length === 5 ? 46 : 38);

/**
 * My List's visitor banner at 1200×630 (CLAUDE.md §5.8): eyebrow, the Great
 * Sage's report, the h1, the sub and the four stats on the left; the
 * Evolution card (the tier slime on its magic circle) on the right; the forest
 * and "kylevb.com" along the bottom. Everything comes from the card.
 */
function ListShareArt({ card }: { card: ListShareCard }) {
  const tier = card.evolution.tier;
  const progress = card.evolution.progress;
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

      <div style={{ position: "absolute", left: 64, top: 40, width: 680, display: "flex", flexDirection: "column" }}>
        <OgEyebrow text={LIST_EYEBROW} />
        <OgSageBox kind={card.sage.kind} text={card.sage.text} maxWidth={680} maxLines={3} />
        <OgTitle title={card.title} maxWidth={LIST_TITLE_WIDTH} />
        <OgSub text={card.sub} maxWidth={680} />
        {card.stats && (
          <div
            style={{
              display: "flex",
              marginTop: 22,
              width: 680,
              borderRadius: 14,
              border: "1.5px solid rgba(149, 204, 255, 0.25)",
              backgroundColor: "rgba(149, 204, 255, 0.15)",
              gap: 1.5,
              overflow: "hidden",
            }}
          >
            {card.stats.map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  padding: "16px 18px",
                  backgroundColor: "rgba(10, 20, 40, 0.9)",
                }}
              >
                <div
                  style={{
                    display: "block",
                    height: 56,
                    fontFamily: OG_MONO,
                    fontSize: 22,
                    lineHeight: "28px",
                    letterSpacing: 1.5,
                    color: "#95ccff",
                  }}
                >
                  {label.toUpperCase()}
                </div>
                <div
                  style={{
                    display: "flex",
                    // Smaller sizes move down to share the 56px digits' baseline (Geist's at lineHeight 1: 0.8 em).
                    marginTop: 8 + Math.round(0.8 * (56 - statValueSize(value))),
                    fontSize: statValueSize(value),
                    lineHeight: 1,
                    color: "#ffffff",
                    WebkitTextStroke: "1.5px #ffffff",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
        {card.empty && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 22,
              width: 680,
              padding: "22px 26px",
              borderRadius: 16,
              border: "1.5px solid rgb(53, 53, 53)",
              backgroundColor: "rgba(30, 30, 30, 0.92)",
            }}
          >
            <div style={{ display: "flex", fontSize: 30, color: "#ffffff", WebkitTextStroke: "1px #ffffff" }}>
              {card.empty.title}
            </div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 24, color: "rgb(200, 206, 218)" }}>{card.empty.body}</div>
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: 776,
          // 498px (bottom still 558): room for a two-line count line above the progress bar.
          top: 60,
          width: 360,
          height: 498,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px 24px 24px",
          borderRadius: 22,
          border: "1.5px solid rgba(149, 204, 255, 0.25)",
          backgroundColor: "rgba(10, 20, 40, 0.8)",
          boxShadow: "0 24px 60px -24px rgba(93, 174, 241, 0.45)",
        }}
      >
        <div style={{ display: "flex", position: "relative", width: 312, height: 236, flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              left: 21,
              top: 3,
              width: 270,
              height: 270,
              borderRadius: 270,
              backgroundImage:
                "radial-gradient(circle, rgba(93, 174, 241, 0.22) 0%, rgba(93, 174, 241, 0.06) 55%, rgba(93, 174, 241, 0) 70%)",
            }}
          />
          <img src={CIRCLE_SRC} alt="" width={224} height={224} style={{ position: "absolute", left: 44, top: 6 }} />
          <div
            style={{
              position: "absolute",
              left: 66,
              top: 184,
              width: 180,
              height: 26,
              borderRadius: 180,
              backgroundImage: "radial-gradient(ellipse, rgba(149, 204, 255, 0.35) 0%, rgba(149, 204, 255, 0) 70%)",
            }}
          />
          <img
            src={svgDataUri(slimeSvgMarkup({ size: SLIME_SIZE, tier }))}
            alt=""
            width={SLIME_SIZE}
            height={slimeMarkupHeight(SLIME_SIZE, tier)}
            style={{ position: "absolute", left: 81, top: STAGE_GROUND - slimeBaseY(SLIME_SIZE, tier) }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            flexShrink: 0,
            marginTop: 14,
            fontFamily: OG_MONO,
            fontSize: 22,
            letterSpacing: 4.4,
            color: "#95ccff",
          }}
        >
          EVOLUTION
        </div>
        <div style={{ display: "flex", flexShrink: 0, marginTop: 12, fontSize: 24, color: "rgb(200, 206, 218)" }}>
          Current form:
          <span style={{ marginLeft: 8, color: "#ffffff", WebkitTextStroke: "0.75px #ffffff" }}>{card.evolution.form}</span>
        </div>
        <div
          style={{
            display: "block",
            flexShrink: 0,
            marginTop: 6,
            fontSize: 24,
            color: "rgb(200, 206, 218)",
            textAlign: "center",
            lineClamp: 2,
          }}
        >
          {card.evolution.count}
        </div>
        {progress ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 312, marginTop: 14 }}>
            <div style={{ display: "flex", width: 312, height: 8, borderRadius: 8, backgroundColor: "rgba(255, 255, 255, 0.1)" }}>
              <div
                style={{
                  display: "flex",
                  width: Math.round(312 * progress.ratio),
                  height: 8,
                  borderRadius: 8,
                  backgroundColor: "#95ccff",
                }}
              />
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 22, color: "rgb(164, 164, 164)" }}>{progress.line}</div>
          </div>
        ) : (
          <div style={{ display: "flex", marginTop: 14, fontSize: 22, color: "rgb(164, 164, 164)" }}>{card.evolution.final}</div>
        )}
      </div>

      <OgFooter />
    </div>
  );
}

/** Image A: a 1200×630 PNG (see app/user/og/[id]/[v]/route.ts). */
export async function listShareImage(card: ListShareCard) {
  return new ImageResponse(<ListShareArt card={card} />, { width: 1200, height: 630, fonts: await ogFonts() });
}
