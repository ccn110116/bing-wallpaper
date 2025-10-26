function headerImgloading() {
    var bgImg = document.querySelector('.bgimg-header');
    var smallImg = document.querySelector('.smallImg-header');
    // 创建一个新的图片对象以监控加载状态
    var img = new Image();
    if (bgImg && bgImg.style.backgroundImage) {
        img.src = bgImg.style.backgroundImage.slice(4, -1).replace(/"/g, "");
    }
    // 小图逐渐变透明
    if (smallImg) {
        smallImg.style.opacity = 0.3;
    }
    img.onload = function() {
        setTimeout(function() {
            // 当大图加载完成时，首先显示大图
            if (bgImg) {
                bgImg.style.display = "block";
            }
            if (smallImg) {
                smallImg.style.opacity = 0;
            }
        }, 300);
    };
}
window.addEventListener('load', headerImgloading);

function setSidebar(open = true) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!sidebar && !overlay) return;
    [sidebar, overlay].forEach(el => el?.classList.toggle('open', !!open));
}

function openSidebar() { setSidebar(true); }
function closeSidebar() { setSidebar(false); }

document.addEventListener('DOMContentLoaded', function() {
    // Lazy Loading & Preloading Logic
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    let preloadTimer;

    const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const item = entry.target;
                item.style.backgroundImage = `url(${item.dataset.bg})`;
                observer.unobserve(item);

                // Add hover listeners after the image is loaded
                item.addEventListener('mouseover', () => {
                    preloadTimer = setTimeout(() => {
                        const fullResUrl = item.dataset.bg.replace('?small', '');
                        const img = new Image();
                        img.src = fullResUrl;
                    }, 400);
                });

                item.addEventListener('mouseout', () => {
                    clearTimeout(preloadTimer);
                });
            }
        });
    }, { rootMargin: "0px 0px 200px 0px" });

    portfolioItems.forEach(item => {
        lazyLoadObserver.observe(item);
    });

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

    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }

    const pathname = window.location.pathname;
    const pathSegments = pathname.split('/').filter(Boolean);
    let region = 'en-US';
    const supportedRegions = ['zh-cn', 'zh-hk'];

    if (pathSegments.length > 0 && supportedRegions.includes(pathSegments[0])) {
        region = pathSegments[0];
    }

    fetch(`/data/${region}/months.json`)
        .then(response => response.json())
        .then(months => {
            const archiveList = document.getElementById('archive-list');
            if (!archiveList) return;
            const groupedMonths = months.reduce((acc, month) => {
                const year = month.split('-')[0];
                if (!acc[year]) {
                    acc[year] = [];
                }
                acc[year].push(month);
                return acc;
            }, {});

            for (const year in groupedMonths) {
                const yearButton = document.createElement('button');
                yearButton.className = 'accordion';
                yearButton.textContent = year;
                archiveList.appendChild(yearButton);

                const panel = document.createElement('div');
                panel.className = 'panel';
                archiveList.appendChild(panel);

                groupedMonths[year].forEach(month => {
                    const monthLink = document.createElement('a');
                    monthLink.href = `/${month}.html`;
                    monthLink.className = 'bar-item button hover-green large';
                    monthLink.textContent = month;
                    monthLink.onclick = closeSidebar;
                    panel.appendChild(monthLink);
                });
            }

            var acc = document.getElementsByClassName("accordion");
            for (var i = 0; i < acc.length; i++) {
                acc[i].addEventListener("click", function() {
                    this.classList.toggle("active");
                    var panel = this.nextElementSibling;
                    if (panel.style.maxHeight) {
                        panel.style.maxHeight = null;
                    } else {
                        panel.style.maxHeight = panel.scrollHeight + "px";
                    }
                });
            }
        });
});

function openLightbox(imgSrc, caption) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const spinner = lightbox.querySelector('.loading-spinner');
    const overlay = document.getElementById('overlay');
    const captionDiv = document.getElementById('lightbox-caption');
    const downloadLink = document.getElementById('download-link');
    const bingLink = document.getElementById('bing-link');
    const resButtons = document.querySelectorAll('.res-button');
    const downloadIcon = downloadLink.querySelector('.download-icon');
    const downloadDoneIcon = downloadLink.querySelector('.download-done-icon');

    const imageId = imgSrc.split('/').pop();
    let selectedRes = '4k';

    // Reset icons
    downloadIcon.style.display = 'inline-block';
    downloadDoneIcon.style.display = 'none';

    if (captionDiv) captionDiv.innerHTML = caption;

    const updateDownloadLink = () => {
        const quality = selectedRes === '4k' ? '' : '&w=1920';
        const link = `https://bing.com/th?id=${imageId}${quality}`;
        if (downloadLink) downloadLink.href = link;
        if (bingLink) bingLink.href = link;
    };
    updateDownloadLink();

    resButtons.forEach(button => {
        button.onclick = () => {
            resButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedRes = button.dataset.res;
            updateDownloadLink();
        };
    });

    downloadLink.onclick = (event) => {
        event.preventDefault();
        const url = downloadLink.href;
        const filename = new URL(url).searchParams.get('id') || 'wallpaper.jpg';

        downloadIcon.style.display = 'none';

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob();
            })
            .then(blob => {
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(blobUrl);
                a.remove();
                
                downloadDoneIcon.style.display = 'inline-block';
            })
            .catch(e => {
                console.error('Download failed:', e);
                // Restore the original icon on failure
                downloadIcon.style.display = 'inline-block';
                downloadDoneIcon.style.display = 'none';
                // Optionally, open the link in a new tab as a fallback
                window.open(url, '_blank');
            });
    };

    if (spinner) spinner.style.display = 'block';
    if (lightboxImg) lightboxImg.style.display = 'none';
    
    if (lightbox) lightbox.classList.add('show');
    if (overlay) overlay.classList.add('show');

    const highResImg = new Image();
    highResImg.src = imgSrc;
    highResImg.onload = () => {
        if (lightboxImg) lightboxImg.src = imgSrc;
        if (spinner) spinner.style.display = 'none';
        if (lightboxImg) lightboxImg.style.display = 'block';
    };
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const overlay = document.getElementById('overlay');
    if (lightbox) {
        lightbox.classList.remove('show');
    }
    if (overlay) {
        overlay.classList.remove('show');
    }
}
