import {
  BING_URL,
  CACHE_TTL,
  MONTH_REGEX,
  BING_API_TEMPLATE,
  DATA_PATH,
  README_PATH,
  supportedRegions,
  URL_PARSER,
  DEFAULT_IMAGE_RESOLUTION,
  IMAGE_RESOLUTIONS,
} from './constants';

export {
  BING_URL,
  CACHE_TTL,
  MONTH_REGEX,
  BING_API_TEMPLATE,
  DATA_PATH,
  README_PATH,
  supportedRegions,
};

export function getCanonicalRegion(region: string): string | undefined {
  return (supportedRegions as any)[region.toLowerCase()];
}

export function extractImageId(url: string): string | null {
  const match = url.match(URL_PARSER);
  return match ? match[1] : null;
}

export function getImageUrl(id: string, resolution: 'small' | '2k' | '4k' = '4k'): string {
    const params = new URLSearchParams();
    params.set('id', id);
    const res = IMAGE_RESOLUTIONS[resolution];
    if (resolution === 'small') {
        params.set('w', res.width.toString());
        params.set('h', res.height.toString());
    } else if (resolution === '2k') {
        params.set('w', res.width.toString());
    }
    return `${BING_URL}/th?${params.toString()}`;
}

export function escapeHtml(text: string): string {
  return text.replace(/'/g, "\\'");
}
