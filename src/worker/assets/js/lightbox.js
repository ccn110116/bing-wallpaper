/**
 * Lightbox modal functionality for image viewing
 */

import { getLocale } from './main.js';

let lightbox;
let lightboxImg;
let lightboxCaption;
let bingLink;
let downloadLink;
let currentItem;
let currentResolution = '4k';

/**
 * Initialize lightbox DOM elements
 */
export function initializeLightbox() {
  lightbox = document.getElementById('lightbox');
  lightboxImg = document.getElementById('lightbox-img');
  lightboxCaption = document.getElementById('lightbox-caption');
  bingLink = document.getElementById('bing-link');
  downloadLink = document.getElementById('download-link');
}

/**
 * Open the lightbox with an image item
 */
export function openLightbox(item) {
  currentItem = item;
  document.body.classList.add('lightbox-open');
  if (lightbox) lightbox.style.display = 'block';
  setTimeout(() => {
    if (lightbox) lightbox.classList.add('visible');
  }, 10);
  if (lightboxCaption) lightboxCaption.innerHTML = item.dataset.caption;
  if (bingLink) bingLink.href = item.dataset.url4k;
  updateLightboxImage();
}

/**
 * Close the lightbox modal
 */
export function closeLightbox() {
  if (lightbox) lightbox.classList.remove('visible');
  setTimeout(() => {
    if (lightbox) lightbox.style.display = 'none';
    document.body.classList.remove('lightbox-open');
  }, 300);
}

/**
 * Set the resolution for the lightbox image
 */
export function setResolution(res) {
  currentResolution = res;
  updateLightboxImage();
  document.querySelectorAll('.res-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.res === res);
  });
}

/**
 * Update the lightbox image based on current resolution
 */
function updateLightboxImage() {
  if (!currentItem || !lightboxImg || !bingLink) return;
  const imageUrl = currentItem.dataset[`url${currentResolution}`];
  lightboxImg.src = imageUrl;
  if (downloadLink) downloadLink.href = imageUrl;
  // Always have bingLink point to the 4k version for "View on Bing"
  bingLink.href = currentItem.dataset.url4k;
}

/**
 * Download the current image
 */
export function downloadImage() {
  if (!downloadLink) return;

  const downloadLoadingIcon = document.querySelector('.icon-download-loading');
  const downloadDoneIcon = document.querySelector('.icon-download-done');
  const downloadIcon = document.querySelector('.icon-download');

  if (downloadIcon) downloadIcon.style.display = 'none';
  if (downloadLoadingIcon) downloadLoadingIcon.style.display = 'block';

  fetch(downloadLink.href)
    .then((response) => response.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${currentItem.dataset.imageId}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      if (downloadLoadingIcon) downloadLoadingIcon.style.display = 'none';
      if (downloadDoneIcon) downloadDoneIcon.style.display = 'block';
      setTimeout(() => {
        if (downloadDoneIcon) downloadDoneIcon.style.display = 'none';
        if (downloadIcon) downloadIcon.style.display = 'block';
      }, 2000);
    })
    .catch(() => {
      alert(getLocale('error'));
      if (downloadLoadingIcon) downloadLoadingIcon.style.display = 'none';
      if (downloadIcon) downloadIcon.style.display = 'block';
    });
}
