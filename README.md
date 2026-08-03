
# Today's Wallpaper

-----BEGIN IMAGE-----

![Colorful boats in Marsaxlokk Harbor, Malta (© Klubovy/Getty Images)](https://bing.com/th?id=OHR.BoatsMalta_EN-US5373607495_UHD.jpg&w=1000)
*[Colorful boats in Marsaxlokk Harbor, Malta (© Klubovy/Getty Images)](https://bing.com/th?id=OHR.BoatsMalta_EN-US5373607495_UHD.jpg)*

------END IMAGE------

# Bing Wallpaper

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ccn110116/bing-wallpaper/)

A modern, high-performance, and lightweight Bing Wallpaper archiver and viewer built specifically for **Cloudflare Workers** and **TypeScript**.

> 💡 **Acknowledgement & Inspiration**
> This project is inspired by [Niumoo's bing-wallpaper](https://github.com/niumoo/bing-wallpaper). We deeply appreciate Niumoo and all original contributors for their pioneering work in building a daily Bing wallpaper archiver.

---

## 🧐 Why an Alternative? (Limitations of the Original)

While Niumoo's repository pioneered automated Bing wallpaper archiving, its traditional architecture introduces several long-term maintenance and user experience challenges:

* **Repository Bloat & Git Fatigue:** The original project generates and commits standalone, untidy HTML files scattered across numerous nested directories for every single day and month, making code maintenance a nightmare. As of August 1, 2026, the original repository size has swollen to **29.8 MB** due to thousands of committed static files. By archiving metadata cleanly into structured JSON instead, this repository remains extremely lightweight at just **574 KB**.
* **Unstructured & Legacy Data:** Because the HTML templates evolved over time while maintaining backward compatibility, the historical output contains unstructured, legacy HTML layouts that are difficult to parse or migrate programmatically.
* **Rigid User Experience:** Viewing full-resolution images requires navigating away from the main gallery page to an individual daily HTML page, creating unnecessary page redirects.

---

## 🚀 How We Solved It (Our Architecture & Wins)

We completely re-architected the project from the ground up (Note that we refered some settings in Niumoo's repository) to be **edge-native**, **data-centric**, and **lightweight**:

### 📦 1. Pure JSON Storage Strategy

Instead of generating and committing thousands of static HTML files, wallpaper metadata is archived into monthly, structured **JSON payloads** categorized by region (e.g., `en-us`, `zh-cn`).

* **Zero Repository Bloat:** Keeps repository clea, lightweight, and fast to clone.
* **Structured & Machine-Readable:** Easy to parse, query, or export for future features.

### ⚡ 2. Edge-Native Performance with Cloudflare Workers

Built with **TypeScript** and designed to run on **Cloudflare Workers**, the application renders responses dynamically at the edge near your users, ensuring ultra-low latency without needing complex web server infrastructure.

### 🖼️ 3. Improved Interactive UI

* **Seamless Lightbox Preview:** Click any wallpaper to instantly view full-resolution preview modals without leaving the page or forcing page redirects.
* **Built-in REST API:** Because the data is stored in structured JSON, the worker doubles as a lightweight JSON API endpoint for desktop scripts, mobile apps, or third-party integrations.

---

## 🛠️ Troubleshooting

### Missing Navigation Bar on Partial Months

When viewing a recently started month, there might not be enough archived wallpapers yet to fill the page height. Because the navigation bar relies on a scroll-distance detection trigger, it may not appear automatically on short pages.

**Workarounds:**

* **Browse Previous Months:** Navigate to a complete month with full entries (for example, `/en-us/2026-07`) where scrolling is active.
* **Wait a Few Days:** As the scraper archives more daily images throughout the month, the page height will increase and normal scroll behavior will resume automatically.

---

## 📄 Attribution

Special thanks again to **Niumoo** and the related contributors for the original concept and continuous inspiration.

Undisguisedly, the entire project is made by AI. I appreciate all intervened intelligence.

---

## ⚠️ Warning

AI may make mistake, audit it comprehensively before use.
