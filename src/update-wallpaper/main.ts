import { generateSite } from './wallpaper-updater';
import { log } from './utils';

async function main() {
  log('Starting Bing Wallpaper fetch...');
  try {
    const regions = ['en-US', 'zh-CN', 'zh-HK'];
    const promises = regions.map(region => generateSite(region));
    await Promise.all(promises);
    log('Bing Wallpaper fetch finished.');
  } catch (error) {
    console.error('An error occurred during Bing Wallpaper fetch:', error);
    process.exit(1);
  }
}

main();
