import type { Env } from '../shared/types';
import { getCanonicalRegion, MONTH_REGEX } from '../shared/utils';
import { serveError } from './utils';
import { handleLatestImage } from './api';
import { renderPage } from './renderer';

// --- Request Handler ---

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname.includes('.')) {
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return serveError(env, request);
  }

  if (pathname === '/image/latestImage') {
    return handleLatestImage(env, request.url);
  }

  if (pathname === '/') {
    // Determine language from header
    const acceptLanguage = request.headers.get('Accept-Language') || '';
    const region = acceptLanguage.toLowerCase().includes('zh') ? 'zh-cn' : 'en-us';
    return renderPage(region, undefined, request, env);
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  
  if (pathSegments.length === 1) {
    const region = getCanonicalRegion(pathSegments[0]);
    if (region) {
      return renderPage(region, undefined, request, env);
    }
  }

  if (pathSegments.length === 2) {
    const region = getCanonicalRegion(pathSegments[0]);
    const month = pathSegments[1];
    if (region && MONTH_REGEX.test(month)) {
      return renderPage(region, month, request, env);
    }
  }

  return serveError(env, request);
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const cache = (caches as any).default;
    const cacheKey = new Request(url.toString(), request);
    
    if (request.method === 'GET') {
      let response = await cache.match(cacheKey);
      if (response) {
        return response;
      }
    }

    const response = await handleRequest(request, env);

    if (request.method === 'GET' && response.status === 200 && !url.pathname.includes('.')) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  },
};
