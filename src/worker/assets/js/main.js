/**
 * Main entry point for the Bing Wallpaper frontend (Client-side Rendering version)
 */

import { initializeUI, showOfflineBanner, updateText } from './ui.js';
import { initializeLightbox } from './lightbox.js';
import { setupEventListeners } from './listeners.js';

// --- Constants & Utils ---

const BING_URL = 'https://bing.com';
const URL_PARSER = /[?&]id=([^&]+)/;
const IMAGE_RESOLUTIONS = {
  small: { width: 384, height: 216 },
  '2k': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
};

function extractImageId(url) {
  const match = url.match(URL_PARSER);
  return match ? match[1] : null;
}

function getImageUrl(id, resolution = '4k') {
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

function lazyLoadImage(item) {
  const bg = item.dataset.bg;
  if (bg) {
    item.style.backgroundImage = `url(${bg})`;
    item.classList.add('loaded');
  }
}

// --- I18n & Data ---
let currentLang;
let locales;
let activeRegion = 'en-US';
let currentMonth;

async function fetchLocales() {
  try {
    const response = await fetch('/locales.json');
    if (!response.ok) throw new Error('Failed to fetch locales');
    window.locales = await response.json();
    initializeI18n();
  } catch (error) {
    console.error('Error fetching locales:', error);
    // Fallback?
    window.locales = { 'en-US': { htmlTitle: 'Bing Wallpaper' } };
    initializeI18n();
  }
}

function initializeI18n() {
  locales = window.locales;
  // Simple logic to detect language from URL or browser
  // For now defaults to en-US or uses basic browser detection if not specifying in URL (CSR specific logic)
  const lang = navigator.language || 'en-US';
  setLang(lang);
  updateAllText();
}

function setLang(lang) {
  // Simple mapping, can be improved to match `getBestLanguage` logic from worker if needed
  if (locales[lang]) {
    currentLang = lang;
  } else {
    const langPrefix = lang.split('-')[0];
    const match = Object.keys(locales).find(l => l.startsWith(langPrefix));
    currentLang = match || 'en-US';
  }
  document.documentElement.lang = currentLang;
}

export function getLang() {
  return currentLang;
}

export function getLocale(key) {
  return (locales && locales[currentLang] && locales[currentLang][key]) || key;
}

function updateAllText() {
    updateText('h1Title');
    updateText('home');
    updateText('archive');
    updateText('about');
    updateText('github');
    updateText('us');
    updateText('cn');
    updateText('footerLine1');
    updateText('footerLine2', { author: '<a href="https://www.wdbyte.com" target="_blank">Wdbyte.com</a>' });
    updateText('footerLine3', { projectName: '<a href="https://github.com/niumoo/bing-wallpaper" target="_blank">Bing Wallpaper</a>' });
}

// --- Data Fetching & Rendering ---

function parseUrlParams() {
    // Basic router to determine region/month from URL path
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    
    // Default
    activeRegion = 'en-US';
    currentMonth = new Date().toISOString().slice(0, 7);

    // Heuristic: check if parts[0] is region (en-us, zh-cn) or month (yyyy-mm)
    if (parts.length > 0) {
        if (/^\d{4}-\d{2}$/.test(parts[0])) {
            currentMonth = parts[0];
        } else if (['en-us', 'zh-cn'].includes(parts[0].toLowerCase())) {
            activeRegion = parts[0] === 'zh-cn' ? 'zh-CN' : 'en-US'; // map cleanly
            if (parts.length > 1 && /^\d{4}-\d{2}$/.test(parts[1])) {
                currentMonth = parts[1];
            }
        }
    }
}

async function fetchDataAndRender() {
    try {
        const response = await fetch(`/data/${activeRegion}/${currentMonth}.json`);
        if (!response.ok) {
            console.error(`Failed to load data for ${activeRegion}/${currentMonth}`);
            return;
        }
        const imageData = await response.json();
        renderImages(imageData);
    } catch (e) {
        console.error("Error fetching image data", e);
    }
}

function renderImages(imageData) {
    if (!imageData || imageData.length === 0) return;

    const latestImage = imageData[0];
    const latestImageId = extractImageId(latestImage.url);
    
    // Render Header
    if (latestImageId) {
        const bgHeader = document.querySelector('.bgimg-header');
        const smallHeader = document.querySelector('.smallImg-header');
        const descP = document.querySelector('.display-middle p');
        
        if (bgHeader) bgHeader.style.backgroundImage = `url('${getImageUrl(latestImageId, '2k')}')`;
        if (smallHeader) smallHeader.style.backgroundImage = `url('${getImageUrl(latestImageId, 'small')}')`;
        if (descP) descP.innerText = latestImage.desc;
    }

    // Render Grid
    const grid = document.getElementById('img_list');
    if (grid) {
        grid.innerHTML = ''; // Clear existing
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    lazyLoadImage(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        });

        imageData.forEach(img => {
            const imageId = extractImageId(img.url);
            if (!imageId) return;

            const caption = img.desc.replace(/'/g, "\\'"); // escape html equivalent
            const description = `${img.date}: ${img.desc}`;
            
            // Create element
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'portfolio-item';
            a.dataset.imageId = imageId;
            a.dataset.caption = caption;
            a.dataset.bg = getImageUrl(imageId, 'small');
            a.dataset.url2k = getImageUrl(imageId, '2k');
            a.dataset.url4k = getImageUrl(imageId, '4k');
            
            const div = document.createElement('div');
            div.className = 'description';
            const p = document.createElement('p');
            p.textContent = description;
            
            div.appendChild(p);
            a.appendChild(div);
            grid.appendChild(a);
            
            observer.observe(a);
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
  initializeUI();
  initializeLightbox();
  setupEventListeners();
  window.addEventListener('offline', showOfflineBanner);

  // CSR Initialization flow
  await fetchLocales(); // Gets locales and inits i18n
  parseUrlParams();    // Determines what to show
  fetchDataAndRender(); // Fetches data and updates DOM
});
