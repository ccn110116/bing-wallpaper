import type { BingImage, Env } from '../shared/types';
import { getCanonicalRegion, MONTH_REGEX, CACHE_TTL } from '../shared/utils';

// --- Helper Functions ---

async function fetchJson<T>(path: string, env: Env, requestUrl: string): Promise<T | null> {
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

// --- SSR Rendering ---

async function renderPage(
  region: string,
  monthStr: string | undefined, // undefined means current month
  request: Request,
  env: Env
): Promise<Response> {
  if (!env.ASSETS) return new Response('Assets unavailable', { status: 500 });
  
  const url = new URL(request.url);

  console.log(`[renderPage] Fetching index.html for ${url.pathname}`);
  const templateReq = new Request(new URL('/index.html', url));
  const templateRes = await env.ASSETS.fetch(templateReq);
  
  if (!templateRes.ok) {
    console.error(`[renderPage] Failed to fetch index.html: ${templateRes.status}`);
    return new Response('Template not found', { status: 500 });
  }
  
  // Check if we got the actual index.html or a fallback (like error.html)
  // This is a heuristic - checking for a known string in index.html
  // But strictly, we assume ASSETS serves correct file on 200.
  
  // 1. Fetch resources in parallel
  const [locales, months] = await Promise.all([
    fetchJson<Record<string, Record<string, string>>>('/locales.json', env, url.toString()),
    fetchJson<string[]>(`/data/${region}/months.json`, env, url.toString()),
  ]);

  let activeMonth = monthStr;
  if (!activeMonth) {
    // Default to latest month
    activeMonth = (months && months.length > 0) ? months[0] : new Date().toISOString().slice(0, 7);
  }

  const images = (await fetchJson<BingImage[]>(`/data/${region}/${activeMonth}.json`, env, url.toString())) || [];

  // 2. Prepare Template
  let html = await templateRes.text();
  
  // Helper for localization
  const getTrans = (key: string) => {
    return (locales?.[region]?.[key]) || (locales?.['en-us']?.[key]) || key;
  };

  // 3. Inject Content
  
  // HTML Lang
  html = html.replace('<html lang="en-us">', `<html lang="${region}">`);
  
  // Script Injection for Client-side Locals
  if (locales) {
      const script = `<script>window.locales = ${JSON.stringify(locales)};</script>`;
      html = html.replace('</head>', `${script}</head>`);
  }
  
  // Title & Metadata
  const pageTitle = getTrans('htmlTitle');
  html = html.replace(/<title.*?>.*?<\/title>/, `<title>${pageTitle}</title>`);
  
  // Header
  const h1Title = getTrans('h1Title');
  html = html.replace(/<h1.*?>.*?<\/h1>/, `<h1>${h1Title}</h1>`);

  // First image for Header Background
  if (images.length > 0) {
    const firstImg = images[0];
    const bgUrl = `${firstImg.url}&w=1920`; 
    const desc = firstImg.desc;
    
    html = html.replace(
      '<div class="bgimg-header">', 
      `<div class="bgimg-header" style="background-image: url('${bgUrl}')">`
    );
    html = html.replace('<p></p>', `<p>${desc}</p>`);
  }

  // Archive List (Sidebar)
  if (months && months.length > 0) {
    const archiveHtml = months.map(m => {
      const activeClass = m === activeMonth ? ' w3-light-grey' : '';
      return `<a href="/${region}/${m}" class="bar-item button${activeClass}">${m}</a>`;
    }).join('\n');
    html = html.replace('<div id="archive-list"></div>', `<div id="archive-list">${archiveHtml}</div>`);
  }

  // Image Grid
  if (images.length > 0) {
    const gridHtml = images.map(img => {
      const smallUrl = `${img.url}&w=384&h=216`;
      const uhdUrl = `${img.url}&w=3840&h=2160`;
      const k2Url = `${img.url}&w=1920&h=1080`;
      const caption = img.desc.replace(/'/g, "&#39;");
      
      return `
        <a href="#" class="portfolio-item" 
           style="background-image: url('${smallUrl}')"
           data-caption="${caption}"
           data-date="${img.date}"
           data-thumbnail="${smallUrl}"
           data-url4k="${uhdUrl}"
           data-url2k="${k2Url}">
           <div class="description">
             <p>${img.date}: ${img.desc}</p>
           </div>
        </a>
      `;
    }).join('\n');
    
    html = html.replace(
      '<div class="portfolio-grid" id="img_list">', 
      `<div class="portfolio-grid" id="img_list">${gridHtml}`
    );
  }

  // Footer / Static Text keys
  const textKeys = ['home', 'archive', 'about', 'github', 'footerLine1', 'footerLine2', 'footerLine3'];
  for (const key of textKeys) {
    const val = getTrans(key);
    const regex = new RegExp(`data-key="${key}"[^>]*>.*?<`, 'g');
    html = html.replace(regex, (match) => {
      const tagStart = match.substring(0, match.indexOf('>') + 1);
      return `${tagStart}${val}<`;
    });
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    }
  });
}

async function serveError(env: Env, request: Request): Promise<Response> {
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

async function handleLatestImage(env: Env, requestUrl: string): Promise<Response> {
  const region = 'en-us';
  const months = await fetchJson<string[]>(`/data/${region}/months.json`, env, requestUrl);
  
  if (!months || months.length === 0) {
    return new Response('Data not found', { status: 404 });
  }

  const latestMonth = months[0];
  const images = await fetchJson<BingImage[]>(`/data/${region}/${latestMonth}.json`, env, requestUrl);
  
  if (!images || images.length === 0) {
    return new Response('Image not found', { status: 404 });
  }

  const imageUrl = images[0].url;
  try {
      const imageRes = await fetch(imageUrl);
      const headers = new Headers(imageRes.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=3600'); 
      return new Response(imageRes.body, {
          status: imageRes.status,
          headers: headers
      });
  } catch (e) {
      return new Response('Failed to fetch image', { status: 502 });
  }
}

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
    return renderPage('en-us', undefined, request, env);
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
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
