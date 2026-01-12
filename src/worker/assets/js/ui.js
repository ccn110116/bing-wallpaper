/**
 * UI initialization and management
 */

import { getLang, getLocale } from './main.js';

let sidebar;
let overlay;
let darkModeToggle;
let lightModeIcon;
let darkModeIcon;

/**
 * Initialize UI elements and set up dark mode preference
 */
export function initializeUI() {
  sidebar = document.getElementById('sidebar');
  overlay = document.getElementById('overlay');
  darkModeToggle = document.getElementById('dark-mode-toggle');
  lightModeIcon = document.querySelector('.icon-light-mode');
  darkModeIcon = document.querySelector('.icon-dark-mode');

  const isDarkMode = localStorage.getItem('theme') === 'dark';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    if (lightModeIcon) lightModeIcon.style.display = 'block';
    if (darkModeIcon) darkModeIcon.style.display = 'none';
  }
}

/**
 * Open the sidebar navigation
 */
export function openSidebar() {
  if (sidebar) sidebar.style.display = 'block';
  if (overlay) overlay.style.display = 'block';
}

/**
 * Close the sidebar navigation
 */
export function closeSidebar() {
  if (sidebar) sidebar.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
}

/**
 * Toggle dark mode on/off
 */
export function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  if (lightModeIcon) lightModeIcon.style.display = isDarkMode ? 'block' : 'none';
  if (darkModeIcon) darkModeIcon.style.display = isDarkMode ? 'none' : 'block';
}

/**
 * Show offline banner notification
 */
export function showOfflineBanner() {
  const offlineBanner = document.getElementById('offline-banner');
  if (offlineBanner) {
    offlineBanner.style.display = 'block';
    offlineBanner.textContent = getLocale('offline');
  }
}

/**
 * Update text content for an element by key with optional replacements
 */
export function updateText(key, replacements = {}) {
  const element = document.querySelector(`[data-key="${key}"]`);
  if (element) {
    let text = getLocale(key);
    for (const [placeholder, value] of Object.entries(replacements)) {
      text = text.replace(`{{${placeholder}}}`, value);
    }
    element.innerHTML = text;
  }
}
