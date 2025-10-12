import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import { PurgeCSS } from 'purgecss';

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
  };

  // Build the main wallpaper update script
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
    outfile: `${DIST_PATH}/worker.js`,
    loader: { '.html': 'text' },
  });
  console.log('Built worker/index.ts');

  // Minify and copy app.js
  await esbuild.build({
    ...buildOptions,
    entryPoints: [`${WORKER_SRC_PATH}/assets/app.js`],
    outfile: `${DIST_PATH}/app.js`,
  });
  console.log('Minified app.js');

  // Minify and copy index.html
  const htmlContent = await fs.readFile(`${WORKER_SRC_PATH}/index.html`, 'utf-8');
  const minifiedHtml = await esbuild.transform(htmlContent, {
    loader: 'text',
    minify: true,
  });
  await fs.writeFile(`${DIST_PATH}/index.html`, minifiedHtml.code);
  console.log('Minified and copied index.html');

  // Copy style.css to be purged
  await fs.copyFile(`${WORKER_SRC_PATH}/assets/style.css`, `${DIST_PATH}/style.css`);
  console.log('Copied style.css for purging');

  // Purge unused CSS
  const purgeCSSResults = await new PurgeCSS().purge({
    content: [`${DIST_PATH}/index.html`, `${DIST_PATH}/worker.js`],
    css: [`${DIST_PATH}/style.css`],
  });
  await fs.writeFile(`${DIST_PATH}/style.css`, purgeCSSResults[0].css);
  console.log('Purged unused CSS from style.css');

  console.log('Build complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
