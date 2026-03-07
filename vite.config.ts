import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve, extname } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const parentDir = resolve(__dirname, '..')

const MIME: Record<string, string> = {
  '.geojson': 'application/json',
  '.json': 'application/json',
  '.png': 'image/png',
}

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'serve-parent-static',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = (req.url ?? '/').split('?')[0]
          if (url.startsWith('/geojson/') || url.startsWith('/tiles/')) {
            const filePath = resolve(parentDir, url.slice(1))
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const mime = MIME[extname(filePath)] ?? 'application/octet-stream'
              res.setHeader('Content-Type', mime)
              fs.createReadStream(filePath).pipe(res as NodeJS.WritableStream)
              return
            }
          }
          next()
        })
      },
    },
  ],
})
