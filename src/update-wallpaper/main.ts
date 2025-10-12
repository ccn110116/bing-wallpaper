import { generateSite } from './siteGenerator';
import { log } from './utils';

async function main() {
  log('Starting Bing Wallpaper fetch...');
  try {
    const regions = ['en-US', 'zh-CN', 'zh-HK'];
    const promises = regions.map(region => generateSite(region));
    await Promise.all(promises);
    log('Bing Wallpaper fetch finished.');
  } catch (error) {
  await Promise.all(promises);

  log('Bing Wallpaper fetch finished.');
}

main();
