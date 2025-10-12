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
    minifyWhitespace: true,
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

  // Purge and minify style.css before bundling
  const purgeCSSResults = await new PurgeCSS().purge({
    content: [`${WORKER_SRC_PATH}/index.html`, `${WORKER_SRC_PATH}/assets/app.js`],
    css: [`${WORKER_SRC_PATH}/assets/style.css`],
  });
  // No need to write the file, we will bundle it directly in the next step
  console.log('Purged unused CSS');

  console.log('Build complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
