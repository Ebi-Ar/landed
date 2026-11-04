import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/** Serves api/*.ts during `npm run dev`, the way Vercel does in production. */
function devApi(): Plugin {
  return {
    name: 'landed-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/', async (req, res) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\/+/, '').replace(/[^a-z0-9-]/gi, '')
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const response: Response = await mod.default(new Request(`http://localhost${req.originalUrl ?? req.url}`, { method: req.method, headers }))
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(await response.text())
        } catch (e) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ status: 'error', message: String(e) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Server-only secrets for the dev API (never prefixed VITE_, so never bundled).
  const env = loadEnv(mode, process.cwd(), '')
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'LABEL_HASH_SALT', 'VITE_SUPABASE_URL']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k]
  }
  return {
    plugins: [react(), tailwindcss(), devApi()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: { host: true },
    build: { chunkSizeWarningLimit: 700 },
  }
})
