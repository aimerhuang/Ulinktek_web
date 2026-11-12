import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { forumSsrFailure } from '../shared/forum/ssr-failure.ts'

const failure = (status, code, retryAfterSeconds) => forumSsrFailure({ status, code, retryAfterSeconds })

test('client-side request errors become a 404 page', () => {
  assert.deepEqual(failure(400, 'VALIDATION_ERROR'), { statusCode: 404 })
  assert.deepEqual(failure(404, 'NOT_FOUND'), { statusCode: 404 })
  assert.deepEqual(failure(422, 'VALIDATION_ERROR'), { statusCode: 404 })
})

test('a malformed successful payload is an application error', () => {
  assert.deepEqual(failure(502, 'INVALID_RESPONSE'), { statusCode: 500 })
})

test('other failures become a 503 with a safe Retry-After', () => {
  assert.deepEqual(failure(401, 'UNAUTHORIZED'), { statusCode: 503, retryAfterSeconds: 60 })
  assert.deepEqual(failure(403, 'FORBIDDEN', 120), { statusCode: 503, retryAfterSeconds: 120 })
  assert.deepEqual(failure(0, 'NETWORK_ERROR', 0), { statusCode: 503, retryAfterSeconds: 60 })
})

// The mapping only helps if every public forum page applies it before rendering an inline error during SSR.
test('public forum pages map SSR failures instead of rendering a 200 error state', () => {
  for (const page of ['pages/zh/forum/index.vue', 'pages/zh/forum/category/[id].vue', 'pages/zh/forum/[id].vue']) {
    const source = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8')
    assert.match(source, /const requestEvent = import\.meta\.server \? useRequestEvent\(\) : undefined/, page)
    assert.match(source, /if \(import\.meta\.server\) throwForumSsrFailure\(error, requestEvent\)/, page)
  }
})
