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
    lightbox.style.display = 'block';
    lightboxCaption.innerHTML = item.dataset.caption;
    bingLink.href = item.dataset.url4k;
    updateLightboxImage();
}

export function closeLightbox() {
    lightbox.style.display = 'none';
}

export function setResolution(res) {
    currentResolution = res;
    updateLightboxImage();
    document.querySelectorAll('.res-button').forEach(button => {
        button.classList.toggle('active', button.dataset.res === res);
    });
}

function updateLightboxImage() {
    const imageUrl = currentItem.dataset[`url${currentResolution}`];
    lightboxImg.src = imageUrl;
    downloadLink.href = imageUrl;
}

export function downloadImage() {
    const downloadLoadingIcon = document.querySelector('.icon-download-loading');
    const downloadDoneIcon = document.querySelector('.icon-download-done');
    const downloadIcon = document.querySelector('.icon-download');

    downloadIcon.style.display = 'none';
    downloadLoadingIcon.style.display = 'block';

    fetch(downloadLink.href)
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${currentItem.dataset.imageId}.jpg`;
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
            alert(getLocale('error'));
            downloadLoadingIcon.style.display = 'none';
            downloadIcon.style.display = 'block';
        });
}
