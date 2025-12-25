import type { BingImage, Env } from '../shared/types';
import { getCanonicalRegion, extractImageId, getImageUrl, MONTH_REGEX, CACHE_TTL, escapeHtml } from '../shared/utils';

// --- Helper Functions ---

function getErrorResponse(request: Request, env: Env): Promise<Response> {
  return env.ASSETS.fetch(new Request(new URL('/error.html', request.url)));
}

async function fetchJson<T>(path: string, env: Env, requestUrl: string): Promise<T | null> {
  try {
    const response = await env.ASSETS.fetch(new Request(new URL(path, requestUrl)));
    if (!response.ok) return null;
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
    return 'en-US';
  }
  
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

async function handleMainPage(request: Request, env: Env, activeRegion: string, monthStr: string, lang: string): Promise<Response> {
  const [imageData, monthsData, locales] = await Promise.all([
    getImageData(activeRegion, monthStr, env, request.url),
    getMonthsData(activeRegion, env, request.url),
    fetchJson<Record<string, any>>('/locales.json', env, request.url)
  ]);

  if (!imageData || imageData.length === 0 || !locales) {
    return getErrorResponse(request, env);
  }

  const latestImage = imageData[0];
  const latestImageId = extractImageId(latestImage.url);

  if (!latestImageId) {
    return getErrorResponse(request, env);
  }

  const imageGridItems: string[] = [];
  for (const img of imageData) {
    const imageId = extractImageId(img.url);
    if (!imageId) continue;

    const caption = escapeHtml(img.desc);
    const description = `${img.date}: ${img.desc}`;
    imageGridItems.push(
      `<a href="#" class="portfolio-item" data-image-id="${imageId}" data-caption="${caption}" data-bg="${getImageUrl(imageId, 'small')}" data-url-2k="${getImageUrl(imageId, '2k')}" data-url-4k="${getImageUrl(imageId, '4k')}"><div class="description"><p>${description}</p></div></a>`
    );
  }
  const imageGridHTML = imageGridItems.join('');

  const rewriter = new HTMLRewriter()
    .on('html', {
      element(element: Element) {
        element.setAttribute('lang', lang);
      },
    })
    .on('head', {
        element(element: Element) {
            element.append(`<script>window.locales = ${JSON.stringify(locales)}</script>`, { html: true });
        },
    })
    .on('.bgimg-header', {
      element(element: Element) {
        element.setAttribute('style', `background-image: url('${getImageUrl(latestImageId, '2k')}');`);
      },
    })
    .on('.smallImg-header', {
      element(element: Element) {
        element.setAttribute('style', `background-image: url('${getImageUrl(latestImageId, 'small')}');`);
      },
    })
    .on('.display-middle p', {
      element(element: Element) {
        element.setInnerContent(latestImage.desc);
      },
    })
    .on('#img_list', {
      element(element: Element) {
        element.setInnerContent(imageGridHTML, { html: true });
      },
    });

  const htmlResponse = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
  return rewriter.transform(htmlResponse);
}

// --- Request Handling ---

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === '/app.js' || pathname === '/style.css' || pathname === '/locales.json') {
    return env.ASSETS.fetch(request);
  }

  if (pathname.startsWith('/data/')) {
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

  let activeRegion = 'en-US';
  let monthStr = new Date().toISOString().slice(0, 7);
  const lang = await getBestLanguage(request, env);

  if (segmentCount === 0) {
    return handleMainPage(request, env, activeRegion, monthStr, lang);
  }

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

  if (segmentCount === 2) {
    const [regionSegment, monthSegment] = pathSegments;
    const canonicalRegion = getCanonicalRegion(regionSegment);
    if (canonicalRegion && MONTH_REGEX.test(monthSegment)) {
      return handleMainPage(request, env, canonicalRegion, monthSegment, lang);
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
