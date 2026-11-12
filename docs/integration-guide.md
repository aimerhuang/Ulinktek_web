# API Integration Guide

## Base URLs

The backend Swagger document is available locally at `http://localhost:5258/swagger/v1/swagger.json`.
The site shell, homepage configuration, product listings, and public forum reads use the formal
`/api/public` prefix. Product detail lookup and media/service/resource/about/contact content remain
under `/api/v1/public` during the compatibility window. Authenticated forum actions use `/api/forum`.

- Browser content: use `NUXT_PUBLIC_API_BASE=/api`; IIS/Nitro rewrites it to `/api/v1/public`.
- Browser site shell: use `NUXT_PUBLIC_SITE_API_BASE=/api/public`; the more-specific proxy rule
  preserves the formal backend prefix.
- Browser forum: public reads use `/api/public/forum/*`; registration, login, session, post, and
  comment actions use same-origin `/api/forum/*`. No separate frontend forum base is configured.
- The co-hosted admin client and authenticated operational tooling may use same-origin `/api/admin/*`,
  `/api/auth/*`, and `/api/users/*`. Development, preview, and IIS preserve these backend paths before
  applying the generic versioned-public rewrite. This pass-through does not relax backend authentication
  or authorization, and public page components must not depend on it.
- Server-rendered content: set `NUXT_API_SERVER_BASE` to an absolute `/api/v1/public` base in the external Nuxt runtime environment.
- Server-rendered site shell: set `NUXT_SITE_API_SERVER_BASE` to an absolute `/api/public` base in the external Nuxt runtime environment.
- IIS: set `NUXT_IIS_PROXY_TARGET` to the backend origin only, such as `https://backend.example.com`. The post-build script writes it into `.output/public/web.config`.
- Nuxt SSR: set `NUXT_IIS_NODE_TARGET` to a loopback HTTP origin such as `http://127.0.0.1:3001`. It must match the service's loopback `NITRO_HOST` and `NITRO_PORT`.
- AMap: set the public Web JS API key in `NUXT_PUBLIC_AMAP_KEY`. Configure `Amap__SecurityJsCode` only on the API server; the browser reaches it through same-origin `/_AMapService/*`.

## Published content endpoints

| Method | Backend path | Used by |
| --- | --- | --- |
| GET | `/api/public/navigation?position=main`, `/api/public/site` | Complete header navigation, CTA, logo, footer, and site metadata. |
| GET | `/api/public/banners?position=home`, `/api/public/home` | Homepage carousel and managed featured products. |
| GET | `/api/public/product-categories/tree`, `/api/public/products` | Product categories, homepage catalog, product list, and route discovery. |
| GET | `/api/public/forum/summary`, `/api/public/forum/categories`, `/api/public/forum/posts`, `/api/public/forum/posts/{id}`, `/api/public/forum/users/{id}` | SSR community overview, categories, pinned/latest/search results, details, and public profiles. |
| GET | `/api/public/inquiries/captcha` | Four-character letter/digit PNG and short-lived challenge for the contact form. |
| POST | `/api/public/inquiries` | Strict fixed-contact inquiry submission. |
| GET | `/api/v1/public/products/{slug}` | Product detail lookup. |
| GET | `/api/v1/public/media`, `/api/v1/public/media/{slug}` | Media list, homepage application content, detail pages, and search discovery. |
| GET | `/api/v1/public/service/faqs`, `/api/v1/public/service/policies` | FAQ, support panels, and service promises. |
| GET | `/api/v1/public/resources` | Legacy compatibility inventory; not mixed into the new public modules. |
| GET | `/api/v1/public/videos`, `/api/v1/public/videos/{slug}` | Published video list/detail and current video routes. |
| GET | `/api/v1/public/software-downloads`, `/api/v1/public/software-downloads/{slug}` | Published current-version download list/detail routes. |
| GET | `/api/v1/public/about` | Brand content for the About page and homepage preview. |
| GET | `/api/v1/public/certificates` | Published certificate names and managed images. |
| GET | `/api/v1/public/contact` | Address, phone, email, `mapProvider`, longitude, and latitude. The compatibility `mapUrl` is ignored. |

Authenticated forum requests use the browser-owned ForumBearer session. Profile updates use `PUT /api/forum/me`; managed avatar upload, random Beanheads, and initial fallback use `/api/forum/me/avatar` routes. Public forum payloads are decoded from `unknown` through `shared/forum/contracts.ts`; public profiles never reuse the current-user contract containing username or email.

The frontend receives the backend's `modelNo`, `content`, `coverImageUrl`, `specificationsJson`, `mediaType`, `resourceType`, and related fields through `useContentApi()`. Product and media records need a stable `slug` plus a name/title to produce detail routes and search entries. Relative media paths such as `/assets/product-images/...` are served through IIS's `/assets/*` proxy.

## Homepage composition

- 应用场景 renders the first four published media records as linked title/summary rows.
- 技术社区 homepage content is server-rendered in overview, pinned, category, and latest-discussion order; browser refresh/retry states remain available after hydration.
- 关于我们 renders plain-text brand content above the footer. Its preview image prefers the brand `imageUrl`, then the first safe image in the brand rich content; the full `/zh/about` page retains sanitized rich HTML.

## Search and AI discovery

Nuxt renders `/sitemap.xml`, `/robots.txt`, and `/llms.txt` from the current published product/media/video/download state. Product, media, video, and download detail routes emit canonical metadata and their corresponding JSON-LD. `llms.txt` contains stable links and short summaries only; publish complete verified facts in canonical records.

## Content conventions

- Product category tree node fields: `id`, `name`, optional `children`.
- `mediaType` values `company_news` and `media_report` display as 公司动态 and 媒体报道; values containing `video` display as 产品视频.
- About brand entries use `brand_intro` with compatibility support for `brand`/`introduction`. Certificates use the dedicated `/certificates` endpoint. `gallery`/`image` entries may remain in the About response but are not rendered by the current About page.
- Product/media rich content is rendered only through the maintained tag and attribute allow-list sanitizer. Summaries and service text use plain-text projections.
- Action links allow `https:`, `mailto:`, `tel:`, or normalized local `/assets/*` paths. Protocol-relative, malformed, `javascript:`, and unsupported relative links are suppressed.
- Incomplete FAQ/policy records are omitted. Resources without a valid action URL remain descriptive and do not render a clickable download/open action.

Public resource DTOs expose only backend-owned `playbackUrl`, `watchUrl`, and `downloadUrl`; they do not expose stored external destinations or storage keys. The frontend rejects non-canonical slugs, unknown types, malformed dates, unsafe cover URLs, and action routes that do not match the record ID.

Public site settings explicitly project `icpNumber`, `publicSecurityNumber`, `copyright`, and the independent `icpImageUrl`, `publicSecurityImageUrl`, and `copyrightImageUrl` fields. Image values pass through the managed asset URL projection. The footer derives only fixed MIIT/MPS lookup links from recognized filing text and never accepts a custom footer link. A bottom record with neither text nor image is omitted, so an incompletely configured site can display fewer than three bottom records.

## AMap contact contract

- `mapProvider` must equal `amap` case-insensitively.
- Longitude and latitude must both be present as JSON numbers. Longitude is first and must be in
  `-180..180`; latitude is second and must be in `-90..90`.
- Coordinates are GCJ-02 values copied from the
  [AMap coordinate picker](https://lbs.amap.com/tools/picker); this release performs no coordinate conversion.
- Missing, partial, non-finite, or out-of-range coordinates do not load third-party map code and do not
  create a navigation link. A runtime AMap failure retains the server-rendered address and navigation link.
- Contact content is read during SSR, so saving new coordinates is visible after a full refresh without a
  frontend build.

## Inquiry endpoint

Call `GET /api/public/inquiries/captcha` first. It returns `{ captchaId, imageDataUrl, expiresInSeconds }`; the PNG contains four letters/digits, is not cacheable, and normally expires after 300 seconds. The form must not enable submission until a valid challenge is loaded.

`POST /api/public/inquiries` accepts exactly `formCode=contact`, `name`, `email`, `phone`, `company`, `message`, `sourcePath`, `captchaId`, `captchaCode`, and the empty `website` Honeypot. Name and message are required; email and phone are individually optional but at least one is required. Non-empty email uses normal email-address validation, while phone remains international-format friendly with a 32-character ceiling and no SMS verification. New and duplicate-accepted submissions return `201` and `202`; the form shows the same generic success state and never exposes the returned reference code. Validation, payload-size, rate-limit, and disabled responses use `400`, `413`, `429`, and `503` respectively. After any request that reached the submission endpoint fails, retain all business fields and privacy consent, discard the old captcha, and load a new challenge.

## SSR requirements

The Nuxt service account must reach both server-only API bases. Navigation must be a non-empty, valid tree;
request failure, unsupported links, malformed nodes, or an empty root array fail the current SSR response.
Navigation is serialized into that response's Nuxt payload, so hydration does not fetch it again. A later
full refresh performs a new server read. Other successful empty collections retain their module empty states.
