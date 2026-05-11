import { defineConfig, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(here, '..', '..');
const meshesRoot = resolve(repoRoot, 'data', 'canonical', 'meshes');
const registryPath = resolve(repoRoot, 'data', 'derived', 'mesh-registry.json');

/**
 * Dev-only static middleware that maps:
 *   GET /registry.json           -> data/derived/mesh-registry.json
 *   GET /meshes/<sub>/<file>.glb -> data/canonical/meshes/<sub>/<file>.glb
 *
 * Production deploy of these assets is out of scope for Phase 1 dev-only
 * (3D Engine agent spec). Path traversal guarded by `resolve` + prefix check.
 *
 * Why a middleware rather than `server.fs.allow` + `import.meta.glob`?
 *   - The canonical mesh tree lives outside Vite's `root` and `public`, and
 *     symlinks on Windows have permission caveats. A 30-line middleware is
 *     simpler than copying ~50 MB of glbs into `public/` and keeps the
 *     canonical data the single source of truth.
 */
function canonicalMeshStaticPlugin(): Plugin {
  const send404: Connect.SimpleHandleFunction = (_req, res) => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not Found');
  };

  return {
    name: 'body-canonical-mesh-static',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          return next();
        }
        const url = new URL(req.url, 'http://localhost');
        const path = url.pathname;

        if (path === '/registry.json') {
          try {
            const s = await stat(registryPath);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Length', s.size.toString());
            res.setHeader('Cache-Control', 'no-cache');
            createReadStream(registryPath).pipe(res);
          } catch {
            send404(req, res);
          }
          return;
        }

        if (path.startsWith('/meshes/')) {
          const sub = decodeURIComponent(path.slice('/meshes/'.length));
          // Guard: no parent-dir traversal, no absolute paths.
          if (sub.includes('..') || sub.startsWith('/') || sub.includes('\0')) {
            return send404(req, res);
          }
          const target = normalize(resolve(meshesRoot, sub));
          // Belt-and-braces: ensure resolved path stays under meshesRoot.
          if (!target.startsWith(meshesRoot + sep) && target !== meshesRoot) {
            return send404(req, res);
          }
          try {
            const s = await stat(target);
            if (!s.isFile()) {
              return send404(req, res);
            }
            res.setHeader('Content-Type', 'model/gltf-binary');
            res.setHeader('Content-Length', s.size.toString());
            res.setHeader('Cache-Control', 'no-cache');
            createReadStream(target).pipe(res);
          } catch {
            send404(req, res);
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), canonicalMeshStaticPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      // Allow Vite to read source files anywhere under the repo root (data/,
      // pipelines/) if it ever needs to. The middleware above is what
      // actually serves them.
      allow: [repoRoot],
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
