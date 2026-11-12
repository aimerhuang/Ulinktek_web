export const VIDEO_SOURCE_TYPES = ['managed', 'external_video', 'external_page'] as const
export const DOWNLOAD_PACKAGE_TYPES = ['apk', 'exe', 'rar', 'pdf'] as const

export type VideoSourceType = typeof VIDEO_SOURCE_TYPES[number]
export type DownloadPackageType = typeof DOWNLOAD_PACKAGE_TYPES[number]
export type DownloadSchemaType = 'SoftwareApplication' | 'DigitalDocument' | 'MediaObject'

export type PublicVideo = {
  id: number
  slug: string
  title: string
  summary: string
  coverImageUrl?: string
  sourceType: VideoSourceType
  publishedAt: string
  updatedAt: string
}

export type PublicVideoDetail = PublicVideo & {
  description: string
  playbackUrl?: string
  watchUrl?: string
}

export type PublicDownload = {
  id: number
  slug: string
  name: string
  version: string
  summary: string
  packageType: DownloadPackageType
  fileName: string
  fileSizeBytes?: number
  downloadUrl: string
  updatedAt: string
}

export type PublicDownloadDetail = PublicDownload & {
  description: string
}

const canonicalSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const videoPlaybackRoute = /^\/assets\/videos\/([1-9]\d*)$/
const videoWatchRoute = /^\/assets\/videos\/([1-9]\d*)\/watch$/
const downloadRoute = /^\/assets\/downloads\/([1-9]\d*)$/

function record(value: unknown, endpoint: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(endpoint)
  return value as Record<string, unknown>
}

function invalid(endpoint: string): never {
  throw new Error(`Published content API returned an invalid ${endpoint} response.`)
}

function positiveInteger(value: unknown, endpoint: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) invalid(endpoint)
  return value
}

function requiredString(value: unknown, endpoint: string) {
  if (typeof value !== 'string' || !value.trim()) invalid(endpoint)
  return value.trim()
}

function plainString(value: unknown, endpoint: string) {
  if (typeof value !== 'string') invalid(endpoint)
  return value.trim()
}

function slug(value: unknown, endpoint: string) {
  const normalized = requiredString(value, endpoint)
  if (!canonicalSlug.test(normalized) || normalized.length > 100) invalid(endpoint)
  return normalized
}

function isoDate(value: unknown, endpoint: string) {
  const normalized = requiredString(value, endpoint)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) || !Number.isFinite(Date.parse(normalized))) invalid(endpoint)
  return normalized
}

function optionalImage(value: unknown, endpoint: string) {
  const normalized = plainString(value, endpoint)
  if (!normalized) return undefined
  if (/^\/assets\//.test(normalized) && !normalized.includes('\\')) {
    const parsed = new URL(normalized, 'https://ulink.local')
    if (parsed.origin === 'https://ulink.local' && parsed.pathname.startsWith('/assets/')) return normalized
  }
  try {
    const parsed = new URL(normalized)
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return normalized
  } catch {}
  invalid(endpoint)
}

function enumValue<T extends string>(value: unknown, values: readonly T[], endpoint: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) invalid(endpoint)
  return value as T
}

function controlledRoute(value: unknown, pattern: RegExp, endpoint: string, id?: number) {
  const normalized = requiredString(value, endpoint)
  const match = normalized.match(pattern)
  if (!match || (id !== undefined && Number(match[1]) !== id)) invalid(endpoint)
  return normalized
}

function optionalControlledRoute(value: unknown, pattern: RegExp, endpoint: string, id: number) {
  const normalized = plainString(value, endpoint)
  return normalized ? controlledRoute(normalized, pattern, endpoint, id) : undefined
}

function videoBase(value: Record<string, unknown>, endpoint: string): PublicVideo {
  return {
    id: positiveInteger(value.id, endpoint),
    slug: slug(value.slug, endpoint),
    title: requiredString(value.title, endpoint),
    summary: plainString(value.summary, endpoint),
    coverImageUrl: optionalImage(value.coverImageUrl, endpoint),
    sourceType: enumValue(value.sourceType, VIDEO_SOURCE_TYPES, endpoint),
    publishedAt: isoDate(value.publishedAt, endpoint),
    updatedAt: isoDate(value.updatedAt, endpoint),
  }
}

function downloadBase(value: Record<string, unknown>, endpoint: string): PublicDownload {
  const id = positiveInteger(value.id, endpoint)
  const fileSizeBytes = value.fileSizeBytes
  if (fileSizeBytes !== null && (typeof fileSizeBytes !== 'number' || !Number.isSafeInteger(fileSizeBytes) || fileSizeBytes < 0)) invalid(endpoint)
  return {
    id,
    slug: slug(value.slug, endpoint),
    name: requiredString(value.name, endpoint),
    version: requiredString(value.version, endpoint),
    summary: plainString(value.summary, endpoint),
    packageType: enumValue(value.packageType, DOWNLOAD_PACKAGE_TYPES, endpoint),
    fileName: requiredString(value.fileName, endpoint),
    fileSizeBytes: typeof fileSizeBytes === 'number' ? fileSizeBytes : undefined,
    downloadUrl: controlledRoute(value.downloadUrl, downloadRoute, endpoint, id),
    updatedAt: isoDate(value.updatedAt, endpoint),
  }
}

export function decodePublicVideo(value: unknown): PublicVideo {
  return videoBase(record(value, 'videos'), 'videos')
}

export function decodePublicVideoDetail(value: unknown): PublicVideoDetail {
  const endpoint = 'video detail'
  const source = record(value, endpoint)
  const video = videoBase({ ...source, summary: source.description }, endpoint)
  const playbackUrl = optionalControlledRoute(source.playbackUrl, videoPlaybackRoute, endpoint, video.id)
  const watchUrl = optionalControlledRoute(source.watchUrl, videoWatchRoute, endpoint, video.id)
  if (video.sourceType === 'external_page' ? !watchUrl || playbackUrl : !playbackUrl || watchUrl) invalid(endpoint)
  return { ...video, description: plainString(source.description, endpoint), playbackUrl, watchUrl }
}

export function decodePublicDownload(value: unknown): PublicDownload {
  return downloadBase(record(value, 'software-downloads'), 'software-downloads')
}

export function decodePublicDownloadDetail(value: unknown): PublicDownloadDetail {
  const endpoint = 'software download detail'
  const source = record(value, endpoint)
  const download = downloadBase({ ...source, summary: source.description }, endpoint)
  return { ...download, description: plainString(source.description, endpoint) }
}

export function isCanonicalResourceSlug(value: string) {
  return canonicalSlug.test(value) && value.length <= 100
}

export function packageTypeLabel(type: DownloadPackageType) {
  return ({ apk: 'Android 应用', exe: 'Windows 程序', rar: '压缩包', pdf: 'PDF 文档' } as const)[type]
}

export function downloadSchemaType(type: DownloadPackageType): DownloadSchemaType {
  if (type === 'apk' || type === 'exe') return 'SoftwareApplication'
  return type === 'pdf' ? 'DigitalDocument' : 'MediaObject'
}

export function downloadOperatingSystem(type: DownloadPackageType) {
  return type === 'apk' ? 'Android' : type === 'exe' ? 'Windows' : undefined
}

export function packageTypeMime(type: DownloadPackageType) {
  return ({
    apk: 'application/vnd.android.package-archive',
    exe: 'application/vnd.microsoft.portable-executable',
    rar: 'application/vnd.rar',
    pdf: 'application/pdf',
  } as const)[type]
}

export function videoSourceLabel(type: VideoSourceType) {
  return type === 'managed' ? '站内视频' : type === 'external_video' ? '外部视频' : '外部观看页'
}

export function formatFileSize(bytes?: number) {
  if (bytes === undefined) return '大小未提供'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = units[0]
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024
    unit = units[index]
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${unit}`
}
