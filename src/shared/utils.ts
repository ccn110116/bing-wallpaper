export const BING_URL = "https://bing.com";
export const CACHE_TTL = 2592000; // 30 days in seconds
export const MONTH_REGEX = /^\d{4}-\d{2}$/; // Pre-compile regex
export const BING_API_TEMPLATE = "https://global.bing.com/HPImageArchive.aspx?format=js&idx=0&n=9&pid=hp&FORM=BEHPTB&uhd=1&uhdwidth=3840&uhdheight=2160&setmkt=%s&setlang=en";
export const DATA_PATH = 'assets/data';
export const README_PATH = 'dist/README.md';
export const supportedRegions: ReadonlyMap<string, string> = new Map([
  ['en-us', 'en-US'],
  ['zh-cn', 'zh-CN']
]);

export function getCanonicalRegion(region: string): string | undefined {
  return supportedRegions.get(region.toLowerCase());
}

const URL_PARSER = /[?&]id=([^&]+)/;

export function extractImageId(url: string): string | null {
  const match = url.match(URL_PARSER);
  return match ? match[1] : null;
}

export function getImageUrl(id: string, resolution: 'small' | '2k' | '4k' = '4k'): string {
    const params = new URLSearchParams();
    params.set('id', id);
    if (resolution === 'small') {
        params.set('w', '384');
        params.set('h', '216');
    } else if (resolution === '2k') {
        params.set('w', '1920');
    }
    return `${BING_URL}/th?${params.toString()}`;
}

export function escapeHtml(text: string): string {
  return text.replace(/'/g, "\\'");
}
