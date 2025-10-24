// These variables will be replaced by the build script with the minified file contents.
declare const __HTML__: string;
declare const __JS__: string;
declare const __CSS__: string;

interface BingImage {
  desc: string;
  date: string;
  url: string;
}

// This function fetches the correct JSON for the current month and region from the ASSETS binding
async function getImageData(region: string, env: Env): Promise<BingImage[] | null> {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const monthStr = `${year}-${month}`;
  const dataPath = `/data/${region}/${monthStr}.json`;

  try {
    const response = await env.ASSETS.fetch(new Request(new URL(dataPath, 'https://example.com')));
    if (!response.ok) {
      console.error(`Failed to fetch image data: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error(`Could not load data for region ${region} and month ${monthStr}`, e);
    return null;
  }
}

async function getMonthsData(region: string, env: Env): Promise<string[] | null> {
  const dataPath = `/data/${region}/months.json`;
  try {
    const response = await env.ASSETS.fetch(new Request(new URL(dataPath, 'https://example.com')));
    if (!response.ok) {
      console.error(`Failed to fetch months data: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error(`Could not load months data for region ${region}`, e);
    return null;
  }
}

async function handleImageProxy(request: Request, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const imageId = url.pathname.replace('/image/', '');
  if (!imageId) {
    return new Response('Missing image ID', { status: 400 });
  }

  // Determine image size from query params
  let bingUrl = `https://bing.com/th?id=${imageId}`;
  if (url.searchParams.has('small')) {
    bingUrl += '&w=384&h=216';
  } else if (url.searchParams.has('preview')) {
    bingUrl += '&w=2000';
  }
  // Default is full UHD resolution

  const cache = (caches as any).default;
  const cacheKey = new Request(bingUrl);
  let response = await cache.match(cacheKey);

  if (!response) {
    console.log(`Cache miss for ${bingUrl}. Fetching from origin.`);
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
  } else {
    console.log(`Cache hit for ${bingUrl}.`);
  }

  return response;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Image proxy route
    if (pathname.startsWith('/image/')) {
      return handleImageProxy(request, ctx);
    }

    // Handle asset requests
    if (pathname === '/app.js') {
      return new Response(__JS__, {
        headers: { 'Content-Type': 'application/javascript;charset=UTF-8' },
      });
    }
    if (pathname === '/style.css') {
      return new Response(__CSS__, {
        headers: { 'Content-Type': 'text/css;charset=UTF-8' },
      });
    }

    let region = pathname.split('/')[1] || 'en-US';
    const regionMap: { [key: string]: string } = {
      'zh-cn': 'zh-CN',
      'zh-hk': 'zh-HK',
    };
    region = regionMap[region.toLowerCase()] || region;
    const supportedRegions = ['en-US', 'zh-CN', 'zh-HK'];

    // If the path is not the root and not a supported region, treat it as a static asset
    if (pathname !== '/' && !supportedRegions.includes(region)) {
      return env.ASSETS.fetch(request);
    }

    // --- Dynamic Page Rendering ---
    let activeRegion = region;
    if (!supportedRegions.includes(activeRegion)) {
        activeRegion = 'en-US'; // Default to en-US if region is invalid
    }

    const [imageData, monthsData] = await Promise.all([
      getImageData(activeRegion, env),
      getMonthsData(activeRegion, env)
    ]);

    if (!imageData || imageData.length === 0) {
      return new Response(`No image data found for the current month in region: ${activeRegion}.`, { status: 404 });
    }

    const latestImage = imageData[0];

    const imageGridHTML = imageData.map(img => {
      const imageId = new URL(img.url).searchParams.get('id');
      if (!imageId) return ''; // Should not happen

      const lowResUrl = `/image/${imageId}?small`;
      const highResUrl = `/image/${imageId}`; // Full res for lightbox
      const placeholderSrc = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      return `
      <div class="portfolio-item" 
           onmouseover="handleImageMouseover(this, '${highResUrl}')" 
           onmouseout="handleImageMouseout(this, '${lowResUrl}')"
           onclick="openLightbox('${highResUrl}', '${img.desc}')">
        <img data-src="${lowResUrl}" src="${placeholderSrc}" alt="${img.desc}" class="lazy">
        <div class="description">
          <p>${img.desc}</p>
        </div>
      </div>
    `}).join('');

    const rewriter = new HTMLRewriter()
      .on('.bgimg-header', {
        element(element) {
          const imageId = new URL(latestImage.url).searchParams.get('id');
          const proxiedUrl = `/image/${imageId}?preview`;
          element.setAttribute('style', `background-image: url('${proxiedUrl}');`);
        },
      })
      .on('.smallImg-header', {
        element(element) {
          const imageId = new URL(latestImage.url).searchParams.get('id');
          const proxiedUrl = `/image/${imageId}?small`;
          element.setAttribute('style', `background-image: url('${proxiedUrl}');`);
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
      });

    const response = new Response(__HTML__, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
      },
    });

    return rewriter.transform(response);
  },
};
