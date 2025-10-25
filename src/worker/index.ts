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

async function handleImageProxy(request: Request, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const imageId = url.pathname.replace('/image/', '');
  if (!imageId) return new Response('Missing image ID', { status: 400 });

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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/app.js') return getAssetResponse(__JS__, 'application/javascript');
    if (pathname === '/style.css') return getAssetResponse(__CSS__, 'text/css');

    if (pathname === '/image/latestImage') {
      const monthStr = new Date().toISOString().slice(0, 7);
      const imageData = await getImageData('en-US', monthStr, env);
      if (!imageData || imageData.length === 0) return getErrorResponse();
      
      const latestImage = imageData[0];
      const imageId = new URL(latestImage.url).searchParams.get('id');
      const imageUrl = new URL(`/image/${imageId}?preview`, request.url).toString();
      return Response.redirect(imageUrl, 302);
    }
    if (pathname.startsWith('/image/')) return handleImageProxy(request, ctx);

    const validPathRegex = /^\/((en-us|zh-cn|zh-hk)(\/\d{4}-\d{2})?|\d{4}-\d{2})?$/i;
    if (validPathRegex.test(pathname)) {
      return handleMainPage(request, env, getErrorResponse());
    }

    const staticAssetResponse = await env.ASSETS.fetch(request);
    if (staticAssetResponse.status < 400) {
        return staticAssetResponse;
    }

    return getErrorResponse();
  },
};
