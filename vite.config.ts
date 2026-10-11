import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// dist/references holds the style video and sample drawings, which are inputs and not build output.
// Vite empties outDir by default, so clear everything except that folder ourselves.
const keepReferences = (): Plugin => ({
  name: 'keep-references',
  apply: 'build',
  buildStart() {
    const dist = path.resolve('dist')
    if (!fs.existsSync(dist)) return
    for (const name of fs.readdirSync(dist)) {
      if (name !== 'references') fs.rmSync(path.join(dist, name), { recursive: true, force: true })
    }
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), keepReferences()],
  build: { emptyOutDir: false, chunkSizeWarningLimit: 1800 },
})
