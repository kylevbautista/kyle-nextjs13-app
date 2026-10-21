import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { NOW, USER_ID, mixedEntries } from "@/widgets/scriptable/fixtures";

const readWidgetOwner = vi.fn();
const refreshEntriesIfStale = vi.fn();
const after = vi.fn();
vi.mock("@/server/lib/userList", () => ({
  CANONICAL_ID_RE: /^[a-f0-9]{24}$/,
  readWidgetOwner: (...args: unknown[]) => readWidgetOwner(...args),
  refreshEntriesIfStale: (...args: unknown[]) => refreshEntriesIfStale(...args),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (callback: () => unknown) => after(callback),
}));

const { GET } = await import("./route");
const call = (id: string) => GET(new Request(`https://kylevb.com/api/widget/v1/list/${id}`), { params: Promise.resolve({ id }) });
const owner = () => ({ user: { _id: new ObjectId(USER_ID), listRefreshedAt: 0 }, name: "Kyle", entries: mixedEntries() });

beforeEach(() => {
  readWidgetOwner.mockReset();
  refreshEntriesIfStale.mockReset();
  after.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

describe("GET /api/widget/v1/list/<id>", () => {
  it("answers with the payload, without awaiting the refresh", async () => {
    const o = owner();
    readWidgetOwner.mockResolvedValueOnce(o);
    refreshEntriesIfStale.mockReturnValue(new Promise(() => {})); // never settles
    after.mockImplementation((callback: () => unknown) => void callback());
    const res = await call(USER_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ schema: 1, generatedAt: NOW, state: "rows", owner: { name: "Kyle", tier: "lord" } });
    expect(body.rows).toHaveLength(7);
    expect(readWidgetOwner).toHaveBeenCalledWith(USER_ID);
    expect(refreshEntriesIfStale).toHaveBeenCalledWith(o.user, o.entries);
  });

  it("schedules refreshEntriesIfStale(owner.user, owner.entries) in after()", async () => {
    const o = owner();
    readWidgetOwner.mockResolvedValueOnce(o);
    await call(USER_ID);
    expect(after).toHaveBeenCalledTimes(1);
    expect(refreshEntriesIfStale).not.toHaveBeenCalled();
    await after.mock.calls[0][0]();
    expect(refreshEntriesIfStale).toHaveBeenCalledWith(o.user, o.entries);
  });

  it("404s a non-canonical id without reading; 404s an unknown id; 503s a Mongo error", async () => {
    for (const id of ["65F1C0FFEE0123456789ABCD", "nope", Buffer.from("a@b.c").toString("base64url")]) {
      const res = await call(id);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ schema: 1, error: "not-found" });
    }
    expect(readWidgetOwner).not.toHaveBeenCalled();

    readWidgetOwner.mockResolvedValueOnce(null);
    const unknown = await call(USER_ID);
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ schema: 1, error: "not-found" });

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    readWidgetOwner.mockRejectedValueOnce(new Error("Mongo down"));
    const down = await call(USER_ID);
    expect(down.status).toBe(503);
    expect(await down.json()).toEqual({ schema: 1, error: "unavailable" });
    expect(after).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("marks every response no-store and noindex", async () => {
    readWidgetOwner.mockResolvedValueOnce(owner());
    const responses = [await call(USER_ID), await call("bad")];
    readWidgetOwner.mockResolvedValueOnce(null);
    responses.push(await call(USER_ID));
    vi.spyOn(console, "error").mockImplementation(() => {});
    readWidgetOwner.mockRejectedValueOnce(new Error("x"));
    responses.push(await call(USER_ID));
    for (const res of responses) {
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("x-robots-tag")).toBe("noindex");
      expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    }
  });

  it("answers 410 with a message and the script's URL once v1 is retired", async () => {
    vi.resetModules();
    vi.doMock("@/lib/widget", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/widget")>()),
      WIDGET_V1_RETIRED: true,
    }));
    const retired = await import("./route");
    const res = await retired.GET(new Request("https://kylevb.com/"), { params: Promise.resolve({ id: USER_ID }) });
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({
      schema: 1,
      error: "outdated",
      message: "kylevb.com no longer supports this version. Paste the new one from GitHub.",
      url: "https://github.com/kylevbautista/kyle-nextjs13-app/blob/main/widgets/scriptable/kylevb-anime.js",
    });
    expect(readWidgetOwner).not.toHaveBeenCalled();
    vi.doUnmock("@/lib/widget");
  });
});
