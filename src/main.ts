import { generateSite, generateMonthsJson } from './core/siteGenerator';
import { log } from './utils/logUtils';

async function main() {
  log('Starting Bing Wallpaper fetch...');
  await generateSite('en-US');
  await generateSite('zh-CN');
  await generateSite('zh-HK');
  await generateSite('zh-TW');
  await generateMonthsJson();
  log('Bing Wallpaper fetch finished.');
}

main();
