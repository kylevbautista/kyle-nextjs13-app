/**
 * The share-image routes' response: render to bytes under a deadline, and fall
 * back to the neutral wording (no name, so no render-time font or emoji fetch)
 * when the first render fails or stalls. ImageResponse streams its PNG, so a
 * failed glyph fetch would otherwise surface as a 500 (or hang) after the
 * headers. The fallback keeps ImageResponse's headers (image/png, its
 * Cache-Control); the route's ISR entry caches whichever image was sent.
 */
const RENDER_DEADLINE_MS = 5_000;

const withDeadline = <T>(promise: Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("share image render timed out")), RENDER_DEADLINE_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });

async function toBytes(render: () => Promise<Response>) {
  const res = await withDeadline(render());
  return { body: await withDeadline(res.arrayBuffer()), headers: res.headers };
}

export async function shareImageResponse(render: () => Promise<Response>, neutral: () => Promise<Response>) {
  let out: { body: ArrayBuffer; headers: Headers };
  try {
    out = await toBytes(render);
  } catch (err) {
    console.error("Share image fell back to the neutral wording:", (err as Error)?.message ?? err);
    out = await toBytes(neutral);
  }
  return new Response(out.body, { headers: out.headers });
}

/** A body-less 404: returned (not thrown with notFound()) so ISR caches it for the route's hour, not forever. */
export const notFoundResponse = () => new Response(null, { status: 404 });
