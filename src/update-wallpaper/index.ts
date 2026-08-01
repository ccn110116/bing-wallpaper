import * as fs from 'fs/promises';
import * as path from 'path';
import type { BingImage } from '../shared/types';
import { BING_URL, BING_API_TEMPLATE, DATA_PATH, README_PATH } from '../shared/utils';

// --- Helper Functions ---
async function getHttpContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    try {
      JSON.parse(text);
      return text;
    } catch (e) {
      return text;
    }
  } catch (error) {
    console.error('Error fetching http content:', error);
    return '';
  }
}

function log(msg: string, ...args: any[]) {
  if (args.length > 0) {
    console.log(msg, ...args);
  } else {
    console.log(msg);
  }
}

// --- Site Generation Logic ---
async function updateMonthlyJson(images: BingImage[], region: string, monthStr: string) {
  const regionPath = path.resolve(DATA_PATH, region);
  await fs.mkdir(regionPath, { recursive: true });
  const filePath = path.resolve(regionPath, `${monthStr}.json`);

  let existingImages: BingImage[] = [];
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    existingImages = JSON.parse(content);
  } catch (error) {
    // File might not exist
  }

  const imageMap = new Map<string, BingImage>();
  existingImages.forEach(img => imageMap.set(img.date, img));
  images.forEach(img => imageMap.set(img.date, img));

  const allImages = Array.from(imageMap.values());
  allImages.sort((a, b) => b.date.localeCompare(a.date));

  await fs.writeFile(filePath, JSON.stringify(allImages));
  log(`Updated ${filePath}`);
}

async function updateReadme(images: BingImage[]) {
  if (images.length === 0) return;
  const latestImage = images[0];
  const startMarker = '-----BEGIN IMAGE-----';
  const endMarker = '------END IMAGE------';
  const replacementBlock = `${startMarker}\n\n![${latestImage.desc}](${latestImage.url}&w=1000)\n*[${latestImage.desc}](${latestImage.url})*\n\n${endMarker}`;
  const blockPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);

  let readmeContent = '';
  try {
    readmeContent = await fs.readFile(README_PATH, 'utf-8');
  } catch (error) {
    log('Error reading README.md');
    return;
  }

  const updatedReadmeContent = readmeContent.replace(blockPattern, replacementBlock);

  if (updatedReadmeContent === readmeContent) {
    log('README markers not found; skipping README update.');
    return;
  }

  await fs.writeFile(README_PATH, updatedReadmeContent);
  log('Updated README.md');
}

async function cleanupOldJsonFiles(region: string) {
  const regionPath = path.resolve(DATA_PATH, region);
  try {
    const files = await fs.readdir(regionPath);
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 48, 1);

    for (const file of files) {
      if (/\d{4}-\d{2}\.json/.test(file)) {
        const fileDate = new Date(file.substring(0, 7));
        if (fileDate < cutoffDate) {
          const filePath = path.resolve(regionPath, file);
          await fs.unlink(filePath);
          log(`Removed old file: ${filePath}`);
        }
      }
    }
  } catch (error) {
    // region directory might not exist
  }
}

async function updateMonthsJsonFile(region: string) {
  const regionPath = path.resolve(DATA_PATH, region);
  const allMonths = new Set<string>();
  try {
    const files = await fs.readdir(regionPath);
    files
      .filter((file: string) => /\d{4}-\d{2}\.json/.test(file))
      .forEach((file: string) => allMonths.add(file.replace('.json', '')));
  } catch (error) {
    return;
  }

  const sortedMonths = Array.from(allMonths).sort().reverse();
  const filePath = path.resolve(regionPath, 'months.json');
  await fs.writeFile(filePath, JSON.stringify(sortedMonths));
  log(`Generated ${filePath}`);
}

async function generateSite(region: string) {
  const bingApi = BING_API_TEMPLATE.replace('%s', region);
  const httpContent = await getHttpContent(bingApi);
  if (!httpContent) return;

  const jsonObject = JSON.parse(httpContent);
  const images: BingImage[] = jsonObject.images.map((image: any) => ({
    desc: image.copyright,
    date: new Date(image.enddate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toISOString().split('T')[0],
    url: (BING_URL + image.url).split('&')[0],
  }));

  const imagesByMonth = new Map<string, BingImage[]>();
  for (const image of images) {
    const monthStr = image.date.substring(0, 7);
    if (!imagesByMonth.has(monthStr)) {
      imagesByMonth.set(monthStr, []);
    }
    imagesByMonth.get(monthStr)!.push(image);
  }

  const updatePromises = Array.from(imagesByMonth.entries()).map(([monthStr, monthImages]) =>
    updateMonthlyJson(monthImages, region, monthStr)
  );
  await Promise.all(updatePromises);

  await cleanupOldJsonFiles(region);
  await updateMonthsJsonFile(region);

  if (region === 'en-us') {
    await updateReadme(images);
  }
}

// --- Main Execution (from main.ts) ---
async function main() {
  log('Starting Bing Wallpaper fetch...');
  try {
    const regions = ['en-us', 'zh-cn'];
    const promises = regions.map(region => generateSite(region));
    await Promise.all(promises);
    log('Bing Wallpaper fetch finished.');
  } catch (error) {
    console.error('An error occurred during Bing Wallpaper fetch:', error);
    process.exit(1);
  }
}

main();
