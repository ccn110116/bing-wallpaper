import type { BingImage, Env } from '../shared/types';
import { getCanonicalRegion, extractImageId, getImageUrl, MONTH_REGEX, CACHE_TTL, escapeHtml } from '../shared/utils';

// --- Helper Functions ---

async function getErrorResponse(request?: Request, env?: Env) {
  if (env?.ASSETS) {
    try {
       const errorUrl = new URL('/error.html', request?.url || 'https://example.com');
       const response = await env.ASSETS.fetch(new Request(errorUrl));
       if (response.ok) {
         return new Response(response.body, {
           status: 404,
           headers: response.headers,
         });
       }
    } catch (e) {
      console.error('Failed to fetch error.html from assets', e);
    }
  }

  return new Response('404 Not Found', {
    status: 404,
    headers: { 'content-type': 'text/plain' },
  });
}

async function fetchJson<T>(path: string, env: Env, requestUrl: string): Promise<T | null> {
  if (!env?.ASSETS) return null;
  
  try {
    const assetUrl = new URL(path, requestUrl);

    const response = await env.ASSETS.fetch(new Request(assetUrl));
    if (!response.ok) {
        console.error(`Failed to fetch JSON: ${path} (Status: ${response.status})`);
        return null;
    }
    return await response.json();
  } catch (e) {
    console.error(`Could not load JSON from ${path}`, e);
    return null;
  }
}

function getImageData(region: string, monthStr: string, env: Env, requestUrl: string): Promise<BingImage[] | null> {
  return fetchJson<BingImage[]>(`/data/${region}/${monthStr}.json`, env, requestUrl);
}

function getMonthsData(region: string, env: Env, requestUrl: string): Promise<string[] | null> {
  return fetchJson<string[]>(`/data/${region}/months.json`, env, requestUrl);
}

async function getBestLanguage(request: Request, env: Env): Promise<string> {
  const locales = await fetchJson<Record<string, any>>('/locales.json', env, request.url);
  
  if (!locales) {
    console.warn('Failed to load locales.json, defaulting to en-US'); // Add debugging
    return 'en-US';
  }
  
  // ... rest of function
  const supportedLangs = Object.keys(locales);
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

// --- Page Rendering ---

async function handleMainPage(request: Request, env: Env): Promise<Response> {
  // Client-side rendering: just serve the index.html template
  // The client JS will fetch data and populate the page
  if (!env?.ASSETS) {
    return new Response('Assets not available', { status: 500 });
  }
  return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
}

// --- Request Handling ---

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === '/js/main.js' || pathname === '/style.css' || pathname === '/locales.json') {
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not Found', { status: 404 });
  }

  // Handle image API endpoints
  if (pathname === '/image/latestImage') {
    const activeRegion = 'en-US';
    const monthStr = new Date().toISOString().slice(0, 7);
    try {
        const imageData = await getImageData(activeRegion, monthStr, env, request.url);
        if (imageData && imageData.length > 0) {
            return new Response(JSON.stringify(imageData[0]), {
                headers: { 'content-type': 'application/json' },
            });
        }
    } catch (e) {
        console.error('Error fetching latest image', e);
    }
    
    return new Response(JSON.stringify({ error: 'No image found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (pathname.startsWith('/data/')) {
    if (!env?.ASSETS) return new Response('Not Found', { status: 404 });
    const response = await env.ASSETS.fetch(request);
    if (pathname.endsWith('months.json')) {
      const cacheableResponse = new Response(response.body, response);
      cacheableResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
      return cacheableResponse;
    }
    return response;
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  const segmentCount = pathSegments.length;

  if (segmentCount === 0) {
    return handleMainPage(request, env);
  }

  if (segmentCount === 1) {
    const segment = pathSegments[0];
    const canonicalRegion = getCanonicalRegion(segment);
    if (canonicalRegion) {
      return handleMainPage(request, env);
    }
    if (MONTH_REGEX.test(segment)) {
      return handleMainPage(request, env);
    }
  }

  if (segmentCount === 2) {
    const [regionSegment, monthSegment] = pathSegments;
    const canonicalRegion = getCanonicalRegion(regionSegment);
    if (canonicalRegion && MONTH_REGEX.test(monthSegment)) {
      return handleMainPage(request, env);
    }
  }

  return getErrorResponse(request, env);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
