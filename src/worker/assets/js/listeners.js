/**
 * Event listeners setup
 */

import { openSidebar, closeSidebar, toggleDarkMode } from './ui.js';
import { openLightbox, closeLightbox, setResolution, downloadImage } from './lightbox.js';

/**
 * Set up all event listeners for user interactions
 */
export function setupEventListeners() {
  // Sidebar listeners
  const archiveLink = document.querySelector('[data-key="archive"]');
  const closeButton = document.querySelector('.sidebar .bar-item.button');
  const overlay = document.getElementById('overlay');

  if (archiveLink) {
    archiveLink.addEventListener('click', openSidebar);
  }
  if (closeButton) {
    closeButton.addEventListener('click', closeSidebar);
  }
  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  // Dark mode listener
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', toggleDarkMode);
  }

  // Lightbox listeners
  const imgList = document.getElementById('img_list');
  if (imgList) {
    imgList.addEventListener('click', (event) => {
      const target = event.target;
      const item = target.closest('.portfolio-item');
      if (item) {
        event.preventDefault();
        openLightbox(item);
      }
    });
  }

  const closeLightboxBtn = document.querySelector('.close-lightbox');
  if (closeLightboxBtn) {
    closeLightboxBtn.addEventListener('click', closeLightbox);
  }

  // Resolution buttons
  document.querySelectorAll('.res-button').forEach((button) => {
    button.addEventListener('click', () => {
      setResolution(button.dataset.res);
    });
  });

  // Download button
  const downloadBtn = document.getElementById('download-link');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', (event) => {
      event.preventDefault();
      downloadImage();
    });
  }
}
}
