import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 音声ファイルはリポジトリ直下の se/ と voice/ に置いたまま、
// 開発時はそのまま配信し、ビルド時は dist/ にコピーする。
const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const AUDIO_DIRS = ['se', 'voice']
const MIME: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
}

function audioAssets(): Plugin {
  let outDir = ''
  let isBuild = false
  return {
    name: 'zikaho-audio-assets',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
      isBuild = config.command === 'build'
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0] ?? '')
        const m = url.match(/^\/(se|voice)\/(.+)$/)
        if (!m) return next()
        const base = path.resolve(repoRoot, m[1]!)
        const file = path.resolve(base, m[2]!)
        if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          return next()
        }
        res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream')
        fs.createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      if (!isBuild) return
      for (const dir of AUDIO_DIRS) {
        const src = path.join(repoRoot, dir)
        if (fs.existsSync(src)) fs.cpSync(src, path.join(outDir, dir), { recursive: true })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), audioAssets()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
