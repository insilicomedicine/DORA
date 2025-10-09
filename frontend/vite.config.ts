import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  const enableBundleAnalyzer = env.VITE_ENABLE_BUNDLE_ANALYZER === 'true';
  return {
    plugins: [
      react(),
      svgr(),
      // Enable bundle analyzer only when explicitly requested
      ...(enableBundleAnalyzer
        ? [
            visualizer({
              open: false,
              filename: 'bundle-analysis.html',
              gzipSize: true,
              brotliSize: true,
              template: 'treemap',
              title: 'Dora Frontend Bundle Analysis',
              sourcemap: true
            })
          ]
        : [])
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts']
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    resolve: {
      alias: {
        assets: path.resolve(__dirname, './src/assets'),
        components: path.resolve(__dirname, './src/components'),
        contexts: path.resolve(__dirname, './src/contexts'),
        pages: path.resolve(__dirname, './src/pages'),
        hooks: path.resolve(__dirname, './src/hooks'),
        services: path.resolve(__dirname, './src/services'),
        types: path.resolve(__dirname, './src/types'),
        utils: path.resolve(__dirname, './src/utils'),
        theme: path.resolve(__dirname, './src/theme'),
        config: path.resolve(__dirname, './src/config')
      }
    },
    build: {
      outDir: 'build',
      // Target older browsers with realistic transformation capabilities
      target: ['es2015', 'chrome61', 'firefox54', 'edge79', 'safari12'],
      // Disable sourcemaps in production builds to avoid source exposure
      // Re-enable when analyzing bundles
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router'],
            mui: [
              '@mui/material',
              '@mui/icons-material',
              '@mui/system',
              '@emotion/react',
              '@emotion/styled'
            ],
            muiX: ['@mui/x-charts', '@mui/x-tree-view'],
            prosemirror: [
              'prosemirror-model',
              'prosemirror-state',
              'prosemirror-keymap'
            ],
            tiptap: [
              '@tiptap/core',
              '@tiptap/starter-kit',
              '@tiptap/extension-blockquote',
              '@tiptap/extension-bullet-list',
              '@tiptap/extension-color',
              '@tiptap/extension-heading',
              '@tiptap/extension-highlight',
              '@tiptap/extension-link',
              '@tiptap/extension-list-item',
              '@tiptap/extension-ordered-list',
              '@tiptap/extension-paragraph',
              '@tiptap/extension-table',
              '@tiptap/extension-table-cell',
              '@tiptap/extension-table-header',
              '@tiptap/extension-table-row',
              '@tiptap/extension-text-align',
              '@tiptap/extension-text-style',
              '@tiptap/extension-underline',
              '@tiptap/react'
            ]
          }
        }
      }
    }
  };
});
