import type { BingImage, Env } from '../shared/types';
import { fetchJson } from './utils';
import { IMAGE_RESOLUTIONS } from '../shared/constants';

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
  // Use lower resolution (small) for error page background to save bandwidth
  const { width, height } = IMAGE_RESOLUTIONS.small;
  const lowResUrl = `${imageUrl}&w=${width}&h=${height}`;
  
  try {
      const imageRes = await fetch(lowResUrl);
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
