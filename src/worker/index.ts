// These variables will be replaced by the build script with the minified file contents.
declare const __HTML__: string;
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
      console.error(`Failed to fetch JSON from ${path}: ${response.status} ${response.statusText}`);
      return null;
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

// --- Request Handlers ---

async function handleImageProxy(request: Request, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const imageId = url.pathname.replace('/image/', '');
  if (!imageId) {
    return new Response('Missing image ID', { status: 400 });
  }

  let bingUrl = `https://bing.com/th?id=${imageId}`;
  if (url.searchParams.has('small')) {
    bingUrl += '&w=384&h=216';
  } else if (url.searchParams.has('preview')) {
    bingUrl += '&w=2000';
  }

  const cache = (caches as any).default;
  const cacheKey = new Request(bingUrl);
  let response = await cache.match(cacheKey);

  if (!response) {
    response = await fetch(bingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'
      }
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

  if (pathSegments.length > 0) {
    const regionOrMonth = pathSegments[0].toLowerCase();
    if (supportedRegions.includes(regionMap[regionOrMonth] || regionOrMonth)) {
      activeRegion = regionMap[regionOrMonth] || regionOrMonth;
      if (pathSegments.length > 1 && /^\d{4}-\d{2}$/.test(pathSegments[1])) {
        monthStr = pathSegments[1];
      }
    } else if (/^\d{4}-\d{2}$/.test(regionOrMonth)) {
      monthStr = regionOrMonth;
    }
  }

  const [imageData, monthsData] = await Promise.all([
    getImageData(activeRegion, monthStr, env),
    getMonthsData(activeRegion, env)
  ]);

  if (!imageData || imageData.length === 0) {
    return new Response(`No image data found for ${monthStr} in region: ${activeRegion}.`, { status: 404 });
  }

  const latestImage = imageData[0];

  const imageGridHTML = imageData.map(img => {
    const imageId = new URL(img.url).searchParams.get('id');
    if (!imageId) return '';
    const lowResUrl = `/image/${imageId}?small`;
    const highResUrl = `/image/${imageId}`;
    const placeholderSrc = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    
    return `
    <div class="portfolio-item" 
         onclick="openLightbox('${highResUrl}', '${img.desc}')">
      <img data-src="${lowResUrl}" src="${placeholderSrc}" alt="${img.desc}" class="lazy">
      <div class="description"><p>${img.desc}</p></div>
    </div>`;
  }).join('');

  const archiveHTML = monthsData?.map(month => 
    `<a href="/${activeRegion.toLowerCase()}/${month}" class="bar-item button">${month}</a>`
  ).join('') || '';

  const rewriter = new HTMLRewriter()
    .on('.bgimg-header', {
      element(element) {
        const imageId = new URL(latestImage.url).searchParams.get('id');
        element.setAttribute('style', `background-image: url('/image/${imageId}?preview');`);
      },
    })
    .on('.smallImg-header', {
      element(element) {
        const imageId = new URL(latestImage.url).searchParams.get('id');
        element.setAttribute('style', `background-image: url('/image/${imageId}?small');`);
      },
    })
    .on('.display-middle p', {
      element(element) {
        element.setInnerContent(latestImage.desc);
      },
    })
    .on('#img_list', {
      element(element) {
        element.setInnerContent(imageGridHTML, { html: true });
      },
    })
    .on('#archive-list', {
      element(element) {
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

    if (pathname.startsWith('/image/')) {
      return handleImageProxy(request, ctx);
    }
    if (pathname === '/app.js') {
      return getAssetResponse(__JS__, 'application/javascript');
    }
    if (pathname === '/style.css') {
      return getAssetResponse(__CSS__, 'text/css');
    }

    // Check for static assets first
    const staticAssetResponse = await env.ASSETS.fetch(request);
    if (staticAssetResponse.status !== 404) {
        return staticAssetResponse;
    }

    // If not a static asset, it's a request for the main page
    return handleMainPage(request, env);
  },
};
