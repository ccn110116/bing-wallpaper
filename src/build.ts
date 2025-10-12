import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import { PurgeCSS } from 'purgecss';

const DIST_PATH = 'dist';
const WORKER_SRC_PATH = 'src/worker';

async function main() {
  // Clean and create the dist directory and subdirectories
  await fs.rm(DIST_PATH, { recursive: true, force: true });
  await fs.mkdir(`${DIST_PATH}/src`, { recursive: true });
  await fs.mkdir(`${DIST_PATH}/assets`, { recursive: true });

  // Common esbuild options for minification
  const buildOptions: esbuild.BuildOptions = {
    bundle: true,
    minify: true,
    charset: 'utf8', // Ensures proper character encoding
  };

  // Build the main wallpaper update script (not part of the worker deployment)
  await esbuild.build({
    ...buildOptions,
    platform: 'node',
    entryPoints: ['src/update-wallpaper/main.ts'],
    outfile: `${DIST_PATH}/main.js`,
  });
  console.log('Built main.ts');

  // Build the Cloudflare Worker script
  await esbuild.build({
    ...buildOptions,
    platform: 'browser',
    entryPoints: [`${WORKER_SRC_PATH}/index.ts`],
    outfile: `${DIST_PATH}/src/worker.js`,
    loader: { '.html': 'text' },
  });
  console.log('Built worker.js to dist/src/');

  // Minify and write app.js
  await esbuild.build({
    ...buildOptions,
    entryPoints: [`${WORKER_SRC_PATH}/assets/app.js`],
    outfile: `${DIST_PATH}/assets/app.js`,
  });
  console.log('Minified app.js to dist/assets/');

  // Minify and write index.html
  const htmlContent = await fs.readFile(`${WORKER_SRC_PATH}/index.html`, 'utf-8');
  const minifiedHtml = await esbuild.transform(htmlContent, {
    loader: 'text',
    minify: true,
  });
  await fs.writeFile(`${DIST_PATH}/src/index.html`, minifiedHtml.code);
  console.log('Minified index.html to dist/src/');

  // Purge and minify style.css
  const purgeCSSResults = await new PurgeCSS().purge({
    content: [`${WORKER_SRC_PATH}/index.html`, `${WORKER_SRC_PATH}/assets/app.js`],
    css: [`${WORKER_SRC_PATH}/assets/style.css`],
  });
  const minifiedCss = await esbuild.transform(purgeCSSResults[0].css, {
    loader: 'css',
    minify: true,
  });
  await fs.writeFile(`${DIST_PATH}/assets/style.css`, minifiedCss.code);
  console.log('Purged and minified style.css to dist/assets/');

  console.log('Build complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
