/**
 * Main entry point for the Bing Wallpaper frontend (SSR Hydration version)
 */

import { initializeUI, showOfflineBanner } from './ui.js';
import { initializeLightbox } from './lightbox.js';
import { setupEventListeners } from './listeners.js';

let currentLang = document.documentElement.lang || 'en-us';

export function getLang() {
  return currentLang;
}

export function getLocale(key) {
  const locales = window.locales;
  return (locales && locales[currentLang] && locales[currentLang][key]) || key;
}

document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    initializeLightbox();
    setupEventListeners();
    window.addEventListener('offline', showOfflineBanner);
});
