import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import { PurgeCSS } from 'purgecss';

const DIST_PATH = 'dist';
const WORKER_SRC_PATH = 'src/worker';

// Helper function to aggressively minify and clean a string
function cleanAndMinify(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
    .replace(/\s+/g, ' ')             // Collapse whitespace
    .replace(/> </g, '><')            // Remove space between tags
    .replace(/(\r\n|\n|\r)/gm, "")    // Remove newlines
    .trim();
}

async function main() {
  // 1. Clean and create directories
  await fs.rm(DIST_PATH, { recursive: true, force: true });
  await fs.mkdir(`${DIST_PATH}/dist`, { recursive: true });
  await fs.mkdir(`${DIST_PATH}/src`, { recursive: true });

  // 2. Prepare all assets as minified, single-line strings
  // --- Manually Minify HTML ---
  const htmlContent = await fs.readFile(`${WORKER_SRC_PATH}/index.html`, 'utf-8');
  const minifiedHtml = cleanAndMinify(htmlContent);

  // --- Minify JS ---
  const jsContent = await fs.readFile(`${WORKER_SRC_PATH}/assets/app.js`, 'utf-8');
  const minifiedJs = await esbuild.transform(jsContent, { loader: 'js', minify: true });

  // --- Purge and Minify CSS ---
  const purgeCSSResults = await new PurgeCSS().purge({
    content: [{ raw: htmlContent, extension: 'html' }, { raw: jsContent, extension: 'js' }],
    css: [`${WORKER_SRC_PATH}/assets/style.css`],
  });
  const minifiedCss = await esbuild.transform(purgeCSSResults[0].css, { loader: 'css', minify: true });

  // 3. Build the worker, injecting the assets
  await esbuild.build({
    bundle: true,
    minify: true,
    format: 'esm', // <--- CRITICAL: Preserve the export default structure
    platform: 'browser',
    charset: 'utf8',
    entryPoints: [`${WORKER_SRC_PATH}/index.ts`],
    outfile: `${DIST_PATH}/src/worker.js`,
    define: {
      __HTML__: JSON.stringify(minifiedHtml),
      __JS__: JSON.stringify(cleanAndMinify(minifiedJs.code)),
      __CSS__: JSON.stringify(cleanAndMinify(minifiedCss.code)),
    },
  });
  console.log('Built worker.js with single-line inlined assets');

  // 4. Build the separate main.js script
  await esbuild.build({
    bundle: true,
    minify: true,
    platform: 'node',
    entryPoints: ['src/update-wallpaper/main.ts'],
    outfile: `${DIST_PATH}/main.js`,
  });
  console.log('Built main.js');

  console.log('Build complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
