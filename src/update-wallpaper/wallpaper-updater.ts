import * as fs from 'fs/promises';
import * as path from 'path';
import { getHttpContent, log } from './utils';

interface BingImage {
  desc: string;
  date: string;
  url: string;
}

const BING_API_TEMPLATE = "https://global.bing.com/HPImageArchive.aspx?format=js&idx=0&n=9&pid=hp&FORM=BEHPTB&uhd=1&uhdwidth=3840&uhdheight=2160&setmkt=%s&setlang=en";
const BING_URL = "https://bing.com";

const DATA_PATH = path.resolve('assets/data');
const README_PATH = path.resolve('dist/README.md');

export async function generateSite(region: string) {
  const bingApi = BING_API_TEMPLATE.replace('%s', region);
  const httpContent = await getHttpContent(bingApi);
  if (!httpContent) {
    return;
  }

  const jsonObject = JSON.parse(httpContent);
  const images: BingImage[] = jsonObject.images.map((image: any) => ({
    desc: image.copyright,
    date: new Date(image.enddate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toISOString().split('T')[0],
    url: (BING_URL + image.url).split('&')[0],
  }));

  // Group images by month (e.g., "2025-10")
  const imagesByMonth = new Map<string, BingImage[]>();
  for (const image of images) {
    const monthStr = image.date.substring(0, 7); // YYYY-MM
    if (!imagesByMonth.has(monthStr)) {
      imagesByMonth.set(monthStr, []);
    }
    imagesByMonth.get(monthStr)!.push(image);
  }

  // Update JSON files for each month
  const updatePromises = Array.from(imagesByMonth.entries()).map(([monthStr, monthImages]) =>
    updateMonthlyJson(monthImages, region, monthStr)
  );
  await Promise.all(updatePromises);

  await cleanupOldJsonFiles(region);
  await updateMonthsJsonFile(region);

  // Update README only with the latest images from the primary region
  if (region === 'en-US') {
    await updateReadme(images);
  }
}

async function updateMonthlyJson(images: BingImage[], region: string, monthStr: string) {
  const regionPath = path.resolve(DATA_PATH, region);
  await fs.mkdir(regionPath, { recursive: true });
  const filePath = path.resolve(regionPath, `${monthStr}.json`);

  let existingImages: BingImage[] = [];
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    existingImages = JSON.parse(content);
  } catch (error) {
    // File might not exist, which is fine
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
  if (images.length === 0) {
    return;
  }
  const latestImage = images[0];
  const readmeContent = `
# Bing Wallpaper

![${latestImage.desc}](${latestImage.url}&w=1000)
*Today: [${latestImage.desc}](${latestImage.url})*

## Recent Wallpapers

| Date       | Description |
|------------|-------------|
${images.map(img => `| ${img.date} | [${img.desc}](${img.url}) |`).join('\n')}
`;

  await fs.writeFile(README_PATH, readmeContent);
  log('Updated README.md');
}

async function cleanupOldJsonFiles(region: string) {
  const regionPath = path.resolve(DATA_PATH, region);
  try {
    const files = await fs.readdir(regionPath);
    const now = new Date();
    // Go back 48 months from the current month
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 48, 1);

    for (const file of files) {
      if (/\d{4}-\d{2}\.json/.test(file)) {
        const fileDate = new Date(file.substring(0, 7)); // YYYY-MM
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
    // region directory might not exist
    return;
  }

  const sortedMonths = Array.from(allMonths).sort().reverse();
  const filePath = path.resolve(regionPath, 'months.json');
  await fs.writeFile(filePath, JSON.stringify(sortedMonths));
  log(`Generated ${filePath}`);
}
