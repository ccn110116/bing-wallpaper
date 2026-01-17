import { initializeUI, showOfflineBanner } from './ui.js';
import { initializeLightbox } from './lightbox.js';
import { setupEventListeners } from './listeners.js';

// --- Utilities (from utils.js) ---
function lazyLoadImage(item) {
  const bg = item.dataset.bg;
  if (bg) {
    item.style.backgroundImage = `url(${bg})`;
    item.classList.add('loaded');
    item.classList.remove('lazy-bg');
    item.removeAttribute('data-bg');
  }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    initializeLightbox();
    setupEventListeners();

    // Init listeners
    window.addEventListener('offline', showOfflineBanner);

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
