import { initializeUI, showOfflineBanner, updateText } from './ui.js';
import { initializeLightbox } from './lightbox.js';
import { setupEventListeners } from './listeners.js';

// --- Utilities (from utils.js) ---
function lazyLoadImage(item) {
  const bg = item.dataset.bg;
  if (bg) {
    item.style.backgroundImage = `url(${bg})`;
    item.classList.add('loaded');
  }
}

// --- I18n (from i18n.js) ---
let currentLang;
let locales;

function initializeI18n() {
    locales = window.locales;
    const lang = document.documentElement.lang || 'en-US';
    setLang(lang);
}

function setLang(lang) {
    currentLang = lang;
}

export function getLang() {
    return currentLang;
}

export function getLocale(key) {
    return locales[currentLang][key] || key;
}

document.addEventListener('DOMContentLoaded', () => {
    initializeI18n();
    initializeUI();
    initializeLightbox();
    setupEventListeners();

    // Init listeners
    window.addEventListener('offline', showOfflineBanner);

    // Update texts
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

    // Lazy load images
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                lazyLoadImage(entry.target);
                observer.unobserve(entry.target);
            }
        });
    });

    document.querySelectorAll('.portfolio-item').forEach(item => {
        observer.observe(item);
    });
});
