import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    base: './',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('three')) return 'three'
                }
            }
        },
        chunkSizeWarningLimit: 1000,
    },
    server: {
        port: 5173,
        strictPort: true
    },
})
