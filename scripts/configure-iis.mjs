import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const envPath = resolve(root, '.env')
const outputPath = resolve(root, '.output/public/web.config')
const productRedirectsPath = resolve(root, 'shared/content/product-slug-redirects.json')

function readEnvValue(name) {
  if (process.env[name]) return process.env[name]
  if (!existsSync(envPath)) return undefined

  const line = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`))

  if (!line) return undefined
  return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '')
}

function readOrigin(name, { loopback = false } = {}) {
  const value = readEnvValue(name)
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute http(s) origin.`)
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${name} must contain only an http(s) scheme, host, and optional port.`)
  }
  if (loopback && (url.protocol !== 'http:' || !['127.0.0.1', '::1', 'localhost'].includes(url.hostname))) {
    throw new Error(`${name} must be a loopback HTTP origin.`)
  }
  return url.origin
}

const backendOrigin = readOrigin('NUXT_IIS_PROXY_TARGET')
const nodeOrigin = readOrigin('NUXT_IIS_NODE_TARGET', { loopback: true })

function escapeXmlAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const productRedirects = JSON.parse(readFileSync(productRedirectsPath, 'utf8'))
if (!productRedirects || typeof productRedirects !== 'object' || Array.isArray(productRedirects)) {
  throw new Error('Product slug redirects must be a JSON object.')
}
const productRedirectEntries = Object.entries(productRedirects)
for (const [legacySlug, canonicalSlug] of productRedirectEntries) {
  if (!productSlugPattern.test(legacySlug) || typeof canonicalSlug !== 'string' || !productSlugPattern.test(canonicalSlug)) {
    throw new Error(`Invalid product slug redirect: ${legacySlug} -> ${String(canonicalSlug)}`)
  }
  if (legacySlug === canonicalSlug || Object.hasOwn(productRedirects, canonicalSlug)) {
    throw new Error(`Product slug redirects must point directly to a canonical slug: ${legacySlug}`)
  }
}
const productRedirectMap = productRedirectEntries
  .map(([legacySlug, canonicalSlug]) => `            <add key="${escapeXmlAttribute(legacySlug)}" value="${escapeXmlAttribute(canonicalSlug)}" />`)
  .join('\n')

const config = readFileSync(outputPath, 'utf8')
if (!config.includes('__IIS_BACKEND_ORIGIN__')) {
  throw new Error(`Expected IIS proxy placeholder was not found in ${outputPath}.`)
}
if (!config.includes('__PRODUCT_SLUG_REDIRECT_MAP__')) {
  throw new Error(`Expected product redirect placeholder was not found in ${outputPath}.`)
}
if (!config.includes('__IIS_NODE_ORIGIN__')) {
  throw new Error(`Expected IIS Node proxy placeholder was not found in ${outputPath}.`)
}

writeFileSync(outputPath, config
  .replaceAll('__IIS_BACKEND_ORIGIN__', escapeXmlAttribute(backendOrigin))
  .replaceAll('__IIS_NODE_ORIGIN__', escapeXmlAttribute(nodeOrigin))
  .replace('__PRODUCT_SLUG_REDIRECT_MAP__', productRedirectMap), 'utf8')
console.log(`Configured IIS backend proxy target: ${backendOrigin}`)
console.log(`Configured IIS Nuxt SSR proxy target: ${nodeOrigin}`)
