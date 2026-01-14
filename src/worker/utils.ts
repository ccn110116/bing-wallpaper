import type { Env } from '../shared/types';

// Helper Functions
export async function fetchJson<T>(path: string, env: Env, requestUrl: string): Promise<T | null> {
  if (!env?.ASSETS) return null;
  try {
    const assetUrl = new URL(path, requestUrl);
    const response = await env.ASSETS.fetch(new Request(assetUrl));
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error(`Could not load JSON from ${path}`, e);
    return null;
  }
}

export async function serveError(env: Env, request: Request): Promise<Response> {
  if (env.ASSETS) {
    try {
      const url = new URL(request.url);
      const errorUrl = new URL('/error.html', url);
      const errorRes = await env.ASSETS.fetch(new Request(errorUrl));
      if (errorRes.ok) {
        return new Response(errorRes.body, {
          status: 404,
          headers: errorRes.headers
        });
      }
    } catch (e) {
      console.error("Failed to fetch error.html", e);
    }
  }
  return new Response('Not found', { status: 404 });
}
