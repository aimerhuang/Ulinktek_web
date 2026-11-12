export default defineNuxtConfig({
  compatibilityDate: '2026-07-30',
  devtools: { enabled: false },
  modules: ['@primevue/nuxt-module'],
  primevue: {
    autoImport: false,
    components: {
      include: ['Paginator', 'Skeleton'],
    },
    options: {
      unstyled: true,
    },
  },
  devServer: {
    // The default `localhost` binds IPv6 `[::1]` only on Windows, so browsers resolving to IPv4 get ERR_CONNECTION_REFUSED.
    host: '127.0.0.1',
    port: 8000,
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      viewport: 'width=device-width, initial-scale=1',
      // Baidu: one responsive URL serves PC and mobile, and its mobile search must not transcode pages.
      meta: [
        { name: 'applicable-device', content: 'pc,mobile' },
        // Distinct keys: unhead otherwise dedupes both by http-equiv and keeps only the last.
        { key: 'baidu-no-transform', 'http-equiv': 'Cache-Control', content: 'no-transform' },
        { key: 'baidu-no-siteapp', 'http-equiv': 'Cache-Control', content: 'no-siteapp' },
      ],
      link: [{ key: 'site-favicon', rel: 'icon', href: '/favicon.svg' }],
    },
  },
  routeRules: {
    '/': { cache: { maxAge: 60, swr: false } },
    '/zh/**': { cache: { maxAge: 60, swr: false } },
    '/en': { cache: { maxAge: 300, swr: false } },
    '/en/**': { cache: { maxAge: 300, swr: false } },
    '/sitemap.xml': { cache: { maxAge: 60, swr: false } },
    '/llms.txt': { cache: { maxAge: 60, swr: false } },
    '/robots.txt': { cache: { maxAge: 3600, swr: false } },
    '/api': { cache: false },
    '/api/**': { cache: false },
    '/_AMapService': { cache: false },
    '/_AMapService/**': { cache: false },
    '/assets': { cache: false },
    '/assets/**': { cache: false },
    '/healthz': { cache: false, headers: { 'cache-control': 'no-store' } },
    '/zh/forum': { cache: false, headers: { 'cache-control': 'no-store' } },
    '/zh/forum/**': { cache: false, headers: { 'cache-control': 'no-store' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },
  nitro: {
    preset: 'node-server',
    devProxy: {
      '/_AMapService': {
        target: 'http://localhost:5258/_AMapService',
        changeOrigin: true,
      },
      '/api/public': {
        target: 'http://localhost:5258/api/public',
        changeOrigin: true,
      },
      '/api/forum': {
        target: 'http://localhost:5258/api/forum',
        changeOrigin: true,
      },
      '/api/admin': {
        target: 'http://localhost:5258/api/admin',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:5258/api/auth',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:5258/api/users',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:5258/api/v1/public',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://localhost:5258/assets',
        changeOrigin: true,
      },
    },
  },
  runtimeConfig: {
    apiServerBase: '',
    siteApiServerBase: '',
    trustedSsrApiKey: '',
    contentApiTimeoutSeconds: 8,
    // Used only by the optional local Nuxt API during development.
    directusUrl: '',
    directusToken: '',
    public: {
      apiBase: '/api',
      siteApiBase: '/api/public',
      amapKey: '',
      siteUrl: 'https://www.szulink.com.cn',
      siteName: '优联科技',
      // Forum posts below both thresholds render `noindex, follow` and stay out of sitemap.xml.
      forumIndexMinBodyChars: 300,
      forumIndexMinComments: 3,
    },
  },
})
