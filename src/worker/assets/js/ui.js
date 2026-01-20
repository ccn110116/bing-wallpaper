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

    // Check localStorage first, then fall back to system preference
    let isDarkMode = localStorage.getItem('theme') === 'dark';
    if (localStorage.getItem('theme') === null) {
        // No saved preference, use system preference
        isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    if (isDarkMode) {
        loadDarkModeCSS();
        document.body.classList.add('dark-mode');
        lightModeIcon.style.display = 'block';
        darkModeIcon.style.display = 'none';
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('theme') === null) {
            if (e.matches) {
                loadDarkModeCSS();
                document.body.classList.add('dark-mode');
                lightModeIcon.style.display = 'block';
                darkModeIcon.style.display = 'none';
            } else {
                document.body.classList.remove('dark-mode');
                lightModeIcon.style.display = 'none';
                darkModeIcon.style.display = 'block';
            }
        }
    });

    // Show/hide sticky nav based on header scroll
    const nav = document.querySelector('.sticky-nav');
    const header = document.getElementById('header-container');
    function updateNavVisibility() {
        if (!nav) return;
        const threshold = header ? Math.max(0, header.offsetHeight - 64) : 120;
        if (window.scrollY > threshold) nav.classList.add('visible');
        else nav.classList.remove('visible');
    }
    updateNavVisibility();
    window.addEventListener('scroll', updateNavVisibility, { passive: true });
}

function loadDarkModeCSS() {
    if (!document.querySelector('link[href="/css/dark-mode.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/dark-mode.css';
        document.head.appendChild(link);
    }
}

export function openSidebar() {
    sidebar.style.display = 'block';
    setTimeout(() => {
        sidebar.style.left = '0';
    }, 10);
    overlay.style.display = 'block';
    // Force reflow
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
}

export function closeSidebar() {
    sidebar.style.left = '-250px';
    overlay.style.opacity = '0';
    setTimeout(() => {
        sidebar.style.display = 'none';
        overlay.style.display = 'none';
    }, 300);
}

export function toggleDarkMode() {
    const isDarkMode = !document.body.classList.contains('dark-mode');
    
    if (isDarkMode) {
        loadDarkModeCSS();
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
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
