import { generateSite } from './siteGenerator';
import { generateMonthsJson } from './monthsGenerator';
import { log } from './logUtils';

async function main() {
  log('Starting Bing Wallpaper fetch...');
  const regions = ['en-US', 'zh-CN', 'zh-HK'];

  const promises = regions.map(async (region) => {
    await generateSite(region);
    await generateMonthsJson(region);
  });

  await Promise.all(promises);

  log('Bing Wallpaper fetch finished.');
}

main();
