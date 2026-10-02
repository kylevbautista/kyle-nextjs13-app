import { describe, expect, it } from "vitest";
import { ANIME_CARD_LAYOUT, CARD_LAYOUT, LAYOUTS } from "./cardLayout";

describe("card layouts", () => {
  it("define every field, and the switch picks one", () => {
    for (const layout of Object.values(LAYOUTS)) {
      for (const key of ["Card", "Skeleton", "Action", "grid", "seasonCoverSizes", "searchCoverSizes", "landing"] as const) {
        expect(layout[key]).toBeTruthy();
      }
      expect(layout.landing.visible).toBeGreaterThan(layout.landing.phoneLimit);
    }
    expect(CARD_LAYOUT).toBe(LAYOUTS[ANIME_CARD_LAYOUT]);
  });

  it("classic: the end card never spans 2 columns (the phone grid has 1)", () => {
    expect(LAYOUTS.classic.endCardSpan(true)).not.toMatch(/col-span-2/);
    expect(LAYOUTS.classic.endCardSpan(false)).not.toMatch(/col-span-2/);
    expect(LAYOUTS.poster.endCardSpan(false)).toMatch(/col-span-2/);
  });

  it("waiting skeletons fill the rest of the sentinel's row at each breakpoint", () => {
    // Classic, 1 / 2 / 3 columns. 71 cards: the sentinel is the 72nd cell, which ends a row of 2 and of 3.
    expect(LAYOUTS.classic.waitingSkeletons(71)).toEqual([]);
    // 70 cards: the sentinel is the 71st cell — 1 free at 2 columns, 1 free at 3.
    expect(LAYOUTS.classic.waitingSkeletons(70)).toEqual(["hidden sm:flex xl:flex"]);
    // 72 cards: 1 free at 2 columns, 2 free at 3.
    expect(LAYOUTS.classic.waitingSkeletons(72)).toEqual(["hidden sm:flex xl:flex", "hidden sm:hidden xl:flex"]);
    // Poster, 2 / 3 / 4 / 5 columns, 71 cards → the 72nd cell: 0 / 0 / 0 / 3 free.
    expect(LAYOUTS.poster.waitingSkeletons(71)).toEqual([
      "hidden sm:hidden lg:hidden xl:flex",
      "hidden sm:hidden lg:hidden xl:flex",
      "hidden sm:hidden lg:hidden xl:flex",
    ]);
    for (const n of [0, 11, 50, 93]) {
      for (const layout of Object.values(LAYOUTS)) {
        for (const classes of layout.waitingSkeletons(n)) expect(classes.startsWith("hidden") || classes.startsWith("flex")).toBe(true);
      }
    }
  });

  it("the classic landing grid's cards + end card fill rows of 2 and 3", () => {
    expect((LAYOUTS.classic.landing.visible + 1) % 2).toBe(0);
    expect((LAYOUTS.classic.landing.visible + 1) % 3).toBe(0);
  });
});
