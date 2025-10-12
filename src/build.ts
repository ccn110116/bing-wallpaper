import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import * as path from 'path';

const DIST_PATH = 'dist';
const WORKER_SRC_PATH = 'src/worker';

async function copyStaticFile(filePath: string) {
  const destPath = path.join(DIST_PATH, path.basename(filePath));
  await fs.copyFile(filePath, destPath);
  console.log(`Copied ${filePath} to ${destPath}`);
}

async function main() {
  // Clean the dist directory
  await fs.rm(DIST_PATH, { recursive: true, force: true });
  await fs.mkdir(DIST_PATH, { recursive: true });

  // Build the main wallpaper update script
  await esbuild.build({
    entryPoints: ['src/update-wallpaper/main.ts'],
    bundle: true,
    platform: 'node',
    outfile: `${DIST_PATH}/main.js`,
    minify: true,
  });
  console.log('Built main.ts');

  // Build the Cloudflare Worker script
  await esbuild.build({
    entryPoints: [`${WORKER_SRC_PATH}/index.ts`],
    bundle: true,
    outfile: `${DIST_PATH}/worker.js`,
    minify: true,
  });
  console.log('Built worker/index.ts');

  // Minify the worker's app.js
  await esbuild.build({
    entryPoints: [`${WORKER_SRC_PATH}/assets/app.js`],
    outfile: `${DIST_PATH}/app.js`,
    minify: true,
    allowOverwrite: true,
  });
  console.log('Minified worker/assets/app.js');

  // Copy static assets
  await copyStaticFile(`${WORKER_SRC_PATH}/index.html`);
  await copyStaticFile(`${WORKER_SRC_PATH}/assets/style.css`);

  console.log('Build complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
