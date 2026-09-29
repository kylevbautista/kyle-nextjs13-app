import { ImageResponse } from "next/og";
import { slimeSvgMarkup } from "@/components/home/slimeArt";

/**
 * The share image for "/": the original slime under a night sky beside the
 * headline. No fetch and no request-time API, so it is prerendered at build.
 * Flexbox only (Satori). Only the bundled regular font is available, so the
 * headline gets a text stroke for weight instead of loading a bold font.
 */

export const alt =
  "The kylevb slime under a night sky, next to the headline: That time you never missed an episode again.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(1234);
const STARS = Array.from({ length: 40 }, () => ({
  x: Math.round(rand() * 1200),
  y: Math.round(rand() * 420),
  r: rand() < 0.25 ? 3 : 2,
  o: 0.35 + rand() * 0.55,
}));

const SLIME_SIZE = 380;
const SLIME_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(slimeSvgMarkup({ size: SLIME_SIZE }))}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundImage: "linear-gradient(180deg, #050915 0%, #0a1428 55%, #0e1d33 100%)",
          color: "#ffffff",
        }}
      >
        {STARS.map((star, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: star.x,
              top: star.y,
              width: star.r,
              height: star.r,
              borderRadius: star.r,
              backgroundColor: `rgba(223, 241, 255, ${star.o.toFixed(2)})`,
            }}
          />
        ))}

        {/* Moon */}
        <div
          style={{
            position: "absolute",
            right: 70,
            top: 50,
            width: 64,
            height: 64,
            borderRadius: 64,
            backgroundImage: "radial-gradient(circle at 35% 35%, #f4f9ff, #cfe3ff)",
            boxShadow: "0 0 60px 12px rgba(191, 230, 255, 0.25)",
          }}
        />

        {/* Glow behind the slime */}
        <div
          style={{
            position: "absolute",
            right: -20,
            top: 70,
            width: 560,
            height: 560,
            borderRadius: 560,
            backgroundImage:
              "radial-gradient(circle, rgba(149, 204, 255, 0.34) 0%, rgba(149, 204, 255, 0.08) 45%, rgba(149, 204, 255, 0) 68%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 75,
            top: 452,
            width: 370,
            height: 40,
            borderRadius: 370,
            backgroundImage: "radial-gradient(ellipse, rgba(149, 204, 255, 0.35) 0%, rgba(149, 204, 255, 0) 70%)",
          }}
        />

        <img
          src={SLIME_SRC}
          alt=""
          width={SLIME_SIZE}
          height={Math.round(SLIME_SIZE * 0.85)}
          style={{ position: "absolute", right: 70, top: 150 }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 810,
            height: "100%",
            paddingLeft: 80,
            paddingBottom: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 16px",
              borderRadius: 8,
              border: "1.5px solid rgba(149, 204, 255, 0.35)",
              backgroundColor: "rgba(10, 21, 40, 0.7)",
              color: "#cfe8ff",
              fontSize: 24,
            }}
          >
            kylevb · seasonal anime tracker
          </div>
          <div
            style={{
              marginTop: 30,
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: -0.5,
              WebkitTextStroke: "2px #ffffff",
            }}
          >
            That time you never missed an episode again.
          </div>
          <div style={{ marginTop: 30, fontSize: 28, color: "#95ccff" }}>
            Live countdowns · your list · your airing schedule
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 80,
            bottom: 44,
            fontSize: 24,
            color: "#c9d6e6",
          }}
        >
          kylevb.com
        </div>
      </div>
    ),
    { ...size }
  );
}
