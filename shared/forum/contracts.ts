export type ForumPage<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export type ForumCategorySummary = {
  id: number
  name: string
  icon?: string
  isEnabled: boolean
}

export type ForumCategory = ForumCategorySummary & {
  sortOrder: number
  topicCount: number
  commentCount: number
}

export const FORUM_PROFESSIONS = [
  '现场工程师',
  '报告判读人员',
  '设备维修人员',
  '项目经理',
  '运维人员',
  '建筑排水检测人员',
  '工业管道检测人员',
  '非开挖修复工程师',
  '设备应用工程师',
] as const

export type ForumProfession = typeof FORUM_PROFESSIONS[number]

export type ForumBeanheadConfig = {
  mask: false
  skin: 'light' | 'yellow' | 'brown' | 'dark'
  body: 'chest' | 'breasts'
  eye: 'content-eyes' | 'happy-eyes' | 'normal-eyes' | 'simple-eyes' | 'squint-eyes'
  withLashes: false
  eyebrows: 'none' | 'normal' | 'serious' | 'left-lowered' | 'concerned'
  mouth: 'grin' | 'lips' | 'serious' | 'open'
  lipColor: 'red' | 'purple' | 'pink' | 'turquoise' | 'green'
  facialHair: 'none' | 'stubble' | 'medium-beard'
  hair: 'none' | 'afro' | 'balding' | 'bob' | 'bun' | 'buzz' | 'long' | 'pixie' | 'short'
  hairColor: 'blonde' | 'orange' | 'black' | 'white' | 'brown' | 'blue' | 'pink'
  clothing: 'dress' | 'dress-shirt' | 'shirt' | 'v-neck'
  clothingColor: 'white' | 'blue' | 'black' | 'green' | 'red'
  clothingGraphic: 'none'
  hat: 'none' | 'beanie' | 'turban'
  hatColor: 'white' | 'blue' | 'black' | 'green' | 'red'
  accessory: 'none' | 'round-glasses' | 'tiny-glasses'
  faceMask: false
  faceMaskColor: 'white' | 'blue' | 'black' | 'green' | 'red'
}

export type ForumAvatar = {
  type: 'initial' | 'beanhead' | 'managed'
  url?: string
  beanhead?: ForumBeanheadConfig
  fallbackText: string
}

export type ForumCommunitySummary = {
  memberCount: number
  publishedTopicCount: number
}

export type PublicForumUserProfile = {
  id: number
  displayName: string
  avatar: ForumAvatar
  bio?: string
  profession?: ForumProfession
  joinedAt: string
  publishedTopicCount: number
}

export type ForumPost = {
  id: number
  category: ForumCategorySummary
  title: string
  body: string
  authorId: number
  displayName: string
  publishedAt: string
  viewCount: number
  commentCount: number
  postType: 'discussion' | 'announcement'
  isGloballyPinned: boolean
  authorAvatar: ForumAvatar
  authorProfession?: ForumProfession
}

export type ForumComment = {
  id: number
  postId: number
  body: string
  authorId: number
  displayName: string
  publishedAt: string
  authorAvatar: ForumAvatar
  authorProfession?: ForumProfession
}

export type ForumPostDetail = {
  post: ForumPost
  comments: ForumPage<ForumComment>
}

export type ForumUser = {
  id: number
  username: string
  displayName: string
  email?: string
  emailVerified: boolean
  isEnabled: boolean
}

export type ForumToken = {
  accessToken: string
  tokenType: string
  expiresAt: string
}

export type ForumSubmission = {
  id: number
  status: string
  updatedAt: string
}

export type ForumImage = {
  id: number
  url: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  sizeBytes: number
  width: number
  height: number
  altText: string
  watermarkApplied: true
  reused: boolean
}

export type ForumErrorDetail = { field: string, message: string }
export type ForumErrorPayload = {
  code?: string
  message?: string
  details: ForumErrorDetail[]
  traceId?: string
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Forum API returned an invalid ${label}.`)
  }
  return value as Record<string, unknown>
}

function string(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Forum API returned an invalid ${label}.`)
  return value
}

function optionalString(value: unknown, label: string) {
  if (value === null || value === undefined || value === '') return undefined
  return string(value, label)
}

function integer(value: unknown, label: string, minimum = 0) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) {
    throw new Error(`Forum API returned an invalid ${label}.`)
  }
  return value
}

function boolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') throw new Error(`Forum API returned an invalid ${label}.`)
  return value
}

function enumString<T extends string>(value: unknown, options: readonly T[], label: string): T {
  const result = string(value, label)
  if (!options.includes(result as T)) throw new Error(`Forum API returned an invalid ${label}.`)
  return result as T
}

function optionalEnumString<T extends string>(value: unknown, options: readonly T[], label: string): T | undefined {
  if (value === null || value === undefined || value === '') return undefined
  return enumString(value, options, label)
}

function literalFalse(value: unknown, label: string): false {
  if (value !== false) throw new Error(`Forum API returned an invalid ${label}.`)
  return false
}

function plainString(value: unknown, label: string) {
  if (typeof value !== 'string') throw new Error(`Forum API returned an invalid ${label}.`)
  return value
}

function date(value: unknown, label: string) {
  const result = string(value, label)
  if (!Number.isFinite(Date.parse(result))) throw new Error(`Forum API returned an invalid ${label}.`)
  return result
}

function page<T>(value: unknown, itemParser: (item: unknown) => T, label: string): ForumPage<T> {
  const response = record(value, label)
  if (!Array.isArray(response.items)) throw new Error(`Forum API returned an invalid ${label} items collection.`)
  return {
    items: response.items.map(itemParser),
    page: integer(response.page, `${label} page`, 1),
    pageSize: integer(response.pageSize, `${label} pageSize`, 1),
    total: integer(response.total, `${label} total`),
  }
}

export function parseForumPost(value: unknown): ForumPost {
  const post = record(value, 'post')
  return {
    id: integer(post.id, 'post id', 1),
    category: parseForumCategorySummary(post.category),
    title: string(post.title, 'post title'),
    body: string(post.body, 'post body'),
    authorId: integer(post.authorId, 'post author id', 1),
    displayName: string(post.displayName, 'post display name'),
    publishedAt: date(post.publishedAt, 'post publishedAt'),
    viewCount: integer(post.viewCount, 'post view count'),
    commentCount: integer(post.commentCount, 'post comment count'),
    postType: enumString(post.postType, ['discussion', 'announcement'] as const, 'post type'),
    isGloballyPinned: boolean(post.isGloballyPinned, 'post global pin state'),
    authorAvatar: parseForumAvatar(post.authorAvatar),
    authorProfession: optionalEnumString(post.authorProfession, FORUM_PROFESSIONS, 'post author profession'),
  }
}

export function parseForumAvatar(value: unknown): ForumAvatar {
  const avatar = record(value, 'avatar')
  const type = enumString(avatar.type, ['initial', 'beanhead', 'managed'] as const, 'avatar type')
  const fallbackText = string(avatar.fallbackText, 'avatar fallback text')
  if (type === 'managed') {
    const url = string(avatar.url, 'avatar url')
    if (!isManagedForumImageUrl(url)) throw new Error('Forum API returned an invalid avatar url.')
    if (avatar.beanhead !== null && avatar.beanhead !== undefined) throw new Error('Forum API returned conflicting avatar data.')
    return { type, url, fallbackText }
  }
  if (type === 'beanhead') {
    if (avatar.url !== null && avatar.url !== undefined) throw new Error('Forum API returned conflicting avatar data.')
    return { type, beanhead: parseForumBeanhead(avatar.beanhead), fallbackText }
  }
  if ((avatar.url !== null && avatar.url !== undefined) || (avatar.beanhead !== null && avatar.beanhead !== undefined)) {
    throw new Error('Forum API returned conflicting avatar data.')
  }
  return { type, fallbackText }
}

export function parseForumBeanhead(value: unknown): ForumBeanheadConfig {
  const item = record(value, 'beanhead config')
  return {
    mask: literalFalse(item.mask, 'beanhead mask'),
    skin: enumString(item.skin, ['light', 'yellow', 'brown', 'dark'] as const, 'beanhead skin'),
    body: enumString(item.body, ['chest', 'breasts'] as const, 'beanhead body'),
    eye: enumString(item.eye, ['content-eyes', 'happy-eyes', 'normal-eyes', 'simple-eyes', 'squint-eyes'] as const, 'beanhead eye'),
    withLashes: literalFalse(item.withLashes, 'beanhead lashes'),
    eyebrows: enumString(item.eyebrows, ['none', 'normal', 'serious', 'left-lowered', 'concerned'] as const, 'beanhead eyebrows'),
    mouth: enumString(item.mouth, ['grin', 'lips', 'serious', 'open'] as const, 'beanhead mouth'),
    lipColor: enumString(item.lipColor, ['red', 'purple', 'pink', 'turquoise', 'green'] as const, 'beanhead lip color'),
    facialHair: enumString(item.facialHair, ['none', 'stubble', 'medium-beard'] as const, 'beanhead facial hair'),
    hair: enumString(item.hair, ['none', 'afro', 'balding', 'bob', 'bun', 'buzz', 'long', 'pixie', 'short'] as const, 'beanhead hair'),
    hairColor: enumString(item.hairColor, ['blonde', 'orange', 'black', 'white', 'brown', 'blue', 'pink'] as const, 'beanhead hair color'),
    clothing: enumString(item.clothing, ['dress', 'dress-shirt', 'shirt', 'v-neck'] as const, 'beanhead clothing'),
    clothingColor: enumString(item.clothingColor, ['white', 'blue', 'black', 'green', 'red'] as const, 'beanhead clothing color'),
    clothingGraphic: enumString(item.clothingGraphic, ['none'] as const, 'beanhead clothing graphic'),
    hat: enumString(item.hat, ['none', 'beanie', 'turban'] as const, 'beanhead hat'),
    hatColor: enumString(item.hatColor, ['white', 'blue', 'black', 'green', 'red'] as const, 'beanhead hat color'),
    accessory: enumString(item.accessory, ['none', 'round-glasses', 'tiny-glasses'] as const, 'beanhead accessory'),
    faceMask: literalFalse(item.faceMask, 'beanhead face mask'),
    faceMaskColor: enumString(item.faceMaskColor, ['white', 'blue', 'black', 'green', 'red'] as const, 'beanhead face mask color'),
  }
}

export function parseForumCategorySummary(value: unknown): ForumCategorySummary {
  const category = record(value, 'category summary')
  return {
    id: integer(category.id, 'category id', 1),
    name: string(category.name, 'category name'),
    icon: optionalString(category.icon, 'category icon'),
    isEnabled: boolean(category.isEnabled, 'category enabled state'),
  }
}

export function parseForumCategories(value: unknown): ForumCategory[] {
  if (!Array.isArray(value)) throw new Error('Forum API returned an invalid categories collection.')
  return value.map((item) => {
    const category = record(item, 'category')
    return {
      ...parseForumCategorySummary(category),
      sortOrder: integer(category.sortOrder, 'category sort order', Number.MIN_SAFE_INTEGER),
      topicCount: integer(category.topicCount, 'category topic count'),
      commentCount: integer(category.commentCount, 'category comment count'),
    }
  })
}

export function parsePublicForumCategories(value: unknown): ForumCategory[] {
  return parseForumCategories(value).filter(category => category.isEnabled)
}

export function parseForumComment(value: unknown): ForumComment {
  const comment = record(value, 'comment')
  return {
    id: integer(comment.id, 'comment id', 1),
    postId: integer(comment.postId, 'comment post id', 1),
    body: string(comment.body, 'comment body'),
    authorId: integer(comment.authorId, 'comment author id', 1),
    displayName: string(comment.displayName, 'comment display name'),
    publishedAt: date(comment.publishedAt, 'comment publishedAt'),
    authorAvatar: parseForumAvatar(comment.authorAvatar),
    authorProfession: optionalEnumString(comment.authorProfession, FORUM_PROFESSIONS, 'comment author profession'),
  }
}

export function parseForumCommunitySummary(value: unknown): ForumCommunitySummary {
  const summary = record(value, 'community summary')
  return {
    memberCount: integer(summary.memberCount, 'community member count'),
    publishedTopicCount: integer(summary.publishedTopicCount, 'community published topic count'),
  }
}

export function parsePublicForumUserProfile(value: unknown): PublicForumUserProfile {
  const profile = record(value, 'public forum user profile')
  return {
    id: integer(profile.id, 'public profile id', 1),
    displayName: string(profile.displayName, 'public profile display name'),
    avatar: parseForumAvatar(profile.avatar),
    bio: optionalString(profile.bio, 'public profile bio'),
    profession: optionalEnumString(profile.profession, FORUM_PROFESSIONS, 'public profile profession'),
    joinedAt: date(profile.joinedAt, 'public profile joinedAt'),
    publishedTopicCount: integer(profile.publishedTopicCount, 'public profile topic count'),
  }
}

export function parseForumPosts(value: unknown) {
  return page(value, parseForumPost, 'posts page')
}

export function parseForumPostDetail(value: unknown): ForumPostDetail {
  const detail = record(value, 'post detail')
  return {
    post: parseForumPost(detail.post),
    comments: page(detail.comments, parseForumComment, 'comments page'),
  }
}

export function parseForumUser(value: unknown): ForumUser {
  const user = record(value, 'user')
  return {
    id: integer(user.id, 'user id', 1),
    username: string(user.username, 'username'),
    displayName: string(user.displayName, 'display name'),
    email: optionalString(user.email, 'email'),
    emailVerified: boolean(user.emailVerified, 'user email verification state'),
    isEnabled: boolean(user.isEnabled, 'user enabled state'),
  }
}

export function parseEmptyForumResponse(value: unknown): void {
  if (value !== undefined && value !== null) throw new Error('Forum API returned an invalid empty response.')
}

export function parseForumToken(value: unknown): ForumToken {
  const token = record(value, 'token')
  return {
    accessToken: string(token.accessToken, 'access token'),
    tokenType: string(token.tokenType, 'token type'),
    expiresAt: date(token.expiresAt, 'token expiresAt'),
  }
}

export function parseForumSubmission(value: unknown): ForumSubmission {
  const submission = record(value, 'submission')
  return {
    id: integer(submission.id, 'submission id', 1),
    status: string(submission.status, 'submission status'),
    updatedAt: date(submission.updatedAt, 'submission updatedAt'),
  }
}

export function parseForumImage(value: unknown): ForumImage {
  const image = record(value, 'image')
  const url = string(image.url, 'image url')
  if (!isManagedForumImageUrl(url)) throw new Error('Forum API returned an invalid image url.')
  const mimeType = string(image.mimeType, 'image mime type')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw new Error('Forum API returned an invalid image mime type.')
  }
  if (image.watermarkApplied !== true) throw new Error('Forum API returned an unwatermarked image.')
  return {
    id: integer(image.id, 'image id', 1),
    url,
    mimeType: mimeType as ForumImage['mimeType'],
    sizeBytes: integer(image.sizeBytes, 'image size', 1),
    width: integer(image.width, 'image width', 16),
    height: integer(image.height, 'image height', 16),
    altText: plainString(image.altText, 'image alt text'),
    watermarkApplied: true,
    reused: boolean(image.reused, 'image reused state'),
  }
}

export function isManagedForumImageUrl(value: string) {
  return /^\/assets\/managed\/[0-9a-f]{32}\.(?:jpg|png|webp)$/.test(value.trim())
}

export function parseForumError(value: unknown): ForumErrorPayload {
  try {
    const envelope = record(value, 'error envelope')
    const error = record(envelope.error, 'error')
    const details = Array.isArray(error.details)
      ? error.details.flatMap((item) => {
          try {
            const detail = record(item, 'error detail')
            return [{ field: string(detail.field, 'error field'), message: string(detail.message, 'error message') }]
          } catch {
            return []
          }
        })
      : []
    return {
      code: optionalString(error.code, 'error code'),
      message: optionalString(error.message, 'error message'),
      details,
      traceId: optionalString(error.traceId, 'error trace id'),
    }
  } catch {
    return { details: [] }
  }
}

export function safeForumReturnPath(value: unknown, fallback = '/zh/forum') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  let url: URL
  try {
    url = new URL(value, 'https://forum.local')
  } catch {
    return fallback
  }
  if (url.origin !== 'https://forum.local' || !/^\/zh\/forum(?:\/|$)/.test(url.pathname)) return fallback
  return `${url.pathname}${url.search}${url.hash}`
}

export function normalizeForumUsername(value: string) {
  return value.normalize('NFKC').trim().toLowerCase()
}

export function normalizeForumEmail(value: string) {
  return value.normalize('NFKC').trim().toLowerCase()
}

export function isValidForumEmail(value: string) {
  const email = normalizeForumEmail(value)
  return email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function forumSessionExpiryDelay(expiresAt: string, now = Date.now()) {
  const expiry = Date.parse(expiresAt)
  return Number.isFinite(expiry) ? expiry - now : -1
}
