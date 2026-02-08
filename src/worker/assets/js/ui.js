let sidebar;
let overlay;
let darkModeToggle;
let lightModeIcon;
let darkModeIcon;

export function initializeUI() {
    // Show/hide sticky nav using IntersectionObserver for reliable toggling
    const nav = document.querySelector('.sticky-nav');
    const header = document.getElementById('header-container');

    if (nav) {
        const sentinel = document.createElement('div');
        sentinel.id = 'nav-sentinel';
        sentinel.style.height = '1px';
        sentinel.style.width = '100%';
        sentinel.style.pointerEvents = 'none';
        if (header) header.insertAdjacentElement('afterend', sentinel);
        else document.body.prepend(sentinel);

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                const entry = entries[0];
                if (!entry) return;
                if (entry.isIntersecting) nav.classList.remove('visible');
                else nav.classList.add('visible');
            }, { rootMargin: '-72px 0px 0px 0px', threshold: 0 });
            observer.observe(sentinel);
        } else {
            // Fallback for older browsers
            const fallback = () => {
                const threshold = header ? Math.max(80, header.offsetHeight * 0.35) : 120;
                if (window.scrollY > threshold) nav.classList.add('visible');
                else nav.classList.remove('visible');
            };
            fallback();
            window.addEventListener('scroll', fallback, { passive: true });
        }
    }

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
