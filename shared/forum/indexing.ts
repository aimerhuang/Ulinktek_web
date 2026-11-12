import type { ForumPost } from './contracts.ts'
import { forumPlainText } from './presentation.ts'

export type ForumIndexPolicy = { minBodyChars: number, minComments: number }

export const DEFAULT_FORUM_INDEX_POLICY: ForumIndexPolicy = { minBodyChars: 300, minComments: 3 }

function nonNegativeInteger(value: unknown, fallback: number) {
  const number = typeof value === 'string' && value.trim() ? Number(value) : value
  return typeof number === 'number' && Number.isSafeInteger(number) && number >= 0 ? number : fallback
}

// Reads the public runtime config; a missing or malformed value falls back to the default rather than indexing everything.
export function forumIndexPolicy(config: { forumIndexMinBodyChars?: unknown, forumIndexMinComments?: unknown }): ForumIndexPolicy {
  return {
    minBodyChars: nonNegativeInteger(config.forumIndexMinBodyChars, DEFAULT_FORUM_INDEX_POLICY.minBodyChars),
    minComments: nonNegativeInteger(config.forumIndexMinComments, DEFAULT_FORUM_INDEX_POLICY.minComments),
  }
}

// Counts non-whitespace code points: tag boundaries become spaces, and CJK text and emoji each count once.
export function forumVisibleTextLength(body: string) {
  return [...forumPlainText(body).replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/giu, '_').replace(/\s/gu, '')].length
}

// A short post earns indexing through its public replies; otherwise it stays crawlable but out of search results and sitemap.xml.
export function isForumPostIndexable(post: Pick<ForumPost, 'body' | 'commentCount'>, policy: ForumIndexPolicy) {
  return forumVisibleTextLength(post.body) >= policy.minBodyChars || post.commentCount >= policy.minComments
}
