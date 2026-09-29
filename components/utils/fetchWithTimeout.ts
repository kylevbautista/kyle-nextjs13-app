/**
 * fetch() that aborts after `timeout` ms (default 8000). The timer covers the
 * request, not the body read. Works in the browser and on the server.
 */
export const fetchWithTimeout = async (
  resource: RequestInfo | URL,
  options: RequestInit & { timeout?: number } = {}
) => {
  const { timeout = 8000, ...init } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};
