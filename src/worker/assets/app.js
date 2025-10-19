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

// Script to open and close sidebar
function w3_open() {
    document.getElementById("mySidebar").classList.add("open");
    document.getElementById("overlay").classList.add("open");
}

function w3_close() {
    document.getElementById("mySidebar").classList.remove("open");
    document.getElementById("overlay").classList.remove("open");
}

document.addEventListener('DOMContentLoaded', function() {
    // Lazy Loading Images
    const lazyImages = document.querySelectorAll('img.lazy');
    const lazyImageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const lazyImage = entry.target;
                lazyImage.src = lazyImage.dataset.src;
                lazyImage.classList.remove('lazy');
                observer.unobserve(lazyImage);
            }
        });
    }, {
        rootMargin: "0px 0px 200px 0px" // Start loading when image is 200px away from viewport
    });

    lazyImages.forEach((lazyImage) => {
        lazyImageObserver.observe(lazyImage);
    });

    // Sticky Nav Logic
    const nav = document.querySelector('.sticky-nav');
    if (nav) {
        const navTop = nav.offsetTop;
        window.addEventListener('scroll', function() {
            if (window.scrollY >= navTop) {
                nav.classList.add('fixed');
            } else {
                nav.classList.remove('fixed');
            }
        });
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
                    monthLink.onclick = w3_close;
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

    if (spinner) spinner.style.display = 'block';
    if (lightboxImg) lightboxImg.style.display = 'none';
    const captionDiv = document.getElementById('lightbox-caption');
    if (captionDiv) captionDiv.innerHTML = caption;
    
    if (lightbox) {
        lightbox.classList.add('show');
    }
    if (overlay) {
        overlay.classList.add('show');
    }


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

let preloadTimer;
function handleImageMouseover(element, fullResUrl) {
    preloadTimer = setTimeout(() => {
        const highResImg = new Image();
        highResImg.src = fullResUrl;
    }, 200);
}

function handleImageMouseout(element, lowResUrl) {
    clearTimeout(preloadTimer);
    // No longer resetting the src to lowResUrl to prevent unnecessary re-fetches.
    // The browser will keep the high-res image if it was loaded.
}
