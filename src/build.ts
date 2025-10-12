import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import * as path from 'path';

const DIST_PATH = 'dist';
const WORKER_SRC_PATH = 'src/worker';

async function main() {
  // Clean the dist directory
  await fs.rm(DIST_PATH, { recursive: true, force: true });
  await fs.mkdir(DIST_PATH, { recursive: true });

  // Common esbuild options
  const buildOptions: esbuild.BuildOptions = {
    bundle: true,
    minify: true,
    platform: 'node',
  };

  // Build the main wallpaper update script
  await esbuild.build({
    ...buildOptions,
    entryPoints: ['src/update-wallpaper/main.ts'],
    outfile: `${DIST_PATH}/main.js`,
  });
  console.log('Built main.ts');

  // Build the Cloudflare Worker script
  await esbuild.build({
    ...buildOptions,
    entryPoints: [`${WORKER_SRC_PATH}/index.ts`],
    outfile: `${DIST_PATH}/worker.js`,
  });
  console.log('Built worker/index.ts');

  // Minify the worker's app.js
  await esbuild.build({
    ...buildOptions,
    entryPoints: [`${WORKER_SRC_PATH}/assets/app.js`],
    outfile: `${DIST_PATH}/app.js`,
    allowOverwrite: true,
  });
  console.log('Minified worker/assets/app.js');

  // Minify and copy HTML
  const htmlContent = await fs.readFile(`${WORKER_SRC_PATH}/index.html`, 'utf-8');
  const minifiedHtml = await esbuild.transform(htmlContent, {
    loader: 'text',
    minify: true,
  });
  await fs.writeFile(`${DIST_PATH}/index.html`, minifiedHtml.code);
  console.log('Minified and copied index.html');

  // Copy CSS (to be purged later)
  await fs.copyFile(`${WORKER_SRC_PATH}/assets/style.css`, `${DIST_PATH}/style.css`);
  console.log('Copied style.css');

  console.log('Build complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
