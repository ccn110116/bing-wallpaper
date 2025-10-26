import { handleMainPage, getImageData } from './page-renderer';
import { Env } from './types';

declare const __ERROR_HTML__: string;
declare const __JS__: string;
declare const __CSS__: string;

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

// --- Region and Path Parsing Logic (extracted to function) ---
function parsePathAndRegion(pathname: string) {
  const pathSegments = pathname.split('/').filter(Boolean);
  const supportedRegions: { [key: string]: string } = {
    'en-us': 'en-US',
    'zh-cn': 'zh-CN',
    'zh-hk': 'zh-HK',
  };

  let activeRegion = 'en-US';
  let monthStr = new Date().toISOString().slice(0, 7);
  let potentialMonth: string | undefined;

  // Check for a region anywhere in the path
  const regionSegment = pathSegments.find(p => supportedRegions[p.toLowerCase()]);
  if (regionSegment) {
    activeRegion = supportedRegions[regionSegment.toLowerCase()];
    // The segment after the region might be the month
    const regionIndex = pathSegments.indexOf(regionSegment);
    potentialMonth = pathSegments[regionIndex + 1];
  } else {
    // If no region is found, the first segment might be the month
    potentialMonth = pathSegments[0];
  }

  // Validate if the potential month is in the correct format (YYYY-MM)
  if (potentialMonth && /^\d{4}-\d{2}$/.test(potentialMonth)) {
    monthStr = potentialMonth;
  }

  return { pathSegments, regionSegment, activeRegion, monthStr };
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

    // Handle image proxy and latest image first
    if (pathname.startsWith('/image/')) return handleImageProxy(request, ctx);
    if (pathname === '/image/latestImage') return handleLatestImage(request, env);
    
    // Serve static assets
    if (pathname === '/app.js') return getAssetResponse(__JS__, 'application/javascript');
    if (pathname === '/style.css') return getAssetResponse(__CSS__, 'text/css');
    
    // Region and Path Parsing
    const { pathSegments, regionSegment, activeRegion, monthStr } = parsePathAndRegion(pathname);

    // After parsing, check if it's a valid main page request
    const isMainPageRequest = pathname === '/' || !!regionSegment || (pathSegments.length === 1 && /^\d{4}-\d{2}$/.test(pathSegments[0]));

    if (isMainPageRequest) {
      return handleMainPage(request, env, activeRegion, monthStr);
    }

    // Fallback for other static assets
    const staticAssetResponse = await env.ASSETS.fetch(request);
    if (staticAssetResponse.status < 400) {
        return staticAssetResponse;
    }

    // If nothing matches, return 404
    return getErrorResponse();
  },
};
