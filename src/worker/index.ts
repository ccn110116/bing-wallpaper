import { handleMainPage, getImageData } from './page-renderer';
import { Env } from './types';

declare const __ERROR_HTML__: string;
declare const __JS__: string;
declare const __CSS__: string;

const supportedRegions: { [key: string]: string } = {
  'en-us': 'en-US',
  'zh-cn': 'zh-CN',
  'zh-hk': 'zh-HK',
};

function getCanonicalRegion(region: string): string | undefined {
  return supportedRegions[region.toLowerCase()];
}

function getAssetResponse(content: string, contentType: string): Response {
  return new Response(content, {
    headers: { 'Content-Type': `${contentType};charset=UTF-8` },
  });
}

function getErrorResponse(): Response {
  return new Response(__ERROR_HTML__, {
    status: 404,
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

async function handleImageProxy(request: Request, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const imageId = url.pathname.replace('/image/', '');
  if (!imageId) return new Response('Missing image ID', { status: 400 });

  let bingUrl = `https://bing.com/th?id=${imageId}`;
  if (url.searchParams.has('small')) bingUrl += '&w=384&h=216';
  else if (url.searchParams.has('2k')) bingUrl += '&w=1920';

  const cache = (caches as any).default;
  const cacheKey = new Request(bingUrl);
  let response = await cache.match(cacheKey);

  if (!response) {
    response = await fetch(bingUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36' }
    });
    if (response.ok) {
      response = new Response(response.body, response);
      response.headers.set('Cache-Control', 'public, max-age=86400');
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
  }
  return response;
}

async function handleLatestImage(request: Request, env: Env): Promise<Response> {
  const monthStr = new Date().toISOString().slice(0, 7);
  const imageData = await getImageData('en-US', monthStr, env);
  if (!imageData || imageData.length === 0) return getErrorResponse();

  const latestImage = imageData[0];
  const imageId = new URL(latestImage.url).searchParams.get('id');
  const imageUrl = new URL(`/image/${imageId}?2k`, request.url).toString();
  return Response.redirect(imageUrl, 302);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // --- Image Proxy & Redirects ---
    if (pathname === '/image/latestImage') return handleLatestImage(request, env);
    if (pathname.startsWith('/image/')) return handleImageProxy(request, ctx);

    // --- Static Assets ---
    if (pathname === '/app.js') return getAssetResponse(__JS__, 'application/javascript');
    if (pathname === '/style.css') return getAssetResponse(__CSS__, 'text/css');

    // --- Data Assets ---
    if (pathname.startsWith('/data/')) {
      const parts = pathname.split('/');
      if (parts.length > 2) {
        const region = parts[2];
        const correctedRegion = getCanonicalRegion(region);
        if (correctedRegion && correctedRegion !== region) {
          const correctedPathname = pathname.replace(region, correctedRegion);
          const newUrl = new URL(correctedPathname, url.origin);
          return env.ASSETS.fetch(new Request(newUrl.toString(), request));
        }
      }
      return env.ASSETS.fetch(request);
    }

    // --- Main Page Rendering Logic ---
    const monthRegex = /^\d{4}-\d{2}$/;
    const pathSegments = pathname.split('/').filter(Boolean);

    let activeRegion = 'en-US';
    let monthStr = new Date().toISOString().slice(0, 7);

    // Pattern 1: /
    if (pathSegments.length === 0) {
      return handleMainPage(request, env, activeRegion, monthStr);
    }

    // Pattern 2: /{region} or /{month}
    if (pathSegments.length === 1) {
      const segment = pathSegments[0];
      const canonicalRegion = getCanonicalRegion(segment);
      if (canonicalRegion) {
        activeRegion = canonicalRegion;
        return handleMainPage(request, env, activeRegion, monthStr);
      }
      if (monthRegex.test(segment)) {
        monthStr = segment;
        return handleMainPage(request, env, activeRegion, monthStr);
      }
    }

    // Pattern 3: /{region}/{month}
    if (pathSegments.length === 2) {
      const [regionSegment, monthSegment] = pathSegments;
      const canonicalRegion = getCanonicalRegion(regionSegment);
      if (canonicalRegion && monthRegex.test(monthSegment)) {
        activeRegion = canonicalRegion;
        monthStr = monthSegment;
        return handleMainPage(request, env, activeRegion, monthStr);
      }
    }

    // --- Fallback to 404 for any other path ---
    return getErrorResponse();
  },
};
