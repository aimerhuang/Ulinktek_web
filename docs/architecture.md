# Architecture

## Runtime model

This Nuxt 4 website runs as a Nitro `node-server` behind IIS. The complete
`.output` directory is deployable: `.output/public` contains browser assets and
the IIS `web.config`, while `.output/server/index.mjs` renders pages and discovery
routes from current published data. Anonymous public HTML and discovery outputs use
short blocking Nitro response caches; the first request after expiry waits for fresh data.

```
Browser -> IIS canonical host and security boundary
             |-> /api/public, /api/forum, /api/admin, /api/auth,
             |   /api/users, /api, /assets, /_AMapService             -> ASP.NET backend
             |-> physical /_nuxt, fonts, and public files              -> IIS static content
             +-> all remaining page and discovery requests             -> Nuxt on 127.0.0.1
                                                                              -> public APIs
```

The browser deliberately calls same-origin `/api/*`, avoiding a browser CORS dependency. In development Nitro proxies it to the local backend; in production IIS ARR and URL Rewrite proxy it. Formal public/forum and authenticated management prefixes are matched before the generic `/api/*` rule. `/api/admin/*`, `/api/auth/*`, and `/api/users/*` preserve their backend paths and do not bypass backend authentication or authorization. Server rendering calls the absolute server-only API bases directly with `X-Ulink-SSR-Key`, an 8-second default timeout, and no automatic retry. Public Chinese HTML uses a 60-second blocking cache, prepared English routes use 300 seconds, Sitemap and `llms.txt` use 60 seconds, and `robots.txt` uses 3600 seconds. Forum pages, API/proxy/assets, and health are excluded; hashed `/_nuxt/*` assets remain immutable.

## Configuration and data flow

| Setting | Consumer | Purpose |
| --- | --- | --- |
| `NUXT_PUBLIC_API_BASE` | Browser | Same-origin API prefix, normally `/api`. |
| `NUXT_API_SERVER_BASE` | Nuxt server | Absolute versioned content API base, for example `https://backend.example.com/api/v1/public`. |
| `NUXT_SITE_API_SERVER_BASE` | Nuxt server | Absolute formal site/home/product API base, for example `https://backend.example.com/api/public`. |
| `NUXT_TRUSTED_SSR_API_KEY` | Nuxt server | Private credential sent only on server-owned content reads; must equal API `TrustedSsr__ApiKey`. |
| `NUXT_CONTENT_API_TIMEOUT_SECONDS` | Nuxt server | Per-read total timeout, default 8 and clamped to 1-30 seconds; retries are disabled. |
| `NUXT_IIS_PROXY_TARGET` | Build script | Backend origin injected into generated `web.config`, for example `https://backend.example.com`. |
| `NUXT_IIS_NODE_TARGET` | Build script | Loopback HTTP Nuxt origin injected into generated `web.config`, normally `http://127.0.0.1:3001`. |
| `NITRO_HOST`, `NITRO_PORT` | Nuxt server | Loopback binding used by the NSSM service. |
| `NUXT_PUBLIC_AMAP_KEY` | Browser | Public AMap Web JS API key. Never use the AMap `securityJsCode` here. |

`useApiUrl()` selects `NUXT_API_SERVER_BASE` when code runs on the server and `NUXT_PUBLIC_API_BASE` in a browser. `useSiteApiUrl()` does the same for formal `/api/public` endpoints, including navigation, homepage configuration, product listings, product categories, and public forum reads. `useForumApi()` sends anonymous community reads through the SSR-aware public content fetch and keeps authenticated profile/post/comment writes as browser requests to same-origin `/api/forum/*`.

Required API failures fail the current SSR response. Upstream 429, 500, 502, 503, 504, timeout, and network failures become Nuxt 503 with a safe `Retry-After`; 404 remains the existing detail/contact contract, while malformed successful data remains a 500-class application defect. A successful empty list is a valid content state and renders the module's empty-state UI. The response cache stores only successful anonymous output, coalesces same-key refreshes, includes the full path/query in its key, and limits Chinese publication staleness to 60 seconds.

## Public backend contract

Public rendering currently uses three backend prefixes. The same-origin gateway also preserves authenticated `/api/admin/*`, `/api/auth/*`, and `/api/users/*` paths for the co-hosted admin client and operational tooling; public page components do not consume them.

| Prefix | Endpoint | Frontend use |
| --- | --- | --- |
| `/api/public` | `GET /navigation?position=main`, `GET /site` | Header navigation, CTA, logo, footer, and site metadata. |
| `/api/public` | `GET /banners?position=home`, `GET /home` | Homepage carousel and managed featured products. |
| `/api/public` | `GET /product-categories/tree`, `GET /products` | Product navigation, category labels, homepage catalog, product list, and route discovery. |
| `/api/public` | `GET /forum/summary`, `/forum/categories`, `/forum/posts`, `/forum/posts/{id}`, `/forum/users/{id}` | SSR community overview, categories, pinned/latest/search results, post details, and public profiles. |
| `/api/public` | `GET /inquiries/captcha`, `POST /inquiries` | Contact captcha issuance and public form submission. |
| `/api/v1/public` | `GET /products/{slug}` | Published product detail lookup, with the formal product list as the compatibility fallback. |
| `/api/v1/public` | `GET /media`, `GET /media/{slug}` | Knowledge list data, homepage application content, `/zh/knowledge/[slug]` pages, and discovery output. The API resource name remains `media`; items carry a nullable `category { name, slug }`. |
| `/api/public` | `GET /article-categories`, `GET /article-categories/{slug}` | Knowledge category tabs, homepage category links, `/zh/knowledge/categories/[slug]` pages (category plus one page of articles; historical slugs return the current category), sitemap entries, and grouped `llms.txt`. |
| `/api/v1/public` | `GET /service/faqs`, `GET /service/policies` | Support and FAQ pages. |
| `/api/v1/public` | `GET /resources` | Legacy compatibility inventory only; it is not rendered by the new resource center. |
| `/api/v1/public` | `GET /videos`, `GET /videos/{slug}` | Video list/detail pages, route discovery, and controlled playback/watch actions. |
| `/api/v1/public` | `GET /software-downloads`, `GET /software-downloads/{slug}` | Download list/detail pages and stable download actions. |
| `/api/v1/public` | `GET /about`, `GET /certificates`, `GET /contact` | Brand content, certificate images, and contact/map data. |
| `/api/forum` | Auth, current-user, post, and comment actions | Browser-only forum registration, login, session restoration, and authenticated submissions. |

`InquiryForm` first loads `GET /api/public/inquiries/captcha`, then submits the fixed contact contract to same-origin `POST /api/public/inquiries`. The browser sends only `formCode`, `name`, `email`, `phone`, `company`, `message`, `sourcePath`, `captchaId`, `captchaCode`, and the empty `website` Honeypot. A sent-request failure clears and refreshes only the captcha while retaining business fields and privacy consent. The backend owns final validation, challenge signing, HMAC risk identifiers, three rate-limit dimensions, availability, and 30-minute duplicate suppression; the UI treats both `201` and `202` as the same non-disclosing success state.

`/zh/resources` is a directory. Published video/download lists and canonical detail routes are rendered from their dedicated paginated contracts. List pages never preload videos; detail actions remain live `/assets/*` routes so publication is rechecked for every action. The shared footer reads the current public site settings, renders three upper columns, and projects ICP, public-security, and copyright entries with independent optional images.

The homepage is server-rendered from current site, navigation, media, and About records. The community route is also server-rendered: `/zh/forum` shows overview, up to three global pins, seven categories, and twelve latest discussions; category and post routes load their primary content before HTML is returned. Authenticated session restoration and writes remain browser-owned.

The contact map is mounted in the browser with AMap JS API 2.0. The current SSR contact record must
contain `mapProvider=amap` and a finite GCJ-02 longitude/latitude pair. The browser receives only the
public Web JS key and sends AMap security requests to same-origin `/_AMapService/*`; IIS forwards that
prefix to the API, where the server-owned `securityJsCode` is appended. Navigation is an independent
`https://uri.amap.com/navigation` link and remains available if the interactive map fails.

## Responsive images

`MediaPlaceholder` (`responsive="card"` uses 320/600/960, `"detail"` uses 600/960/1440) and the `ProductGallery` thumbnails (320) and video poster (1440) build image variants only through `trustedImageVariant(value, width, siteUrl)` / `trustedImageSrcset(value, widths, siteUrl)` in `shared/content/image-variants.ts`, passing `runtimeConfig.public.siteUrl`:

- Managed site images are exactly `/assets/managed/{storageKey}` (one path segment, no query, hash, `..`, backslash, or extra slash), either relative or absolute on the `siteUrl` origin. Variants append `?w={width}`; the API resizes on demand to that width, keeps the format and aspect ratio, returns the original when it is not wider, caches the copy, and answers 400 for any width outside 320/600/960/1440. Absolute managed URLs on any other origin (including a development API origin) get no variants.
- Shopify images on `https://cn.ulinktek.com/cdn/shop/*` and `https://cdn.shopifycdn.net/s/files/*` keep the `?width=` rule, because the admin product editor still accepts external image URLs; the product image migration (`/api/admin/assets/external-images/*` in the API) moves them to managed assets afterwards. The CSP `img-src` Shopify hosts therefore stay.
- Any other image or width returns `undefined`; callers fall back to the original `src`, and a `srcset` is emitted only when every requested width resolves.

Covered by `tests/image-variants.test.mjs`.

## SSR routing and IIS behavior

- The canonical homepage is `/`; the legacy `/zh` homepage redirects permanently to `/`.
- Published products render at `/zh/products/[slug]`.
- Published knowledge articles render canonically at `/zh/knowledge/[slug]`; legacy `/zh/media` list/detail requests return permanent redirects.
- Knowledge categories render at `/zh/knowledge/categories/[slug]` (`?page=N`); historical category slugs 301 to the current slug, disabled or unknown categories return 404, and empty categories are `noindex, follow` and absent from discovery. The visible breadcrumb gains the category after mount (the layout breadcrumb renders before page setup); the SSR `BreadcrumbList` and `articleSection` carry it for crawlers.
- Published videos and downloads render under `/zh/resources/videos/[slug]` and `/zh/resources/downloads/[slug]`.
- Community categories use `/zh/forum/category/[id]`; old `?category=` links redirect permanently. Posts use `/zh/forum/[id]`, public profiles use `/zh/forum/users/[id]`, and member profile settings use `/zh/forum/profile`.
- `/zh/faq` redirects permanently to `/zh/support`.
- Missing product/media/video/download records return Nuxt 404 responses at request time. Missing legacy single-segment resource links redirect permanently to `/zh/resources`.
- IIS serves existing physical files, then proxies every remaining page request to the loopback Nuxt service. There is no SPA `index.html` or forum `200.html` fallback.
- `web.config` proxies `/_AMapService/*`, formal public/forum APIs, and authenticated management prefixes before the generic versioned API rule, then adds security headers.
- ARR must set server-level `reverseRewriteHostInResponseHeaders=false`; otherwise reviewed backend redirects such as video CDN targets are rewritten onto the website host.
- The CSP allows the AMap JS API script host, default AMap tile images, same-origin security proxy, and blob workers. It has no Google or AMap frame permission because the map is not an iframe.

## Navigation

The complete primary-navigation tree comes from `GET /api/public/navigation?position=main` and is rendered by `components/SiteHeader.vue`. The header forum account bar depends on the browser-held forum session, so it renders inside `<ClientOnly>` with a fixed-height placeholder; SSR HTML carries no login/register text ahead of `<main>`.

- Root entries and their enabled descendants determine the header labels, order, and links; the footer reuses only the root entries.
- Product-category links use stable category slugs, and `displayStyle=cta` identifies the contact action.
- Desktop users open child menus by hover or keyboard focus; mobile users use the toggle button.

## Search discovery

`llms.txt`, `robots.txt`, and `sitemap.xml` are runtime Nitro routes backed by the blocking response TTLs above. The sitemap includes the community home, first-page enabled categories, and public posts that pass the forum index policy in `shared/forum/indexing.ts`: at least `NUXT_PUBLIC_FORUM_INDEX_MIN_BODY_CHARS` (default 300) non-whitespace visible body characters, or at least `NUXT_PUBLIC_FORUM_INDEX_MIN_COMMENTS` (default 3) public replies. Posts below both thresholds stay public but render `noindex, follow`; the post page and the sitemap apply the same policy, so no sitemap URL answers `noindex`. Malformed values fall back to the defaults. Search, page 2+, auth/write/profile routes and public user profiles are `noindex` and excluded. Forum post pages emit canonical metadata plus `DiscussionForumPosting`; Beanheads render locally from a locked dependency and fall back to nickname initials on component or image failure.

## GEO and structured metadata

Product and media detail pages return complete SSR HTML, so their titles, summaries, visible content, and structured metadata are available without client-side navigation. Product pages emit `Product` and `BreadcrumbList` JSON-LD. Media pages emit `Article` JSON-LD. The current GEO layer is a technical discovery baseline: `llms.txt` exposes links and short summaries, while full product facts and article bodies remain on the canonical detail pages. It does not yet provide a dedicated product-facts feed, FAQ schema, or question-oriented answer blocks.
