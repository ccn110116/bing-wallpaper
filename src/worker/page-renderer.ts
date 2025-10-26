import { BingImage, Env } from './types';

declare const __HTML__: string;
declare const __ERROR_HTML__: string;

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

export async function handleMainPage(request: Request, env: Env, activeRegion: string, monthStr: string): Promise<Response> {
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
    const caption = img.desc.replace(/'/g, "\\'");
    return `<div class="portfolio-item" data-image-id="${imageId}" data-caption="${caption}" data-bg="/image/${imageId}?small"><div class="description"><p>${img.desc}</p></div></div>`;
  }).join('');

  const rewriter = new HTMLRewriter()
    .on('.bgimg-header', {
      element(element: Element) {
        const imageId = new URL(latestImage.url).searchParams.get('id');
        element.setAttribute('style', `background-image: url('/image/${imageId}?2k');`);
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
    });

  return rewriter.transform(new Response(__HTML__, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  }));
}
