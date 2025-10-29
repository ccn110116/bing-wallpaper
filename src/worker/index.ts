import { handleMainPage, getImageData } from './page-renderer';
import { Env } from './types';

declare const __ERROR_HTML__: string;
declare const __JS__: string;
declare const __CSS__: string;
declare const __LOCALES__: any;

const CACHE_TTL = 2592000; // 30 days in seconds

const supportedRegions: ReadonlyMap<string, string> = new Map([
  ['en-us', 'en-US'],
  ['zh-cn', 'zh-CN']
]);

function getCanonicalRegion(region: string): string | undefined {
  return supportedRegions.get(region.toLowerCase());
}

function getBestLanguage(request: Request): string {
    const supportedLangs = Object.keys(__LOCALES__);
    const acceptLanguage = request.headers.get('Accept-Language');
    if (acceptLanguage) {
        const langs = acceptLanguage.split(',').map(lang => lang.split(';')[0]);
        for (const lang of langs) {
            if (supportedLangs.includes(lang)) {
                return lang;
            }
            const langPrefix = lang.split('-')[0];
            const matchingLang = supportedLangs.find(l => l.startsWith(langPrefix));
            if (matchingLang) {
                return matchingLang;
            }
        }
    }
    return 'en-US';
}

function getAssetResponse(content: string, contentType: string): Response {
  return new Response(content, {
    headers: {
      'Content-Type': `${contentType};charset=UTF-8`,
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
    },
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
  const imageId = url.pathname.slice(7); // More efficient than replace
  if (!imageId) return new Response('Missing image ID', { status: 400 });

  const params = url.searchParams;
  const hasSmall = params.has('small');
  const has2k = params.has('2k');
  
  // Build URL more efficiently
  let bingUrl = `https://bing.com/th?id=${imageId}`;
  if (hasSmall) bingUrl += '&w=384&h=216';
  else if (has2k) bingUrl += '&w=1920';

  const cache = (caches as any).default;
  const cacheKey = new Request(bingUrl);
  let response = await cache.match(cacheKey);

  if (response) {
    console.log(`CACHE_HIT: ${bingUrl}`);
    return response;
  }
  
  console.log(`CACHE_MISS: ${bingUrl}`);
  response = await fetch(bingUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36' }
  });

  if (response.ok) {
    const cacheableResponse = new Response(response.body, response);
    cacheableResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
    ctx.waitUntil(cache.put(cacheKey, cacheableResponse.clone()));
    return cacheableResponse;
  }
  
  return response;
}

async function handleLatestImage(request: Request, env: Env): Promise<Response> {
  const monthStr = new Date().toISOString().slice(0, 7);
  const imageData = await getImageData('en-US', monthStr, env);
  if (!imageData || imageData.length === 0) return getErrorResponse();

  const latestImage = imageData[0];
  const imageId = new URL(latestImage.url).searchParams.get('id');
  return Response.redirect(`${new URL(request.url).origin}/image/${imageId}?2k`, 302);
}

// Pre-compile regex
const MONTH_REGEX = /^\d{4}-\d{2}$/;

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
    const response = await env.ASSETS.fetch(request);
    if (pathname.endsWith('months.json')) {
      const cacheableResponse = new Response(response.body, response);
      cacheableResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
      return cacheableResponse;
    }
    return response;
  }

  // --- Main Page Rendering Logic ---
  const pathSegments = pathname.split('/').filter(Boolean);
  const segmentCount = pathSegments.length;

  let activeRegion = 'en-US';
  let monthStr = new Date().toISOString().slice(0, 7);
  const lang = getBestLanguage(request);

  // Pattern 1: /
  if (segmentCount === 0) {
    return handleMainPage(request, env, activeRegion, monthStr, lang);
  }

  // Pattern 2: /{region} or /{month}
  if (segmentCount === 1) {
    const segment = pathSegments[0];
    const canonicalRegion = getCanonicalRegion(segment);
    if (canonicalRegion) {
      return handleMainPage(request, env, canonicalRegion, monthStr, lang);
    }
    if (MONTH_REGEX.test(segment)) {
      return handleMainPage(request, env, activeRegion, segment, lang);
    }
  }

  // Pattern 3: /{region}/{month}
  if (segmentCount === 2) {
    const [regionSegment, monthSegment] = pathSegments;
    const canonicalRegion = getCanonicalRegion(regionSegment);
    if (canonicalRegion && MONTH_REGEX.test(monthSegment)) {
      return handleMainPage(request, env, canonicalRegion, monthSegment, lang);
    }
  }

  // --- Fallback to 404 for any other path ---
  return getErrorResponse();
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Only cache GET requests
    if (request.method !== 'GET') {
      return handleRequest(request, env, ctx);
    }

    const cache = (caches as any).default;
    const cacheKey = new Request(request.url, request);
    let response = await cache.match(cacheKey);

    if (response) {
      console.log(`CACHE_HIT: ${request.url}`);
      return response;
    }

    console.log(`CACHE_MISS: ${request.url}`);
    response = await handleRequest(request, env, ctx);

    if (response.status === 200) {
      const cacheableResponse = new Response(response.body, response);
      cacheableResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
      ctx.waitUntil(cache.put(cacheKey, cacheableResponse.clone()));
      return cacheableResponse;
    }

    return response;
  },
};
