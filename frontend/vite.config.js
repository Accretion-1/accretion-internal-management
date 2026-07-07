import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(() => {
    return {
        plugins: [
            react(),
            tailwindcss(),
            VitePWA({
                registerType: 'autoUpdate',
                strategies: 'generateSW',
                injectRegister: 'auto',
                manifestFilename: 'manifest.json',
                devOptions: {
                    enabled: true,
                    type: 'module',
                    navigateFallback: 'index.html',
                    suppressWarnings: true,
                },
                manifest: {
                    name: 'WorkSphere',
                    short_name: 'WorkSphere',
                    description: 'Enterprise workforce management application',
                    theme_color: '#ffffff',
                    background_color: '#ffffff',
                    display: 'standalone',
                    start_url: '/',
                    scope: '/',
                    icons: [
                        {
                            src: '/icons/pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png',
                        },
                        {
                            src: '/icons/pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                        },
                    ],
                },
                workbox: {
                    cleanupOutdatedCaches: true,
                    clientsClaim: true,
                    skipWaiting: true,
                    navigateFallback: '/index.html',
                    navigateFallbackDenylist: [/^\/api\//],
                    globPatterns: [
                        '**/*.{js,css,html,ico,png,jpg,jpeg,svg,webp,avif,woff,woff2,ttf}',
                    ],
                    globIgnores: [
                        '**/paddle-ocr*.js',
                        '**/worker-entry-*.js',
                    ],
                    runtimeCaching: [
                        {
                            urlPattern: ({ url, request }) =>
                                request.method === 'GET' && url.pathname.startsWith('/api/'),
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'api-runtime-cache',
                                networkTimeoutSeconds: 5,
                                cacheableResponse: {
                                    statuses: [0, 200],
                                },
                                expiration: {
                                    maxEntries: 50,
                                    maxAgeSeconds: 60 * 60,
                                },
                            },
                        },
                        {
                            urlPattern: ({ request }) =>
                                ['style', 'script', 'worker', 'image', 'font'].includes(
                                    request.destination,
                                ),
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'static-assets-cache',
                                cacheableResponse: {
                                    statuses: [0, 200],
                                },
                                expiration: {
                                    maxEntries: 100,
                                    maxAgeSeconds: 60 * 60 * 24 * 30,
                                },
                            },
                        },
                        {
                            urlPattern: ({ url }) =>
                                url.hostname === 'paddle-model-ecology.bj.bcebos.com'
                                || url.pathname.endsWith('.wasm')
                                || url.pathname.endsWith('.mjs'),
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'ocr-runtime-cache',
                                cacheableResponse: {
                                    statuses: [0, 200],
                                },
                                expiration: {
                                    maxEntries: 20,
                                    maxAgeSeconds: 60 * 60 * 24 * 30,
                                },
                            },
                        },
                    ],
                },
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
        server: {
            // HMR is disabled in AI Studio via DISABLE_HMR env var.
            // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
            hmr: process.env.DISABLE_HMR !== 'true',
            // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
            watch: process.env.DISABLE_HMR === 'true' ? null : {},
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (
                            id.includes('@paddleocr/paddleocr-js')
                            || id.includes('@techstark/opencv-js')
                            || id.includes('onnxruntime-web')
                        ) {
                            return 'paddle-ocr';
                        }

                        return undefined;
                    },
                },
            },
        },
    };
});
