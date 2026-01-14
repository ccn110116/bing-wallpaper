import type { BingImage, Env } from '../shared/types';
import { fetchJson } from './utils';

export async function renderPage(
  region: string,
  monthStr: string | undefined, // undefined means current month
  request: Request,
  env: Env
): Promise<Response> {
  if (!env.ASSETS) return new Response('Assets unavailable', { status: 500 });
  
  const url = new URL(request.url);

  console.log(`[renderPage] Fetching index.html for ${url.pathname}`);
  const templateReq = new Request(new URL('/index.html', url));
  const templateRes = await env.ASSETS.fetch(templateReq);
  
  if (!templateRes.ok) {
    console.error(`[renderPage] Failed to fetch index.html: ${templateRes.status}`);
    return new Response('Template not found', { status: 500 });
  }
  
  // 1. Fetch resources in parallel
  const [locales, months] = await Promise.all([
    fetchJson<Record<string, Record<string, string>>>('/locales.json', env, url.toString()),
    fetchJson<string[]>(`/data/${region}/months.json`, env, url.toString()),
  ]);

  let activeMonth = monthStr;
  if (!activeMonth) {
    // Default to latest month
    activeMonth = (months && months.length > 0) ? months[0] : new Date().toISOString().slice(0, 7);
  }

  const images = (await fetchJson<BingImage[]>(`/data/${region}/${activeMonth}.json`, env, url.toString())) || [];

  // 2. Prepare Template
  let html = await templateRes.text();
  
  // Helper for localization
  const getTrans = (key: string) => {
    if (!locales) return key;
    // Handle case sensitivity (e.g. en-us vs en-US)
    const availableRegions = Object.keys(locales);
    const matchedRegion = availableRegions.find(r => r.toLowerCase() === region.toLowerCase());
    const defaultRegion = availableRegions.find(r => r.toLowerCase() === 'en-us');
    
    return (matchedRegion && locales[matchedRegion]?.[key]) || 
           (defaultRegion && locales[defaultRegion]?.[key]) || 
           key;
  };

  // 3. Inject Content
  
  // HTML Lang
  html = html.replace('<html lang="en-US">', `<html lang="${region}">`);
  
  // Script Injection for Client-side Locals
  if (locales) {
      const script = `<script>window.locales = ${JSON.stringify(locales)};</script>`;
      html = html.replace('</head>', `${script}</head>`);
  }
  
  // Title & Metadata
  const pageTitle = getTrans('htmlTitle');
  html = html.replace(/<title.*?>.*?<\/title>/, `<title>${pageTitle}</title>`);
  
  // Header
  const h1Title = getTrans('h1Title');
  html = html.replace(/<h1.*?>.*?<\/h1>/, `<h1>${h1Title}</h1>`);

  // First image for Header Background
  if (images.length > 0) {
    const firstImg = images[0];
    const bgUrl = `${firstImg.url}&w=1920`; 
    const desc = firstImg.desc;
    
    html = html.replace(
      '<div class="bgimg-header">', 
      `<div class="bgimg-header" style="background-image: url('${bgUrl}')">`
    );
    html = html.replace('<p></p>', `<p>${desc}</p>`);
  }

  // Archive List (Sidebar)
  if (months && months.length > 0) {
    const archiveHtml = months.map(m => {
      const activeClass = m === activeMonth ? ' w3-light-grey' : '';
      return `<a href="/${region}/${m}" class="bar-item button${activeClass}">${m}</a>`;
    }).join('\n');
    html = html.replace('<div id="archive-list"></div>', `<div id="archive-list">${archiveHtml}</div>`);
  }

  // Image Grid
  if (images.length > 0) {
    const gridHtml = images.map(img => {
      const smallUrl = `${img.url}&w=384&h=216`;
      const uhdUrl = `${img.url}&w=3840&h=2160`;
      const k2Url = `${img.url}&w=1920&h=1080`;
      const caption = img.desc.replace(/'/g, "&#39;");
      
      return `
        <a href="#" class="portfolio-item" 
           style="background-image: url('${smallUrl}')"
           data-caption="${caption}"
           data-date="${img.date}"
           data-thumbnail="${smallUrl}"
           data-url4k="${uhdUrl}"
           data-url2k="${k2Url}">
           <div class="description">
             <p>${img.date}: ${img.desc}</p>
           </div>
        </a>
      `;
    }).join('\n');
    
    html = html.replace(
      '<div class="portfolio-grid" id="img_list">', 
      `<div class="portfolio-grid" id="img_list">${gridHtml}`
    );
  }

  // Footer / Static Text keys
  const textKeys = ['home', 'archive', 'about', 'github', 'footerLine1', 'footerLine2', 'footerLine3'];
  for (const key of textKeys) {
    const val = getTrans(key);
    const regex = new RegExp(`data-key="${key}"[^>]*>.*?<`, 'g');
    html = html.replace(regex, (match) => {
      const tagStart = match.substring(0, match.indexOf('>') + 1);
      return `${tagStart}${val}<`;
    });
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    }
  });
}
