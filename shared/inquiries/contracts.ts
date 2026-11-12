export const INQUIRY_MAX_REQUEST_BODY_BYTES = 16 * 1024

export type InquiryDraft = {
  name: string
  email: string
  phone: string
  company: string
  message: string
  captchaId: string
  captchaCode: string
  website: string
}

export type InquiryPayload = {
  formCode: 'contact'
  name: string
  email: string
  phone: string
  company: string
  message: string
  sourcePath: string
  captchaId: string
  captchaCode: string
  website: string
}

export type InquiryCaptchaChallenge = {
  captchaId: string
  imageDataUrl: string
  expiresInSeconds: number
}

export type InquiryValidationError = {
  field: keyof InquiryDraft | 'contact' | 'payload'
  message: string
}

const inquiryResponseFields: Record<string, InquiryValidationError['field']> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  company: 'company',
  message: 'message',
  captchaid: 'captchaCode',
  captchacode: 'captchaCode',
  contact: 'contact',
}

export function inquiryMessageForProduct(productModel?: string) {
  const model = productModel?.normalize('NFKC').trim().slice(0, 200)
  return model ? `我想咨询 ${model} 的选型与报价。` : ''
}

export function buildInquiryPayload(draft: InquiryDraft, sourcePath: string): InquiryPayload {
  return {
    formCode: 'contact',
    name: draft.name.normalize('NFKC').trim(),
    email: draft.email.normalize('NFKC').trim().toLowerCase(),
    phone: draft.phone.normalize('NFKC').trim(),
    company: draft.company.normalize('NFKC').trim(),
    message: draft.message.normalize('NFKC').replace(/\r\n?/g, '\n').trim(),
    sourcePath,
    captchaId: draft.captchaId.trim(),
    captchaCode: draft.captchaCode.normalize('NFKC').trim().toUpperCase(),
    website: draft.website,
  }
}

export function inquiryPayloadByteLength(payload: InquiryPayload) {
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength
}

function hasControlCharacter(value: string, allowLayout = false) {
  return Array.from(value).some((character) => {
    const code = character.codePointAt(0)!
    const control = code <= 0x1f || (code >= 0x7f && code <= 0x9f)
    return control && (!allowLayout || character !== '\n' && character !== '\t')
  })
}

function hasAtLeastLetters(value: string, minimum: number) {
  return (value.match(/\p{L}/gu)?.length || 0) >= minimum
}

function isValidEmail(email: string) {
  return email.length === 0 || /^[^\s@]+@[^\s@]+$/u.test(email)
}

function isValidPhone(phone: string) {
  if (!phone) return true
  if (!/^\+?[0-9 ()-]+$/u.test(phone)) return false
  const digitCount = (phone.match(/[0-9]/g) || []).length
  return digitCount >= 6 && digitCount <= 20
}

export function validateInquiryPayload(payload: InquiryPayload): InquiryValidationError | undefined {
  if (inquiryPayloadByteLength(payload) > INQUIRY_MAX_REQUEST_BODY_BYTES) {
    return { field: 'payload', message: '提交内容过长，请精简后重试。' }
  }
  if (payload.name.length < 2 || payload.name.length > 100 || hasControlCharacter(payload.name) || !hasAtLeastLetters(payload.name, 1)) {
    return { field: 'name', message: '姓名需填写 2-100 个字符，且至少包含一个文字字符。' }
  }
  if (payload.email.length > 200 || hasControlCharacter(payload.email) || !isValidEmail(payload.email)) {
    return { field: 'email', message: '邮箱格式不合法或超过 200 个字符。' }
  }
  if (payload.phone.length > 32 || !isValidPhone(payload.phone)) {
    return { field: 'phone', message: '电话仅支持开头 +、数字、空格、连字符和圆括号，且须包含 6-20 位数字。' }
  }
  if (!payload.email && !payload.phone) {
    return { field: 'contact', message: '邮箱和电话至少填写一项。' }
  }
  if (payload.company.length > 200 || hasControlCharacter(payload.company) || (payload.company.length > 0 && !hasAtLeastLetters(payload.company, 1))) {
    return { field: 'company', message: '公司名称非空时必须包含至少一个文字字符，且不能超过 200 个字符。' }
  }
  if (payload.message.length < 10 || payload.message.length > 4000 || hasControlCharacter(payload.message, true) || !hasAtLeastLetters(payload.message, 4)) {
    return { field: 'message', message: '咨询内容需填写 10-4000 个字符，且至少包含 4 个文字字符。' }
  }
  if (!payload.sourcePath.startsWith('/') || payload.sourcePath.startsWith('//') || payload.sourcePath.length > 500) {
    return { field: 'payload', message: '当前页面来源无效，请刷新页面后重试。' }
  }
  if (!/^[A-Za-z0-9_-]{40,128}$/u.test(payload.captchaId) || !/^[A-Z0-9]{4}$/u.test(payload.captchaCode)) {
    return { field: 'captchaCode', message: '请输入图片中的 4 位验证码。' }
  }
  if (payload.website) {
    return { field: 'payload', message: '提交信息无效，请刷新页面后重试。' }
  }
}

export function parseInquiryCaptchaChallenge(value: unknown): InquiryCaptchaChallenge | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as Partial<InquiryCaptchaChallenge>
  if (typeof candidate.captchaId !== 'string' || !/^[A-Za-z0-9_-]{40,128}$/u.test(candidate.captchaId)) return undefined
  if (typeof candidate.imageDataUrl !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/u.test(candidate.imageDataUrl)) return undefined
  if (!Number.isInteger(candidate.expiresInSeconds) || candidate.expiresInSeconds! < 60 || candidate.expiresInSeconds! > 600) return undefined
  return candidate as InquiryCaptchaChallenge
}

export function inquiryValidationErrorFromResponse(error: unknown): InquiryValidationError | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const candidate = error as { data?: unknown }
  const envelope = typeof candidate.data === 'object' && candidate.data !== null
    ? candidate.data as { error?: unknown }
    : error as { error?: unknown }
  if (typeof envelope.error !== 'object' || envelope.error === null) return undefined
  const apiError = envelope.error as { code?: unknown, details?: unknown }
  if (apiError.code !== 'VALIDATION_ERROR' || !Array.isArray(apiError.details)) return undefined

  for (const item of apiError.details) {
    if (typeof item !== 'object' || item === null) continue
    const detail = item as { field?: unknown, message?: unknown }
    if (typeof detail.field !== 'string' || typeof detail.message !== 'string' || !detail.message.trim()) continue
    const key = detail.field.split('.').at(-1)?.toLowerCase()
    const field = key ? inquiryResponseFields[key] : undefined
    if (field) return { field, message: detail.message }
  }
}

export function isInquiryAcceptedStatus(status: number) {
  return status === 201 || status === 202
}

export function inquiryRequestErrorMessage(status?: number) {
  switch (status) {
    case 400:
      return '请检查姓名、联系方式和咨询内容后重试。'
    case 413:
      return '提交内容过长，请精简后重试。'
    case 429:
      return '提交过于频繁，请稍后再试或通过公开联系方式联系。'
    case 503:
      return '在线询盘暂不可用，请稍后再试或通过公开联系方式联系。'
    default:
      return '提交未成功，请稍后重试或通过公司公开联系方式联系。'
  }
}
