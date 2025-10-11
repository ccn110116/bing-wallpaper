import * as fs from 'fs/promises';
import * as path from 'path';
import { log } from './logUtils';

const DATA_PATH = path.resolve('assets/data');

export async function generateMonthsJson(region: string) {
  const regionPath = path.resolve(DATA_PATH, region);
  const allMonths = new Set<string>();
  try {
    const files = await fs.readdir(regionPath);
    files
      .filter((file: string) => file.endsWith('.json'))
      .forEach((file: string) => allMonths.add(file.replace('.json', '')));
  } catch (error) {
    // region directory might not exist
    return;
  }

  const sortedMonths = Array.from(allMonths).sort().reverse();
  const filePath = path.resolve(regionPath, 'months.json');
  await fs.writeFile(filePath, JSON.stringify(sortedMonths, null, 2));
  log(`Generated ${filePath}`);
}
