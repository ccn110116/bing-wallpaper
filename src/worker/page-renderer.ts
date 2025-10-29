import { BingImage, Env } from './types';

declare const __HTML__: string;
declare const __ERROR_HTML__: string;

// Cache compiled regex
const URL_PARSER = /[?&]id=([^&]+)/;

function getErrorResponse(): Response {
  return new Response(__ERROR_HTML__, {
    status: 404,
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

async function fetchJson<T>(path: string, env: Env): Promise<T | null> {
  try {
    const response = await env.ASSETS.fetch(new Request(new URL(path, 'https://example.com')));
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error(`Could not load JSON from ${path}`, e);
    return null;
  }
}

export function getImageData(region: string, monthStr: string, env: Env): Promise<BingImage[] | null> {
  return fetchJson<BingImage[]>(`/data/${region}/${monthStr}.json`, env);
}

function getMonthsData(region: string, env: Env): Promise<string[] | null> {
  return fetchJson<string[]>(`/data/${region}/months.json`, env);
}

// Extract image ID more efficiently
function extractImageId(url: string): string | null {
  const match = url.match(URL_PARSER);
  return match ? match[1] : null;
}

// Escape HTML more efficiently
function escapeHtml(text: string): string {
  return text.replace(/'/g, "\\'");
}

export async function handleMainPage(request: Request, env: Env, activeRegion: string, monthStr: string): Promise<Response> {
  const [imageData, monthsData] = await Promise.all([
    getImageData(activeRegion, monthStr, env),
    getMonthsData(activeRegion, env)
  ]);

  if (!imageData || imageData.length === 0) {
    return getErrorResponse();
  }

  const latestImage = imageData[0];
  const latestImageId = extractImageId(latestImage.url);

  // Build HTML more efficiently using array join
  const imageGridItems: string[] = [];
  for (const img of imageData) {
    const imageId = extractImageId(img.url);
    if (!imageId) continue;
    
    const caption = escapeHtml(img.desc);
    const description = `${img.date}: ${img.desc}`;
    imageGridItems.push(
      `<a href="#" class="portfolio-item" data-image-id="${imageId}" data-caption="${caption}" data-bg="/image/${imageId}?small"><div class="description"><p>${description}</p></div></a>`
    );
  }
  const imageGridHTML = imageGridItems.join('');

  const rewriter = new HTMLRewriter()
    .on('.bgimg-header', {
      element(element: Element) {
        element.setAttribute('style', `background-image: url('/image/${latestImageId}?2k');`);
      },
    })
    .on('.smallImg-header', {
      element(element: Element) {
        element.setAttribute('style', `background-image: url('/image/${latestImageId}?small');`);
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

  return rewriter.transform(new Response(__HTML__, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  }));
}
