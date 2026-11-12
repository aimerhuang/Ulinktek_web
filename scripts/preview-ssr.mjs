import { spawn } from 'node:child_process'
import { createServer, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { resolve } from 'node:path'

const backend = new URL(process.env.NUXT_IIS_PROXY_TARGET || 'http://localhost:5258')
const previewPort = Number(process.env.PREVIEW_PORT || 3001)
const nuxtPort = Number(process.env.PREVIEW_NUXT_PORT || 3002)
const nuxtOrigin = new URL(`http://127.0.0.1:${nuxtPort}`)
const serverEntry = resolve('.output/server/index.mjs')
const directApiPrefixes = ['/api/admin', '/api/auth', '/api/users']

function isDirectApiPath(pathname) {
  return directApiPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function backendPath(pathname) {
  if (pathname === '/_AMapService' || pathname.startsWith('/_AMapService/')) return pathname
  if (pathname === '/api/public' || pathname.startsWith('/api/public/')) return pathname
  if (pathname === '/api/forum' || pathname.startsWith('/api/forum/')) return pathname
  if (isDirectApiPath(pathname)) return pathname
  if (pathname === '/api' || pathname.startsWith('/api/')) return `/api/v1/public${pathname.slice(4)}`
  if (pathname === '/assets' || pathname.startsWith('/assets/')) return pathname
}

function proxy(request, response, incomingUrl, origin, pathname) {
  const target = new URL(origin)
  target.pathname = pathname
  target.search = incomingUrl.search
  const send = target.protocol === 'https:' ? httpsRequest : httpRequest
  const upstream = send(target, {
    method: request.method,
    headers: { ...request.headers, host: target.host },
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers)
    upstreamResponse.pipe(response)
  })
  upstream.on('error', (error) => {
    response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end(`Preview proxy failed: ${error.message}`)
  })
  request.pipe(upstream)
}

const nuxt = spawn(process.execPath, [serverEntry], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    NITRO_HOST: '127.0.0.1',
    NITRO_PORT: String(nuxtPort),
    HOST: '127.0.0.1',
    PORT: String(nuxtPort),
  },
  stdio: 'inherit',
})

const gateway = createServer((request, response) => {
  const incomingUrl = new URL(request.url || '/', 'http://localhost')
  const mappedBackendPath = backendPath(incomingUrl.pathname)
  if (mappedBackendPath) return proxy(request, response, incomingUrl, backend, mappedBackendPath)
  return proxy(request, response, incomingUrl, nuxtOrigin, incomingUrl.pathname)
})

let shuttingDown = false
function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  gateway.close(() => process.exit(exitCode))
  nuxt.kill()
}

nuxt.once('exit', code => shutdown(code || 0))
process.once('SIGINT', () => shutdown())
process.once('SIGTERM', () => shutdown())

gateway.listen(previewPort, '127.0.0.1', () => {
  console.log(`SSR preview: http://127.0.0.1:${previewPort}`)
  console.log(`Nuxt Node origin: ${nuxtOrigin.origin}`)
  console.log(`Backend proxy: ${backend.origin}`)
})
