/**
 * Central configuration and constants for the Bing Wallpaper project
 */

// --- API & URLs ---
export const BING_URL = 'https://bing.com';
export const BING_API_TEMPLATE = 'https://global.bing.com/HPImageArchive.aspx?format=js&idx=0&n=9&pid=hp&FORM=BEHPTB&uhd=1&uhdwidth=3840&uhdheight=2160&setmkt=%s&setlang=en';
export const HTTP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36';

// --- Cache & Performance ---
export const CACHE_TTL = 2592000; // 30 days in seconds

// --- File Paths & Directories ---
export const DATA_PATH = 'src/worker/assets/data';
export const README_PATH = 'README.md';

// --- Supported Regions & Languages ---
export const supportedRegions = {
  'en-us': 'en-us',
  'zh-cn': 'zh-cn',
} as const;

export const DEFAULT_REGION = 'en-us';
export const DEFAULT_LANGUAGE = 'en-us';

// --- Regular Expressions ---
export const MONTH_REGEX = /^\d{4}-\d{2}$/; // Pre-compiled regex for YYYY-MM format
export const URL_PARSER = /[?&]id=([^&]+)/;

// --- Image Resolutions ---
export const IMAGE_RESOLUTIONS = {
  small: { width: 384, height: 216 },
  '2k': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
} as const;

export const DEFAULT_IMAGE_RESOLUTION = '4k' as const;

// --- Routes & Endpoints ---
export const STATIC_ROUTES = ['/js/main.js', '/style.css', '/locales.json'] as const;
export const API_ROUTES = {
  latestImage: '/image/latestImage',
  data: '/data/',
} as const;

// --- Content Types ---
export const CONTENT_TYPES = {
  json: 'application/json',
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  javascript: 'text/javascript; charset=utf-8',
} as const;
