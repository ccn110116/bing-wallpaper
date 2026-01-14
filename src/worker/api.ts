import type { BingImage, Env } from '../shared/types';
import { fetchJson } from './utils';

export async function handleLatestImage(env: Env, requestUrl: string): Promise<Response> {
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
