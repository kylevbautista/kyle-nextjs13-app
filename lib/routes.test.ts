import { describe, expect, it } from "vitest";
import { airingSchedulePath, isCurrentPath, myListPath, searchPath, signInPath } from "./routes";

describe("isCurrentPath", () => {
  it("exact: only the same path", () => {
    expect(isCurrentPath("/", "/", "exact")).toBe(true);
    expect(isCurrentPath("/anime/2026/fall", "/", "exact")).toBe(false);
    expect(isCurrentPath("/search", "/", "exact")).toBe(false);
  });

  it("prefix (the default): the path and anything below it", () => {
    expect(isCurrentPath("/anime", "/anime")).toBe(true);
    expect(isCurrentPath("/anime/2026/fall", "/anime")).toBe(true);
    expect(isCurrentPath("/topanime", "/topanime")).toBe(true);
  });

  it("prefix never matches a longer sibling", () => {
    expect(isCurrentPath("/animex", "/anime")).toBe(false);
    expect(isCurrentPath("/topanime", "/anime")).toBe(false);
    expect(isCurrentPath("/search", "/", "prefix")).toBe(false);
  });

  it("none: never current (the カイル brand)", () => {
    expect(isCurrentPath("/anime", "/anime", "none")).toBe(false);
    expect(isCurrentPath("/anime/2026/fall", "/anime", "none")).toBe(false);
  });

  it("marks the account menu's own pages exactly", () => {
    const id = "65f000000000000000000001";
    expect(isCurrentPath(myListPath(id), myListPath(id), "exact")).toBe(true);
    expect(isCurrentPath(airingSchedulePath(id), myListPath(id), "exact")).toBe(false);
    expect(isCurrentPath(myListPath("someone-else"), myListPath(id), "exact")).toBe(false);
  });
});

describe("path builders", () => {
  it("builds list, search and sign-in URLs", () => {
    expect(myListPath("abc")).toBe("/user/abc");
    expect(airingSchedulePath("abc")).toBe("/mylist/abc");
    expect(searchPath()).toBe("/search");
    expect(searchPath("sousou no frieren")).toBe("/search?q=sousou%20no%20frieren");
    expect(signInPath()).toBe("/auth/signin");
    expect(signInPath("/search?q=a b")).toBe("/auth/signin?callbackUrl=%2Fsearch%3Fq%3Da%20b");
  });
});
