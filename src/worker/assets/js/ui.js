let sidebar;
let overlay;
let darkModeToggle;
let lightModeIcon;
let darkModeIcon;

export function initializeUI() {
    sidebar = document.getElementById('sidebar');
    overlay = document.getElementById('overlay');
    darkModeToggle = document.getElementById('dark-mode-toggle');
    lightModeIcon = document.querySelector('.icon-light-mode');
    darkModeIcon = document.querySelector('.icon-dark-mode');

    const isDarkMode = localStorage.getItem('theme') === 'dark';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        lightModeIcon.style.display = 'block';
        darkModeIcon.style.display = 'none';
    }
}

export function openSidebar() {
    sidebar.style.display = 'block';
    overlay.style.display = 'block';
    // Force reflow
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
}

export function closeSidebar() {
    sidebar.style.display = 'none';
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

export function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    lightModeIcon.style.display = isDarkMode ? 'block' : 'none';
    darkModeIcon.style.display = isDarkMode ? 'none' : 'block';
}

export function showOfflineBanner() {
    const offlineBanner = document.getElementById('offline-banner');
    offlineBanner.style.display = 'block';
    offlineBanner.textContent = getLocale('offline');
}

export function updateText(key, replacements = {}) {
    const element = document.querySelector(`[data-key="${key}"]`);
    if (element) {
        let text = getLocale(key);
        for (const placeholder in replacements) {
            text = text.replace(`{{${placeholder}}}`, replacements[placeholder]);
        }
        element.innerHTML = text;
    }
}
