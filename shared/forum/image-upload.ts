import { ForumApiError, fallbackForumCode, forumRetryAfterSeconds } from './api-error.ts'
import { parseForumError, parseForumImage, type ForumImage } from './contracts.ts'

export type ForumUploadProgress = { loaded: number, total: number, percent: number }
export type ForumUploadOptions = {
  signal?: AbortSignal
  onProgress?: (progress: ForumUploadProgress) => void
}

export function uploadForumImageRequest(
  token: string,
  file: File,
  altText: string,
  options: ForumUploadOptions = {},
) {
  return new Promise<ForumImage>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      options.signal?.removeEventListener('abort', abort)
      callback()
    }
    const abort = () => xhr.abort()
    const form = new FormData()
    form.append('file', file)
    if (altText.trim()) form.append('altText', altText.trim())

    xhr.open('POST', '/api/forum/images')
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : 0
      options.onProgress?.({
        loaded: event.loaded,
        total,
        percent: total > 0 ? Math.min(100, Math.round(event.loaded / total * 100)) : 0,
      })
    }
    xhr.onload = () => finish(() => {
      let payload: unknown
      try { payload = xhr.responseText ? JSON.parse(xhr.responseText) as unknown : undefined } catch { payload = undefined }
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(parseForumImage(payload)) } catch {
          reject(new ForumApiError(502, 'INVALID_RESPONSE', '论坛服务返回了无法识别的图片数据。'))
        }
        return
      }
      const error = parseForumError(payload)
      reject(new ForumApiError(
        xhr.status,
        error.code || fallbackForumCode(xhr.status),
        error.message || '图片上传未能完成。',
        error.details,
        forumRetryAfterSeconds(xhr.getResponseHeader('Retry-After')),
        error.traceId,
      ))
    })
    xhr.onerror = () => finish(() => reject(new ForumApiError(
      0, 'NETWORK_ERROR', '图片上传连接中断，请检查网络后重试。',
    )))
    xhr.onabort = () => finish(() => reject(new ForumApiError(0, 'REQUEST_ABORTED', '图片上传已取消。')))
    if (options.signal?.aborted) {
      finish(() => reject(new ForumApiError(0, 'REQUEST_ABORTED', '图片上传已取消。')))
      return
    }
    options.signal?.addEventListener('abort', abort, { once: true })
    xhr.send(form)
  })
}
