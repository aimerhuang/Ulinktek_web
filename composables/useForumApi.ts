import { createError, setResponseHeader, type H3Event } from 'h3'
import {
  parseEmptyForumResponse,
  parseForumAvatar,
  parseForumCommunitySummary,
  parseForumError,
  parseForumPostDetail,
  parseForumPosts,
  parsePublicForumCategories,
  parseForumSubmission,
  parseForumToken,
  parseForumUser,
  parsePublicForumUserProfile,
} from '~/shared/forum/contracts'
import { ForumApiError, fallbackForumCode, forumRetryAfterSeconds } from '~/shared/forum/api-error'
import { forumSsrFailure } from '~/shared/forum/ssr-failure'
import { uploadForumImageRequest, type ForumUploadOptions } from '~/shared/forum/image-upload'

export { ForumApiError } from '~/shared/forum/api-error'

async function responseJson(response: Response) {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

async function forumRequest<T>(
  path: string,
  parser: (value: unknown) => T,
  options: { method?: string, body?: unknown, token?: string } = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ForumApiError(0, 'NETWORK_ERROR', '无法连接论坛服务，请检查网络后重试。')
  }

  const payload = await responseJson(response)
  if (!response.ok) {
    const error = parseForumError(payload)
    throw new ForumApiError(
      response.status,
      error.code || fallbackForumCode(response.status),
      error.message || '论坛请求未能完成。',
      error.details,
      forumRetryAfterSeconds(response.headers.get('Retry-After')),
      error.traceId,
    )
  }

  try {
    return parser(payload)
  } catch {
    throw new ForumApiError(502, 'INVALID_RESPONSE', '论坛服务返回了无法识别的数据。')
  }
}

function fetchErrorResponse(error: unknown): { status: number, payload: unknown, retryAfter: string | null } {
  if (!error || typeof error !== 'object') return { status: 0, payload: undefined, retryAfter: null }
  const value = error as {
    status?: number
    statusCode?: number
    response?: { status?: number, _data?: unknown, headers?: Headers }
    data?: unknown
  }
  return {
    status: value.response?.status ?? value.statusCode ?? value.status ?? 0,
    payload: value.response?._data ?? value.data,
    retryAfter: value.response?.headers?.get?.('Retry-After') ?? null,
  }
}

async function forumMultipartRequest<T>(
  path: string,
  parser: (value: unknown) => T,
  token: string,
  file: File,
): Promise<T> {
  const form = new FormData()
  form.set('file', file, file.name)
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: form,
      credentials: 'same-origin',
    })
  } catch {
    throw new ForumApiError(0, 'NETWORK_ERROR', '无法连接论坛服务，请检查网络后重试。')
  }
  const payload = await responseJson(response)
  if (!response.ok) {
    const error = parseForumError(payload)
    throw new ForumApiError(
      response.status,
      error.code || fallbackForumCode(response.status),
      error.message || '头像上传未能完成。',
      error.details,
      forumRetryAfterSeconds(response.headers.get('Retry-After')),
      error.traceId,
    )
  }
  try {
    return parser(payload)
  } catch {
    throw new ForumApiError(502, 'INVALID_RESPONSE', '论坛服务返回了无法识别的数据。')
  }
}

export function forumErrorMessage(error: unknown, fallback = '请求未能完成，请稍后重试。') {
  if (!(error instanceof ForumApiError)) return fallback
  if (error.code === 'CONTENT_BLOCKED') return '内容不符合发布规则，请修改后重试。'
  if (error.code === 'RATE_LIMITED') return '请求过于频繁，请稍后再试。'
  if (error.code === 'FORUM_DISABLED') return '论坛暂未开放，请稍后再来。'
  if (error.code === 'WATERMARK_PAUSED') return '图片水印当前已暂停，请稍后再试。'
  if (error.code === 'WATERMARK_NOT_CONFIGURED') return '图片水印尚未配置，请联系管理员。'
  if (error.code === 'UNAUTHORIZED') return '登录状态已失效，请重新登录。'
  if (error.code === 'FORBIDDEN') return '当前账号不能执行此操作。'
  if (error.code === 'NOT_FOUND') return '请求的论坛内容不存在或尚未公开。'
  if (error.code === 'CONFLICT') return '提交内容与现有记录冲突，请检查后重试。'
  if (error.code === 'VALIDATION_ERROR') return '请检查填写内容后重试。'
  if (error.code === 'NETWORK_ERROR') return '无法连接论坛服务，请检查网络后重试。'
  return fallback
}

// SSR-only. Capture `event` synchronously in setup: the Nuxt context is gone after the page's awaits.
export function throwForumSsrFailure(error: ForumApiError, event: H3Event | undefined): never {
  const failure = forumSsrFailure(error)
  if (failure.statusCode === 503 && event) setResponseHeader(event, 'retry-after', failure.retryAfterSeconds)
  throw createError({ statusCode: failure.statusCode, statusMessage: forumSsrFailureMessages[failure.statusCode] })
}

const forumSsrFailureMessages = {
  404: '未找到该社区内容。',
  500: '社区内容暂时无法显示。',
  503: '社区内容暂时不可用。',
} as const

export function useForumApi() {
  const siteApiUrl = useSiteApiUrl()
  const publicContentFetch = usePublicContentFetch()

  async function publicForumRequest<T>(endpoint: string, parser: (value: unknown) => T): Promise<T> {
    let payload: unknown
    try {
      payload = await publicContentFetch<unknown>(siteApiUrl(`forum/${endpoint}`))
    } catch (error) {
      const response = fetchErrorResponse(error)
      if (import.meta.server && response.status === 503) throw error
      const parsed = parseForumError(response.payload)
      throw new ForumApiError(
        response.status,
        parsed.code || fallbackForumCode(response.status),
        parsed.message || '论坛请求未能完成。',
        parsed.details,
        forumRetryAfterSeconds(response.retryAfter),
        parsed.traceId,
      )
    }
    try {
      return parser(payload)
    } catch {
      throw new ForumApiError(502, 'INVALID_RESPONSE', '论坛服务返回了无法识别的数据。')
    }
  }

  return {
    listCategories() {
      return publicForumRequest('categories', parsePublicForumCategories)
    },
    getSummary() {
      return publicForumRequest('summary', parseForumCommunitySummary)
    },
    listPosts(page: number, pageSize: number, keyword = '', categoryId?: number) {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), keyword })
      if (categoryId !== undefined) query.set('categoryId', String(categoryId))
      return publicForumRequest(`posts?${query}`, parseForumPosts)
    },
    getPost(id: number, page: number, pageSize: number) {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      return publicForumRequest(`posts/${id}?${query}`, parseForumPostDetail)
    },
    getPublicUser(id: number) {
      return publicForumRequest(`users/${id}`, parsePublicForumUserProfile)
    },
    listPublicUserPosts(id: number, page: number, pageSize: number) {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      return publicForumRequest(`users/${id}/posts?${query}`, parseForumPosts)
    },
    sendRegistrationEmailVerificationCode(email: string) {
      return forumRequest('/api/forum/auth/email-verification-codes', parseEmptyForumResponse, {
        method: 'POST',
        body: { email },
      })
    },
    register(input: { username: string, password: string, displayName: string, email: string, verificationCode: string }) {
      return forumRequest('/api/forum/auth/register', parseForumUser, { method: 'POST', body: input })
    },
    login(input: { username: string, password: string }) {
      return forumRequest('/api/forum/auth/login', parseForumToken, { method: 'POST', body: input })
    },
    getCurrentUser(token: string) {
      return forumRequest('/api/forum/me', parseForumUser, { token })
    },
    updateProfile(token: string, input: { displayName: string, bio: string | null, profession: string | null }) {
      return forumRequest('/api/forum/me', parseEmptyForumResponse, { method: 'PUT', body: input, token })
    },
    uploadAvatar(token: string, file: File) {
      return forumMultipartRequest('/api/forum/me/avatar', parseForumAvatar, token, file)
    },
    randomizeAvatar(token: string) {
      return forumRequest('/api/forum/me/avatar/beanhead/random', parseForumAvatar, { method: 'POST', token })
    },
    resetAvatar(token: string) {
      return forumRequest('/api/forum/me/avatar', parseForumAvatar, { method: 'DELETE', token })
    },
    createPost(token: string, input: { categoryId: number, title: string, body: string }) {
      return forumRequest('/api/forum/posts', parseForumSubmission, { method: 'POST', body: input, token })
    },
    uploadImage(token: string, file: File, altText = '', options: ForumUploadOptions = {}) {
      return uploadForumImageRequest(token, file, altText, options)
    },
    createComment(token: string, postId: number, body: string) {
      return forumRequest(`/api/forum/posts/${postId}/comments`, parseForumSubmission, { method: 'POST', body: { body }, token })
    },
  }
}
