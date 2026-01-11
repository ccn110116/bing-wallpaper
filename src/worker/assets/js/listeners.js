import { openSidebar, closeSidebar, toggleDarkMode } from './ui.js';
import { openLightbox, closeLightbox, setResolution, downloadImage } from './lightbox.js';

export function setupEventListeners() {
    // Sidebar listeners
    document.querySelector('[data-key="archive"]').addEventListener('click', openSidebar);
    document.querySelector('.sidebar .bar-item.button').addEventListener('click', closeSidebar);
    document.getElementById('overlay').addEventListener('click', closeSidebar);

    // Dark mode listener
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);

    // Lightbox listeners
    document.getElementById('img_list').addEventListener('click', (event) => {
        const item = event.target.closest('.portfolio-item');
        if (item) {
            event.preventDefault();
            openLightbox(item);
        }
    });

    document.querySelector('.close-lightbox').addEventListener('click', closeLightbox);

    document.querySelectorAll('.res-button').forEach(button => {
        button.addEventListener('click', () => setResolution(button.dataset.res));
    });

    document.getElementById('download-link').addEventListener('click', (event) => {
        event.preventDefault();
        downloadImage();
    });
}
