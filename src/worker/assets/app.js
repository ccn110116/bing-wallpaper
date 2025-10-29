function headerImgloading() {
    const bgImg = document.querySelector('.bgimg-header');
    const smallImg = document.querySelector('.smallImg-header');

    if (!bgImg) return;

    // Try inline style first, then computed style
    const bgValue = bgImg.style.backgroundImage || getComputedStyle(bgImg).backgroundImage;
    const match = bgValue && bgValue.match(/url\(["']?(.*?)["']?\)/);
    const url = match ? match[1] : null;
    if (!url) return;

    const img = new Image();

    // Fade small image a bit while loading
    if (smallImg) smallImg.style.opacity = '0.3';

    const reveal = () => {
        // Delay small fade-out a bit for smoother transition
        setTimeout(() => {
            bgImg.style.display = 'block';
            if (smallImg) smallImg.style.opacity = '0';
        }, 200);
    };

    if ('decode' in img) {
        img.src = url;
        img.decode().then(reveal).catch(() => {
            // Fallback to onload if decode fails
            img.onload = reveal;
        });
    } else {
        img.onload = reveal;
        img.src = url;
    }
}
window.addEventListener('load', () => {
    headerImgloading();
    loadCustomFonts();
    handleOfflineStatus();
    applyTranslations();
});

// i18n
const translations = window.locales || {};
const author = '<a href="https://github.com/niumoo/bing-wallpaper" target="_blank" class="hover-text-green">Github.com/niumoo</a>';
const projectName = '<a href="https://github.com/niumoo/bing-wallpaper">bing-wallpaper</a>';

function getBestLanguage() {
    const supportedLangs = Object.keys(translations);
    const htmlLang = document.documentElement.lang;
    if (supportedLangs.includes(htmlLang)) {
        return htmlLang;
    }

    for (const lang of navigator.languages) {
        if (supportedLangs.includes(lang)) {
            return lang;
        }
        const langPrefix = lang.split('-')[0];
        const matchingLang = supportedLangs.find(l => l.startsWith(langPrefix));
        if (matchingLang) {
            return matchingLang;
        }
    }

    return 'en-US';
}

const currentLang = getBestLanguage();
function getTranslation(key) {
    const langDict = translations[currentLang] || translations['en-US'];
    let translated = langDict[key] || key;
    translated = translated.replace(/{{author}}/g, author);
    translated = translated.replace(/{{projectName}}/g, projectName);
    return translated;
};

function applyTranslations() {
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.dataset.key;
        element.innerHTML = getTranslation(key);
    });
}

// Offline detection
function handleOfflineStatus() {
    const offlineBanner = document.getElementById('offline-banner');
    if (!offlineBanner) return;

    const showOfflineBanner = () => {
        offlineBanner.style.display = 'block';
    };

    const hideOfflineBanner = () => {
        offlineBanner.style.display = 'none';
    };

    window.addEventListener('offline', showOfflineBanner);
    window.addEventListener('online', hideOfflineBanner);

    if (!navigator.onLine) {
        showOfflineBanner();
    }
}

// Function to check for font availability and load from Google Fonts if needed
function loadCustomFonts() {
    const fonts = [
        { family: 'Noto Sans Display', url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Display:wght@100..900&display=swap' },
        { family: 'Noto Sans Mono', url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Mono:wght@100..900&display=swap' }
    ];

    // Use a flag to ensure the CSS is added only once
    let cssLoaded = false;

    const loadFont = (font) => {
        // Check if the font is already available
        if (!document.fonts || !('check' in document.fonts) || document.fonts.check(`1em "${font.family}"`)) {
            return;
        }

        // If not, and the CSS hasn't been loaded yet, load it
        if (!cssLoaded) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = fonts.map(f => f.url.split('=').pop()).join('&family=');
            document.head.appendChild(link);
            cssLoaded = true;
        }
    };

    fonts.forEach(loadFont);
}

function setSidebar(open = true) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!sidebar && !overlay) return;
    [sidebar, overlay].forEach(element => element?.classList.toggle('open', !!open));
}

function openSidebar() { setSidebar(true); }
function closeSidebar() { setSidebar(false); }

document.addEventListener('DOMContentLoaded', function() {
    // Global overlay: close lightbox and/or sidebar
    const overlay = document.getElementById('overlay');
    overlay?.addEventListener('click', () => {
        const lightboxShown = document.getElementById('lightbox')?.classList.contains('show');
        const sidebarOpen = document.getElementById('sidebar')?.classList.contains('open');
        if (lightboxShown) closeLightbox();
        if (sidebarOpen) closeSidebar();
    });

    // ESC to close lightbox or sidebar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLightbox();
            closeSidebar();
        }
    });

    // Event Delegation for portfolio item clicks
    const imgList = document.getElementById('img_list');
    if (imgList) {
        imgList.addEventListener('click', function(event) {
            const item = event.target.closest('.portfolio-item');
            if (item) {
                event.preventDefault();
                const imageId = item.dataset.imageId;
                const caption = item.dataset.caption || '';
                if (imageId) openLightbox(`/image/${imageId}`, caption);
            }
        });
    }

    // Lazy Loading & Preloading Logic
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    const timers = new WeakMap();
    const saveData = navigator.connection && navigator.connection.saveData;

    const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const item = entry.target;
            const bgUrl = item.dataset.bg;
            if (bgUrl) {
                // Swap background only after the image is loaded to avoid flashes
                const img = new Image();
                img.onload = () => {
                    item.style.backgroundImage = `url("${bgUrl}")`;
                };
                img.src = bgUrl;
            }

            observer.unobserve(item);

            // Hover-based prefetch of full-res (skip when Save-Data is on or no hover support)
            const canPrefetch = !saveData && matchMedia('(hover: hover)').matches;
            if (canPrefetch) {
                const onEnter = () => {
                    const id = setTimeout(() => {
                        const fullResUrl = bgUrl ? bgUrl.replace('?small', '') : null;
                        if (!fullResUrl) return;
                        const pre = new Image();
                        pre.src = fullResUrl;
                    }, 300);
                    timers.set(item, id);
                };
                const onLeave = () => {
                    const id = timers.get(item);
                    if (id) clearTimeout(id);
                };
                item.addEventListener('pointerenter', onEnter, { passive: true });
                item.addEventListener('pointerleave', onLeave, { passive: true });
            }
        });
    }, { rootMargin: '0px 0px 200px 0px' });

    portfolioItems.forEach(item => lazyLoadObserver.observe(item));

    // Sticky Nav Logic using Intersection Observer
    const nav = document.querySelector('.sticky-nav');
    const header = document.querySelector('.bgimg-header');
    if (nav && header) {
        const navObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                nav.classList.toggle('fixed', !entry.isIntersecting);
            });
        }, { threshold: 0.1 });
        navObserver.observe(header);
    }

    // Dark mode with persistence
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const applyDarkMode = (on) => {
        document.body.classList.toggle('dark-mode', on);
        if (darkModeToggle) {
            darkModeToggle.setAttribute('aria-pressed', String(on));
            const lightIcon = darkModeToggle.querySelector('.icon-light-mode');
            const darkIcon = darkModeToggle.querySelector('.icon-dark-mode');
            if (lightIcon && darkIcon) {
                lightIcon.style.display = on ? 'inline-block' : 'none';
                darkIcon.style.display = on ? 'none' : 'inline-block';
            }
        }
    };
    // Initialize from localStorage
    applyDarkMode(localStorage.getItem('dark-mode') === '1');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const on = !document.body.classList.contains('dark-mode');
            applyDarkMode(on);
            localStorage.setItem('dark-mode', on ? '1' : '0');
        });
    }

    // Region and locale
    const pathname = window.location.pathname;
    const pathSegments = pathname.split('/').filter(Boolean);
    let region = 'en-US';
    const supportedRegions = {
        'en-us': 'en-US',
        'zh-cn': 'zh-CN'
    };
    if (pathSegments.length > 0 && supportedRegions[pathSegments[0]?.toLowerCase()]) {
        region = supportedRegions[pathSegments[0].toLowerCase()];
    }

    // Better month names using the region
    const monthFormatter = new Intl.DateTimeFormat(region, { month: 'long' });

    // Build archive with minimal reflows
    fetch(`/data/${region}/months.json`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(months => {
            const archiveList = document.getElementById('archive-list');
            if (!archiveList || !Array.isArray(months)) return;

            const groupedMonths = months.reduce((acc, ym) => {
                const y = ym.split('-')[0];
                (acc[y] ||= []).push(ym);
                return acc;
            }, {});

            const sortedYears = Object.keys(groupedMonths).sort((a, b) => Number(b) - Number(a));
            const frag = document.createDocumentFragment();

            sortedYears.forEach(y => {
                const yearBtn = document.createElement('button');
                yearBtn.className = 'accordion';
                yearBtn.textContent = y;
                frag.appendChild(yearBtn);

                const panel = document.createElement('div');
                panel.className = 'panel';
                frag.appendChild(panel);

                groupedMonths[y].forEach(ym => {
                    const [yy, mm] = ym.split('-');
                    const monthName = monthFormatter.format(new Date(Number(yy), Number(mm) - 1, 1));

                    const href = region === 'en-US' ? `/${ym}` : `/${region}/${ym}`;
                    const a = document.createElement('a');
                    a.href = href;
                    a.className = 'bar-item button hover-green large';
                    a.textContent = `${yy} ${monthName}`;
                    a.onclick = closeSidebar;
                    panel.appendChild(a);
                });
            });

            archiveList.textContent = '';
            archiveList.appendChild(frag);

            const acc = archiveList.getElementsByClassName('accordion');
            for (let i = 0; i < acc.length; i++) {
                acc[i].addEventListener('click', function() {
                    this.classList.toggle('active');
                    const panel = this.nextElementSibling;
                    if (!panel) return;
                    if (panel.style.maxHeight) {
                        panel.style.maxHeight = null;
                    } else {
                        panel.style.maxHeight = panel.scrollHeight + 'px';
                    }
                });
            }
        })
        .catch(error => {
            console.error('Failed to load archive data for region:', region, error);
            const archiveList = document.getElementById('archive-list');
            if (archiveList) {
                archiveList.innerHTML = '<p style="padding: 10px 15px;">Could not load archive.</p>';
            }
        });
});

function openLightbox(imgSrc, caption) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const overlay = document.getElementById('overlay');
    const captionDiv = document.getElementById('lightbox-caption');
    const downloadLink = document.getElementById('download-link');
    const bingLink = document.getElementById('bing-link');
    const resButtons = document.querySelectorAll('.res-button');
    const spinner = lightbox?.querySelector('.loading-spinner');
    const errorMessage = lightbox?.querySelector('.error-message');

    if (!lightbox || !overlay) return;

    const imageId = (imgSrc.split('/').pop() || '').split('?')[0];
    let selectedRes = '4k';

    const icons = {
        icon: downloadLink ? downloadLink.querySelector('.icon-download') : null,
        loading: downloadLink ? downloadLink.querySelector('.icon-download-loading') : null,
        done: downloadLink ? downloadLink.querySelector('.icon-download-done') : null
    };
    const setIconState = (state) => {
        if (!icons.icon || !icons.loading || !icons.done) return;
        icons.icon.style.display = state === 'idle' ? 'inline-block' : 'none';
        icons.loading.style.display = state === 'loading' ? 'inline-block' : 'none';
        icons.done.style.display = state === 'done' ? 'inline-block' : 'none';
    };

    // Caption
    if (captionDiv) captionDiv.innerHTML = caption || '';

    const updateDownloadLinks = () => {
        const bingLinkUrl = `https://bing.com/th?id=${imageId}${selectedRes === '4k' ? '' : '&w=1920'}`;
        const workerLinkUrl = `/image/${imageId}${selectedRes === '4k' ? '' : '?2k'}`;
        if (downloadLink) downloadLink.href = workerLinkUrl;
        if (bingLink) bingLink.href = bingLinkUrl;
    };
    updateDownloadLinks();

    // Resolution switch
    resButtons.forEach(button => {
        button.addEventListener('click', () => {
            resButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedRes = button.dataset.res || '4k';
            updateDownloadLinks();

            // Pre-fetch the 2K image when selected
            if (selectedRes === '2k' && downloadLink?.href) {
                const pre = new Image();
                pre.src = downloadLink.href;
            }
        });
    });

    // Download handler
    if (downloadLink) {
        downloadLink.addEventListener('click', async (event) => {
            event.preventDefault();
            if (!downloadLink.href) return;

            const filename = `${imageId} ${selectedRes}.jpg`;
            setIconState('loading');

            try {
                const response = await fetch(downloadLink.href);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(blobUrl);
                a.remove();
                setIconState('done');
            } catch (e) {
                console.error('Download failed:', e);
                setIconState('idle');
                if (bingLink?.href) window.open(bingLink.href, '_blank');
            }
        }, { once: true });
        setIconState('idle');
    }

    // Show lightbox
    if (spinner) spinner.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
    if (lightboxImg) {
        lightboxImg.style.display = 'none';
        lightboxImg.removeAttribute('src');
    }
    lightbox.classList.add('show');
    overlay.classList.add('show');

    // Load the large image
    const highResImg = new Image();
    const showImage = () => {
        if (lightboxImg) {
            lightboxImg.src = imgSrc;
            if (spinner) spinner.style.display = 'none';
            lightboxImg.style.display = 'block';
        }
    };

    const showError = () => {
        if (spinner) spinner.style.display = 'none';
        if (errorMessage) {
            errorMessage.textContent = getTranslation('error');
            errorMessage.style.display = 'block';
        }
    };

    highResImg.onload = showImage;
    highResImg.onerror = showError;
    highResImg.src = imgSrc;
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const overlay = document.getElementById('overlay');
    const spinner = lightbox?.querySelector('.loading-spinner');
    const lightboxImg = document.getElementById('lightbox-img');

    if (lightbox?.classList.contains('show')) {
        lightbox.classList.remove('show');
    }
    if (overlay?.classList.contains('show')) {
        overlay.classList.remove('show');
    }
    if (spinner) spinner.style.display = 'none';
    if (lightboxImg) {
        lightboxImg.style.display = 'none';
        lightboxImg.removeAttribute('src');
    }
}
