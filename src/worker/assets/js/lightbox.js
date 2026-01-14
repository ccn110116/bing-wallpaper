import { getLocale } from './main.js';

let lightbox;
let lightboxImg;
let lightboxCaption;
let bingLink;
let downloadLink;
let currentItem;
let currentResolution = '4k';

export function initializeLightbox() {
    lightbox = document.getElementById('lightbox');
    lightboxImg = document.getElementById('lightbox-img');
    lightboxCaption = document.getElementById('lightbox-caption');
    bingLink = document.getElementById('bing-link');
    downloadLink = document.getElementById('download-link');
}

export function openLightbox(item) {
    currentItem = item;
    document.body.classList.add('lightbox-open');
    
    // Show overlay
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.style.display = 'block';
        // Force reflow
        void overlay.offsetWidth;
        overlay.style.opacity = '1';
    }

    lightbox.style.display = 'block';
    setTimeout(() => {
        lightbox.classList.add('visible');
    }, 10);
    lightboxCaption.innerHTML = item.dataset.caption;
    bingLink.href = item.dataset.url4k;
    updateLightboxImage();
}

export function closeLightbox() {
    lightbox.classList.remove('visible');
    
    // Hide overlay
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
           overlay.style.display = 'none';
        }, 300);
    }
    
    setTimeout(() => {
        lightbox.style.display = 'none';
        document.body.classList.remove('lightbox-open');
    }, 300);
}

export function setResolution(res) {
    currentResolution = res;
    updateLightboxImage();
    document.querySelectorAll('.res-button').forEach(button => {
        button.classList.toggle('active', button.dataset.res === res);
    });
}

function updateLightboxImage() {
    const targetUrl = currentItem.dataset[`url${currentResolution}`];
    const currentIdentity = currentItem.dataset.date;
    
    // Update bing link to match resolution
    bingLink.href = targetUrl;
    downloadLink.href = targetUrl;

    const spinner = document.querySelector('.loading-spinner');
    if (spinner) spinner.style.display = 'block';

    const thumbnail = currentItem.dataset.thumbnail;
    
    // Preload target
    const tempImg = new Image();
    
    tempImg.onload = () => {
        if (spinner) spinner.style.display = 'none';
        lightboxImg.src = targetUrl;
        lightboxImg.style.display = 'block';
        lightboxImg.style.filter = 'none';
        lightboxImg.dataset.loadedIdentity = currentIdentity; // Mark as loaded
    };

    tempImg.onerror = () => {
         if (spinner) spinner.style.display = 'none';
    };

    // Logic: 
    // If it's a DIFFERENT image than what's currently shown, swap to thumbnail immediately.
    // If it's the SAME image (just switching res), keep it visible!
    
    const lastLoadedIdentity = lightboxImg.dataset.loadedIdentity;

    if (lastLoadedIdentity !== currentIdentity) {
        // New image opening
        if (thumbnail) {
            lightboxImg.src = thumbnail;
            lightboxImg.style.display = 'block';
            lightboxImg.style.filter = 'blur(10px)';
        } else {
             // No thumbnail? Hide until loaded to avoid showing wrong previous image
             lightboxImg.style.display = 'none';
        }
    }
    // Else: We are switching resolution on the same image. 
    // Keep current `lightboxImg.src` visible (don't touch it) until `tempImg.onload` swaps it.
    
    tempImg.src = targetUrl;
}

export function downloadImage() {
    const downloadLoadingIcon = document.querySelector('.icon-download-loading');
    const downloadDoneIcon = document.querySelector('.icon-download-done');
    const downloadIcon = document.querySelector('.icon-download');

    downloadIcon.style.display = 'none';
    downloadLoadingIcon.style.display = 'block';

    // Construct filename: bing-wallpaper-DD-MM-YYYY.jpg
    const dateStr = currentItem.dataset.date || new Date().toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-');
    const filename = `bing-wallpaper-${d}-${m}-${y}.jpg`;

    fetch(downloadLink.href)
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            downloadLoadingIcon.style.display = 'none';
            downloadDoneIcon.style.display = 'block';
            setTimeout(() => {
                downloadDoneIcon.style.display = 'none';
                downloadIcon.style.display = 'block';
            }, 2000);
        })
        .catch(() => {
             // alert(getLocale('error')); // Avoid alert if possible
            downloadLoadingIcon.style.display = 'none';
            downloadIcon.style.display = 'block';
        });
}
