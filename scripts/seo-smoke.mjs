// Re-runnable SEO checks for the 2026-10-26 audit fixes.
// Usage: node scripts/seo-smoke.mjs <baseUrl> [--content]
// Code checks always run. --content also fails on CMS content that editors still have to fix.
const [baseArg, ...flags] = process.argv.slice(2)
if (!baseArg) {
  console.error('Usage: node scripts/seo-smoke.mjs <baseUrl> [--content]')
  process.exit(2)
}
const base = new URL(baseArg)
const enforceContent = flags.includes('--content')
const userAgent = 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)'
const requestGapMs = 500
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function fetchPage(path) {
  // Crawlers ask for HTML; without this Accept header Nuxt answers errors as JSON.
  const headers = { 'user-agent': userAgent, accept: 'text/html,application/xhtml+xml' }
  const response = await fetch(new URL(path, base), { headers, redirect: 'manual' })
  return { status: response.status, html: await response.text() }
}

const robots = html => html.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/)?.[1] || ''
const inlineForumError = /分类加载失败|社区内容加载失败|帖子加载失败/

const checks = [
  {
    name: 'out-of-range forum category page is a real 404',
    path: '/zh/forum/category/4?page=2147483648',
    verify: ({ status, html }) => [
      status === 404 || `status ${status}, expected 404`,
      robots(html).includes('noindex') || `robots "${robots(html)}"`,
      !inlineForumError.test(html) || 'renders an inline forum error',
    ],
  },
  ...['/zh/forum', '/zh/forum/category/1'].map(path => ({
    name: `${path} stays indexable`,
    path,
    verify: ({ status, html }) => [
      status === 200 || `status ${status}, expected 200`,
      robots(html).startsWith('index, follow') || `robots "${robots(html)}"`,
      !inlineForumError.test(html) || 'renders an inline forum error',
    ],
  })),
  {
    name: 'knowledge article image alts are not bare file names',
    path: '/zh/knowledge/ulinktek-sewer-camera-systems-by-pipe-size-1-12-plumber-s-guide',
    verify: ({ status, html }) => {
      const article = html.match(/<main[\s\S]*?<\/main>/)?.[0] || ''
      const bad = [...article.matchAll(/<img[^>]*?alt="([^"]*)"/g)].map(match => match[1]).filter(alt => !/\p{Script=Han}/u.test(alt))
      return [status === 200 || `status ${status}`, !bad.length || `alts without Chinese: ${bad.join(', ')}`]
    },
  },
  {
    name: '3188SC featured specification labels are Chinese',
    path: '/zh/products/pipe-inspection-camera-model-no-3188sc',
    content: true,
    verify: ({ status, html }) => {
      const english = [...html.matchAll(/<dt>([^<]*)<\/dt>/g)].map(match => match[1]).filter(label => !/\p{Script=Han}/u.test(label))
      return [status === 200 || `status ${status}`, !english.length || `English labels: ${english.join(', ')}`]
    },
  },
]

let failed = 0
for (const check of checks) {
  let problems
  try {
    problems = check.verify(await fetchPage(check.path)).filter(result => result !== true)
  } catch (error) {
    problems = [error instanceof Error ? error.message : String(error)]
  }
  const blocking = problems.length && (!check.content || enforceContent)
  if (blocking) failed += 1
  const label = !problems.length ? 'PASS' : blocking ? 'FAIL' : 'PENDING (content)'
  console.log(`${label}  ${check.name}${problems.length ? `\n      ${problems.join('\n      ')}` : ''}`)
  await sleep(requestGapMs)
}

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll blocking checks passed.')
process.exit(failed ? 1 : 0)
