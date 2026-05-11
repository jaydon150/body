#!/usr/bin/env node
/**
 * tests/rendering-snapshots/capture.mjs
 *
 * Phase 1 step P1.17 — visual regression baseline capture.
 *
 * What this script does:
 *   1. Starts `vite preview` in the background (the app must already be
 *      built — run `npm run build` first). The preview server reuses the
 *      `canonicalMeshStaticPlugin` from vite.config.ts, which now also
 *      registers under `configurePreviewServer`, so /registry.json and
 *      /meshes/* are served the same way as in dev.
 *   2. Waits for the server to be reachable on http://localhost:5173.
 *   3. For each of three viewports (desktop 1920x1080, iPad-landscape
 *      1366x1024, iPad-portrait 768x1024):
 *        a. opens a new Playwright Chromium context at that viewport;
 *        b. navigates to http://localhost:5173/;
 *        c. waits for `networkidle`;
 *        d. waits an additional 4 s for any tail-end GLB streams + R3F
 *           render passes to settle;
 *        e. screenshots the full viewport to
 *           tests/rendering-snapshots/baseline-<viewport>.png.
 *   4. Cleanly terminates the preview server and exits.
 *
 * Phase 1 only *captures* baselines. Phase 2 will introduce diff-based
 * gating in CI.
 *
 * Run from app/web/ as:
 *   npm run capture:baselines
 *
 * Or directly from the repo root:
 *   node tests/rendering-snapshots/capture.mjs
 *
 * Env overrides (optional):
 *   PORT         override server port (default 5173)
 *   STARTUP_MS   max ms to wait for the server to come up (default 30000)
 *   SETTLE_MS    extra wait after networkidle (default 4000)
 */

import { spawn } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const webRoot = resolve(repoRoot, 'app', 'web');
const distDir = resolve(webRoot, 'dist');
const outDir = __dirname;

// Playwright lives in app/web/node_modules/ — this script sits two levels
// up under tests/rendering-snapshots/, so Node ESM's package-lookup won't
// find it via the bare specifier. Import via the package's exported entry
// directly. The same pattern is used by pipelines/06 + 07 for ajv.
const playwrightEntry = pathToFileURL(
  resolve(webRoot, 'node_modules', '@playwright', 'test', 'index.mjs'),
).href;
const { chromium } = await import(playwrightEntry);

const PORT = Number(process.env.PORT ?? 5173);
const STARTUP_MS = Number(process.env.STARTUP_MS ?? 30000);
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 4000);

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'ipad-landscape', width: 1366, height: 1024 },
  { name: 'ipad-portrait', width: 768, height: 1024 },
];

/** Pretty-printer. */
const log = (msg) => console.log(`[capture] ${msg}`);

/** Sleep helper. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll until the server returns *any* HTTP response, or time out. */
async function waitForServer(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      // Any response (even 404) means the server is alive.
      if (res.status > 0) return;
    } catch {
      // Connection refused — keep waiting.
    }
    await sleep(250);
  }
  throw new Error(`vite preview did not come up on :${port} within ${timeoutMs} ms`);
}

async function main() {
  // Sanity: dist must exist.
  if (!existsSync(distDir)) {
    console.error(
      `FAIL: ${distDir} does not exist.\n` +
      `      Run \`npm run build\` in app/web first.`,
    );
    process.exit(2);
  }

  mkdirSync(outDir, { recursive: true });

  // Start `vite preview` on PORT, in background, capturing output.
  // Invoke vite directly from app/web/node_modules/.bin so we side-step
  // npm's .cmd-shim entirely (Node 24 on Windows tightened spawn() for
  // .cmd targets, so going through npm needs shell:true; bypassing it is
  // simpler and faster). The preview server picks up vite.config.ts
  // naturally and the preview-side middleware fires.
  log(`starting vite preview on :${PORT} from ${webRoot}`);
  const isWindows = process.platform === 'win32';
  const viteBin = resolve(
    webRoot,
    'node_modules',
    'vite',
    'bin',
    'vite.js',
  );
  const preview = spawn(
    process.execPath,
    [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: webRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let previewExited = false;
  preview.on('exit', (code, signal) => {
    previewExited = true;
    if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGINT') {
      console.error(`[capture] vite preview exited unexpectedly (code=${code}, signal=${signal})`);
    }
  });
  preview.stderr.on('data', (chunk) => process.stderr.write(`[preview:stderr] ${chunk}`));
  // Swallow preview stdout (the "Local: http://..." banner) to keep our log clean.
  preview.stdout.on('data', () => {});

  // Ensure we always tear down.
  const cleanup = () => {
    if (!previewExited && !preview.killed) {
      try {
        if (isWindows) {
          // On Windows, kill the whole process tree of `npm run preview`
          // (the spawned node child + vite). taskkill is reliable here.
          spawn('taskkill', ['/pid', String(preview.pid), '/f', '/t'], { stdio: 'ignore' });
        } else {
          preview.kill('SIGTERM');
        }
      } catch {
        /* swallow */
      }
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });

  try {
    await waitForServer(PORT, STARTUP_MS);
    log(`vite preview ready on :${PORT}`);

    // Launch Chromium once; new context per viewport so cookies/cache don't bleed.
    const browser = await chromium.launch();
    log(`chromium launched (${browser.version()})`);

    const captured = [];

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        // Keep colour consistent across host platforms.
        colorScheme: 'light',
      });
      const page = await ctx.newPage();
      const url = `http://localhost:${PORT}/`;
      log(`[${vp.name} ${vp.width}x${vp.height}] navigating to ${url}`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (err) {
        log(`[${vp.name}] networkidle timeout — proceeding anyway: ${err.message}`);
      }
      log(`[${vp.name}] settling ${SETTLE_MS} ms for GLB streams`);
      await sleep(SETTLE_MS);

      const outPath = join(outDir, `baseline-${vp.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      captured.push({ viewport: vp, path: outPath });
      log(`[${vp.name}] screenshot -> ${outPath}`);

      await ctx.close();
    }

    await browser.close();

    log('');
    log('summary');
    log('-------');
    for (const c of captured) {
      log(`  ${c.viewport.name.padEnd(16)} ${c.viewport.width}x${c.viewport.height}  ${c.path}`);
    }
    log('');
    log(`captured ${captured.length}/${VIEWPORTS.length} baselines.`);
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error('[capture] FATAL:', err);
  process.exitCode = 1;
});
