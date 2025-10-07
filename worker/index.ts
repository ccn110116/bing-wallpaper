interface BingImage {
  desc: string;
  date: string;
  url: string;
}

// This function dynamically imports the correct JSON for the current month and region
async function getImageData(region: string): Promise<BingImage[] | null> {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const monthStr = `${year}-${month}`;

  try {
    const data = await import(`./assets/data/${region}/${monthStr}.json`);
    return data.default;
  } catch (e) {
    console.error(`Could not load data for region ${region} and month ${monthStr}`, e);
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    const region = pathname.split('/')[1] || 'en-US';
    const supportedRegions = ['en-US', 'zh-CN', 'zh-HK', 'zh-TW'];

    // If the path is not the root and not a supported region, treat it as a static asset
    if (pathname !== '/' && !supportedRegions.includes(region)) {
      return env.ASSETS.fetch(request);
    }

    // --- Dynamic Page Rendering ---
    let activeRegion = region;
    if (!supportedRegions.includes(activeRegion)) {
        activeRegion = 'en-US'; // Default to en-US if region is invalid
    }

    const imageData = await getImageData(activeRegion);

    if (!imageData || imageData.length === 0) {
      return new Response(`No image data found for the current month in region: ${activeRegion}.`, { status: 404 });
    }

    const latestImage = imageData[0];

    const imageGridHTML = imageData.map(img => `
      <div class="w3-third" style="position: relative; height: 249px;">
        <a href="${img.url}" target="_blank">
          <img class="bigImg w3-hover-shadow" src="${img.url}&pid=hp&w=384&h=216&rs=1&c=4" style="width:95%">
        </a>
        <p>${img.date} | ${img.desc}</p>
      </div>
    `).join('');

    const rewriter = new HTMLRewriter()
      .on('head', {
        element(element) {
          element.append(`<style>.bgimg-header { background-image: url('${latestImage.url}&pid=hp&w=2000'); }</style>`, { html: true });
        },
      })
      .on('.w3-display-middle p', {
        element(element) {
          element.setInnerContent(latestImage.desc);
        },
      })
      .on('#img_list', {
        element(element) {
          element.setInnerContent(imageGridHTML, { html: true });
        },
      });

    const indexRequest = new Request(new URL('/index.html', request.url), request);
    const indexResponse = await env.ASSETS.fetch(indexRequest);

    return rewriter.transform(indexResponse);
  },
};
