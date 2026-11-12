import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { DEFAULT_FORUM_INDEX_POLICY, forumIndexPolicy, forumVisibleTextLength, isForumPostIndexable } from '../shared/forum/indexing.ts'

const policy = { minBodyChars: 10, minComments: 3 }
const post = (body, commentCount = 0) => ({ body, commentCount })

test('visible length ignores markup and whitespace and counts code points', () => {
  assert.equal(forumVisibleTextLength('<p>管道  检测</p>\n<p>😀</p>'), 5)
  assert.equal(forumVisibleTextLength('<p>A&amp;B</p>'), 3)
  assert.equal(forumVisibleTextLength('<script>alert(1)</script>'), 0)
})

test('a post is indexable by body length or by public replies', () => {
  assert.equal(isForumPostIndexable(post('一二三四五六七八九十'), policy), true)
  assert.equal(isForumPostIndexable(post('一二三四五六七八九'), policy), false)
  assert.equal(isForumPostIndexable(post('短帖', 2), policy), false)
  assert.equal(isForumPostIndexable(post('短帖', 3), policy), true)
})

test('runtime config values are parsed, and malformed ones fall back to the defaults', () => {
  assert.deepEqual(forumIndexPolicy({}), DEFAULT_FORUM_INDEX_POLICY)
  assert.deepEqual(forumIndexPolicy({ forumIndexMinBodyChars: '120', forumIndexMinComments: 0 }), { minBodyChars: 120, minComments: 0 })
  assert.deepEqual(forumIndexPolicy({ forumIndexMinBodyChars: -1, forumIndexMinComments: 'x' }), DEFAULT_FORUM_INDEX_POLICY)
  assert.deepEqual(forumIndexPolicy({ forumIndexMinBodyChars: '', forumIndexMinComments: 1.5 }), DEFAULT_FORUM_INDEX_POLICY)
})

// The sitemap and the post page must apply the same policy, or a sitemap URL would answer noindex.
test('sitemap discovery and the post page share the forum index policy', () => {
  const discovery = readFileSync(new URL('../server/utils/forum-discovery.ts', import.meta.url), 'utf8')
  assert.match(discovery, /posts\.filter\(post => isForumPostIndexable\(post, policy\)\)/)
  assert.match(discovery, /const policy = forumIndexPolicy\(config\.public\)/)
  const page = readFileSync(new URL('../pages/zh/forum/[id].vue', import.meta.url), 'utf8')
  assert.match(page, /!isForumPostIndexable\(detail\.value\.post, forumIndexPolicy\(config\.public\)\) \? 'noindex, follow'/)
})

test('the header renders the forum account bar only in the browser', () => {
  const header = readFileSync(new URL('../components/SiteHeader.vue', import.meta.url), 'utf8')
  assert.match(header, /<ClientOnly>\s*<ForumAccountBar \/>/)
})
