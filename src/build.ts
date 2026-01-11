import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import { PurgeCSS } from 'purgecss';
import * as path from 'path';

const DIST_PATH = 'dist';
const WORKER_SRC_PATH = 'src/worker';
const CONTENTS_PATH = path.join(WORKER_SRC_PATH, 'contents');
const ASSETS_PATH = path.join(WORKER_SRC_PATH, 'assets');

async function main() {
  // 1. Clean and create directories
  await fs.rm(DIST_PATH, { recursive: true, force: true });
  await fs.mkdir(path.join(DIST_PATH, 'js'), { recursive: true });

  // 2. Build and minify assets in parallel
  const [htmlContent, jsContent, errorHtmlContent] = await Promise.all([
    fs.readFile(path.join(CONTENTS_PATH, 'index.html'), 'utf-8'),
    esbuild.build({
      entryPoints: [path.join(ASSETS_PATH, 'js', 'main.js')],
      bundle: true,
      minify: true,
      format: 'esm',
      outfile: path.join(DIST_PATH, 'js', 'main.js'),
      write: false,
    }).then(result => result.outputFiles[0].text),
    fs.readFile(path.join(ASSETS_PATH, 'error.html'), 'utf-8'),
  ]);

  // 3. Create a constants file with embedded assets
  await fs.writeFile(
    path.join(DIST_PATH, 'assets.ts'),
    `export const ERROR_HTML = ${JSON.stringify(errorHtmlContent)};\n`
  );

  await Promise.all([
    // --- Purge and Minify CSS ---
    new PurgeCSS().purge({
      content: [{ raw: htmlContent, extension: 'html' }, { raw: jsContent, extension: 'js' }],
      css: [path.join(ASSETS_PATH, 'style.css')],
    }).then(async (purgeCSSResults) => {
      const minifiedCss = await esbuild.transform(purgeCSSResults[0].css, { loader: 'css', minify: true });
      await fs.writeFile(path.join(DIST_PATH, 'style.css'), minifiedCss.code);
    }),
    
    // --- Write JS ---
    fs.writeFile(path.join(DIST_PATH, 'js', 'main.js'), jsContent),

    // --- Copy other assets ---
    fs.copyFile(path.join(CONTENTS_PATH, 'index.html'), path.join(DIST_PATH, 'index.html')),
    fs.copyFile(path.join(CONTENTS_PATH, 'locales.json'), path.join(DIST_PATH, 'locales.json')),
  ]);
  
  console.log('Processed and copied static assets to dist/');

  // 4. Build worker and updater in parallel
  await Promise.all([
    esbuild.build({
      bundle: true,
      minify: true,
      format: 'esm',
      platform: 'browser',
      charset: 'utf8',
      entryPoints: [path.join(WORKER_SRC_PATH, 'index.ts')],
      outfile: path.join(DIST_PATH, 'worker.js'),
    }),
    esbuild.build({
      bundle: true,
      minify: true,
      platform: 'node',
      entryPoints: ['src/update-wallpaper/index.ts'],
      outfile: path.join(DIST_PATH, 'main.js'),
    }),
  ]);

  console.log('Built worker.js and main.js');
  console.log('Build complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});