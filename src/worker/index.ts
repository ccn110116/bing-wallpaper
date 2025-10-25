// These variables will be replaced by the build script with the minified file contents.
declare const __HTML__: string;
declare const __ERROR_HTML__: string;
declare const __JS__: string;
declare const __CSS__: string;

interface BingImage {
  desc: string;
  date: string;
  url: string;
}

// --- Helper Functions ---

async function fetchJson<T>(path: string, env: Env): Promise<T | null> {
  try {
    const response = await env.ASSETS.fetch(new Request(new URL(path, 'https://example.com')));
    if (!response.ok) {
      return null; // Gracefully handle not found
    }
    return await response.json();
  } catch (e) {
    console.error(`Could not load JSON from ${path}`, e);
    return null;
  }
}

function getImageData(region: string, monthStr: string, env: Env): Promise<BingImage[] | null> {
  return fetchJson<BingImage[]>(`/data/${region}/${monthStr}.json`, env);
}

function getMonthsData(region: string, env: Env): Promise<string[] | null> {
  return fetchJson<string[]>(`/data/${region}/months.json`, env);
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

// --- Request Handlers ---

async function handleImageProxy(request: Request, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const imageId = url.pathname.replace('/image/', '');
  if (!imageId) {
    return new Response('Missing image ID', { status: 400 });
  }

  let bingUrl = `https://bing.com/th?id=${imageId}`;
  if (url.searchParams.has('small')) bingUrl += '&w=384&h=216';
  else if (url.searchParams.has('preview')) bingUrl += '&w=2000';

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

async function handleMainPage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  const regionMap: { [key: string]: string } = { 'zh-cn': 'zh-CN', 'zh-hk': 'zh-HK' };
  const supportedRegions = ['en-US', 'zh-CN', 'zh-HK'];
  
  let activeRegion = 'en-US';
  let monthStr = new Date().toISOString().slice(0, 7);
  let dateIsValid = true;

  if (pathSegments.length > 0) {
    const regionSegment = pathSegments[0].toLowerCase();
    const monthSegment = pathSegments.length > 1 ? pathSegments[1] : null;

    if (supportedRegions.includes(regionMap[regionSegment] || regionSegment)) {
      activeRegion = regionMap[regionSegment] || regionSegment;
      if (monthSegment) {
        if (/^\d{4}-\d{2}$/.test(monthSegment)) monthStr = monthSegment;
        else dateIsValid = false;
      }
    } else if (/^\d{4}-\d{2}$/.test(regionSegment)) {
      monthStr = regionSegment;
    }
  }

  if (!dateIsValid) return getErrorResponse();

  const [imageData, monthsData] = await Promise.all([
    getImageData(activeRegion, monthStr, env),
    getMonthsData(activeRegion, env)
  ]);

  if (!imageData || imageData.length === 0) {
    return getErrorResponse();
  }

  const latestImage = imageData[0];

  const imageGridHTML = imageData.map(img => {
    const imageId = new URL(img.url).searchParams.get('id');
    if (!imageId) return '';
    return `
    <div class="portfolio-item" onclick="openLightbox('/image/${imageId}', '${img.desc}')">
      <img data-src="/image/${imageId}?small" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${img.desc}" class="lazy">
      <div class="description"><p>${img.desc}</p></div>
    </div>`;
  }).join('');

  const archiveHTML = monthsData?.map(month => 
    `<a href="/${activeRegion.toLowerCase().replace('_', '-')}/${month}" class="bar-item button">${month}</a>`
  ).join('') || '';

  const rewriter = new HTMLRewriter()
    .on('.bgimg-header', {
      element(element: Element) {
        const imageId = new URL(latestImage.url).searchParams.get('id');
        element.setAttribute('style', `background-image: url('/image/${imageId}?preview');`);
      },
    })
    .on('.smallImg-header', {
      element(element: Element) {
        const imageId = new URL(latestImage.url).searchParams.get('id');
        element.setAttribute('style', `background-image: url('/image/${imageId}?small');`);
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
    })
    .on('#archive-list', {
      element(element: Element) {
        element.setInnerContent(archiveHTML, { html: true });
      },
    });

  return rewriter.transform(new Response(__HTML__, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  }));
}

// --- Main Fetch Handler ---

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // --- Asset Routes ---
    if (pathname === '/app.js') return getAssetResponse(__JS__, 'application/javascript');
    if (pathname === '/style.css') return getAssetResponse(__CSS__, 'text/css');

    // --- Image Proxy Routes ---
    if (pathname === '/image/latestImage') {
      const monthStr = new Date().toISOString().slice(0, 7);
      const imageData = await getImageData('en-US', monthStr, env);
      if (!imageData || imageData.length === 0) return getErrorResponse();
      
      const latestImage = imageData[0];
      const imageId = new URL(latestImage.url).searchParams.get('id');
      const imageUrl = new URL(`/image/${imageId}`, request.url).toString();
      return Response.redirect(imageUrl, 302);
    }
    if (pathname.startsWith('/image/')) return handleImageProxy(request, ctx);

    // --- Dynamic Page Routes (with strict validation) ---
    const validPathRegex = /^\/(zh-cn|zh-hk)?(\/\d{4}-\d{2})?$/;
    if (validPathRegex.test(pathname)) {
      return handleMainPage(request, env);
    }

    // --- Static Assets ---
    const staticAssetResponse = await env.ASSETS.fetch(request);
    if (staticAssetResponse.status < 400) {
        return staticAssetResponse;
    }

    // --- Fallback to Error Page for any other path ---
    return getErrorResponse();
  },
};
