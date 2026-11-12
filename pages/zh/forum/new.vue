<script setup lang="ts">
import { ImagePlus, Trash2, X } from 'lucide-vue-next'
import { ForumApiError, forumErrorMessage } from '~/composables/useForumApi'
import type { ForumCategory } from '~/shared/forum/contracts'
import {
  serializeForumPostDraft,
  validateForumImageFile,
  type ForumDraftImage,
} from '~/shared/forum/post-composer'

const route = useRoute()
const api = useForumApi()
const session = useForumSession()
const feedback = useForumFormFeedback()
const categories = ref<ForumCategory[]>([])
const categoryId = ref('')
const title = ref('')
const body = ref('')
const checkingSession = ref(true)
const categoriesLoading = ref(false)
const categoriesError = ref('')
const submitting = ref(false)
const submitted = ref(false)
const images = ref<ForumDraftImage[]>([])
const imageAltText = ref('')
const imageFileInput = ref<HTMLInputElement>()
const pendingImageFile = ref<File>()
const imageUploading = ref(false)
const imageProgress = ref(0)
const imageError = ref('')
let imageUploadController: AbortController | undefined

async function submit() {
  if (feedback.forumDisabled.value) return
  feedback.reset()
  const normalizedTitle = title.value.normalize('NFKC').trim()
  const normalizedBody = body.value.normalize('NFKC').trim()
  const errors: Record<string, string> = {}
  const selectedCategoryId = Number(categoryId.value)
  if (!Number.isSafeInteger(selectedCategoryId) || !categories.value.some(category => category.id === selectedCategoryId)) errors.categoryId = '请选择一个可用分类。'
  if (!normalizedTitle || normalizedTitle.length > 200) errors.title = '标题须为 1-200 个字符。'
  if (!normalizedBody || normalizedBody.length > 20000) errors.body = '正文须为 1-20000 个字符。'
  if (Object.keys(errors).length) {
    feedback.fieldErrors.value = errors
    return
  }
  submitting.value = true
  try {
    const content = serializeForumPostDraft(normalizedBody, images.value)
    await session.authorized(token => api.createPost(token, { categoryId: selectedCategoryId, title: normalizedTitle, body: content }))
    title.value = ''
    body.value = ''
    images.value = []
    imageAltText.value = ''
    pendingImageFile.value = undefined
    submitted.value = true
  } catch (error) {
    feedback.capture(error, '帖子提交失败，请稍后重试。')
  } finally {
    submitting.value = false
  }
}

function chooseImage() {
  imageFileInput.value?.click()
}

function selectImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const validation = validateForumImageFile(file)
  if (validation) {
    imageError.value = validation
    pendingImageFile.value = undefined
    return
  }
  pendingImageFile.value = file
  if (!imageAltText.value.trim()) imageAltText.value = file.name.replace(/\.[^.]+$/, '').trim()
  void uploadPendingImage()
}

async function uploadPendingImage() {
  if (!pendingImageFile.value || imageUploading.value) return
  imageUploading.value = true
  imageProgress.value = 0
  imageError.value = ''
  imageUploadController = new AbortController()
  try {
    const image = await session.authorized(token => api.uploadImage(
      token,
      pendingImageFile.value!,
      imageAltText.value.trim(),
      {
        signal: imageUploadController?.signal,
        onProgress: progress => { imageProgress.value = progress.percent },
      },
    ))
    images.value.push({ id: image.id, url: image.url, altText: image.altText })
    pendingImageFile.value = undefined
    imageAltText.value = ''
  } catch (error) {
    if (!(error instanceof ForumApiError && error.code === 'REQUEST_ABORTED')) {
      imageError.value = forumErrorMessage(error, '图片上传失败，请稍后重试。')
    }
  } finally {
    imageUploading.value = false
    imageProgress.value = 0
    imageUploadController = undefined
  }
}

function removeImage(id: number) {
  images.value = images.value.filter(image => image.id !== id)
}

function cancelImageUpload() {
  imageUploadController?.abort()
}

async function loadCategories() {
  categoriesLoading.value = true
  categoriesError.value = ''
  try {
    categories.value = await api.listCategories()
    const routeCategoryId = Number(route.query.category)
    const preselected = Number.isSafeInteger(routeCategoryId) && categories.value.some(category => category.id === routeCategoryId)
    if (!categoryId.value && preselected) categoryId.value = String(routeCategoryId)
  } catch (error) {
    categories.value = []
    categoriesError.value = forumErrorMessage(error, '分类加载失败，请稍后重试。')
  } finally {
    categoriesLoading.value = false
  }
}

onMounted(async () => {
  await session.restore()
  if (!session.isAuthenticated.value) {
    await navigateTo({ path: '/zh/forum/login', query: { returnTo: route.path } })
    return
  }
  await loadCategories()
  checkingSession.value = false
})

onScopeDispose(() => imageUploadController?.abort())

usePageSeo({ title: '发布论坛帖子', description: '向优联科技技术论坛提交新帖子。', path: '/zh/forum/new', noindex: true })
useHead({ bodyAttrs: { class: 'forum-route' } })
</script>

<template>
  <section class="section forum-auth-page">
    <div class="page-width">
      <div v-if="checkingSession" class="forum-detail-loading forum-form-panel forum-form-panel--wide" role="status">
        <Skeleton width="14rem" height="2rem" />
        <Skeleton width="20rem" height="0.9rem" />
        <div class="forum-detail-loading__body">
          <Skeleton width="100%" height="2.75rem" />
          <Skeleton width="100%" height="12rem" />
        </div>
        <span class="visually-hidden">正在检查登录状态</span>
      </div>
      <div v-else-if="submitted" class="forum-form-panel forum-submit-success" role="status">
        <h1>帖子已提交，等待审核</h1>
        <p>审核通过后，帖子会出现在公开论坛中。</p>
        <div class="forum-form-actions">
          <button class="button button--primary" type="button" @click="submitted = false">继续发帖</button>
          <NuxtLink class="button button--secondary" to="/zh/forum">返回论坛</NuxtLink>
        </div>
      </div>
      <div v-else class="forum-form-panel forum-form-panel--wide">
        <h1>发布帖子</h1>
        <p>帖子提交后需要审核，审核通过后才会公开。</p>
        <form @submit.prevent="submit">
          <div class="forum-field">
            <label for="post-category">分类</label>
            <select id="post-category" v-model="categoryId" :disabled="categoriesLoading || !categories.length" :aria-describedby="feedback.fieldErrors.value.categoryId ? 'post-category-error' : undefined">
              <option value="">{{ categoriesLoading ? '正在加载分类' : '请选择分类' }}</option>
              <option v-for="category in categories" :key="category.id" :value="String(category.id)">{{ category.name }}</option>
            </select>
            <p v-if="feedback.fieldErrors.value.categoryId" id="post-category-error" class="forum-field-error">{{ feedback.fieldErrors.value.categoryId }}</p>
            <div v-if="categoriesError" class="forum-inline-error" role="alert">
              <span>{{ categoriesError }}</span>
              <button type="button" @click="loadCategories">重试</button>
            </div>
          </div>
          <div class="forum-field">
            <label for="post-title">标题</label>
            <input id="post-title" v-model="title" type="text" maxlength="200">
            <p v-if="feedback.fieldErrors.value.title" class="forum-field-error">{{ feedback.fieldErrors.value.title }}</p>
          </div>
          <div class="forum-field">
            <label for="post-body">正文</label>
            <textarea id="post-body" v-model="body" rows="16" maxlength="20000" />
            <p class="forum-field-help">最多 20000 个字符。</p>
            <p v-if="feedback.fieldErrors.value.body" class="forum-field-error">{{ feedback.fieldErrors.value.body }}</p>
            <div class="forum-image-composer">
              <div class="forum-image-composer__toolbar">
                <label for="post-image-alt">图片替代文本</label>
                <div class="forum-image-composer__controls">
                  <input id="post-image-alt" v-model="imageAltText" type="text" maxlength="500" :disabled="imageUploading" placeholder="图片说明（可选）">
                  <input ref="imageFileInput" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden @change="selectImage">
                  <button class="button button--secondary" type="button" :disabled="imageUploading" @click="chooseImage">
                    <ImagePlus :size="16" aria-hidden="true" />选择图片
                  </button>
                  <button v-if="imageUploading" class="forum-icon-button" type="button" aria-label="取消图片上传" title="取消图片上传" @click="cancelImageUpload">
                    <X :size="17" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div v-if="imageUploading" class="forum-upload-progress" role="status" aria-live="polite">
                <progress :value="imageProgress" max="100" />
                <span>{{ imageProgress ? `图片上传 ${imageProgress}%` : '正在上传图片' }}</span>
              </div>
              <div v-if="imageError" class="forum-inline-error" role="alert">
                <span>{{ imageError }}</span>
                <button v-if="pendingImageFile" type="button" :disabled="imageUploading" @click="uploadPendingImage">重试</button>
              </div>
              <ul v-if="images.length" class="forum-draft-images" aria-label="已插入的帖子图片">
                <li v-for="image in images" :key="image.id">
                  <img :src="image.url" :alt="image.altText || '帖子图片'">
                  <div>
                    <label :for="`post-image-${image.id}-alt`">图片替代文本</label>
                    <input :id="`post-image-${image.id}-alt`" v-model="image.altText" type="text" maxlength="500">
                  </div>
                  <button class="forum-icon-button forum-icon-button--danger" type="button" :aria-label="`移除图片 ${image.altText || image.id}`" title="移除图片" @click="removeImage(image.id)">
                    <Trash2 :size="17" aria-hidden="true" />
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <p v-if="feedback.message.value" class="form-feedback form-feedback--error" role="alert">{{ feedback.message.value }}</p>
          <div class="forum-form-actions">
            <button class="button button--primary" type="submit" :disabled="submitting || categoriesLoading || !categories.length || feedback.isRateLimited.value || feedback.forumDisabled.value">
              {{ submitting ? '提交中' : feedback.retrySeconds.value ? `${feedback.retrySeconds.value} 秒后重试` : '提交审核' }}
            </button>
            <NuxtLink class="button button--secondary" to="/zh/forum">取消</NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.forum-image-composer { display: grid; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #d4d2ce; }
.forum-image-composer__toolbar { display: grid; gap: 7px; }
.forum-image-composer__toolbar > label, .forum-draft-images label { color: var(--ink); font-size: var(--text-sm); font-weight: 700; }
.forum-image-composer__controls { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 8px; }
.forum-image-composer__controls .button { min-height: 44px; white-space: nowrap; }
.forum-upload-progress { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; color: var(--muted); font-size: var(--text-sm); }
.forum-upload-progress progress { width: 100%; height: 8px; accent-color: var(--brand); }
.forum-icon-button { display: inline-grid; width: 40px; height: 40px; place-items: center; border: 1px solid #cfcfcf; border-radius: var(--radius); color: var(--ink); background: #fff; cursor: pointer; }
.forum-icon-button:hover, .forum-icon-button:focus-visible { border-color: var(--brand); outline: 3px solid rgb(139 58 47 / 0.18); outline-offset: 1px; color: var(--brand); }
.forum-icon-button--danger { color: #8b3a2f; }
.forum-draft-images { display: grid; gap: 0; margin: 4px 0 0; padding: 0; border-top: 1px solid #d4d2ce; list-style: none; }
.forum-draft-images li { display: grid; grid-template-columns: 96px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #d4d2ce; }
.forum-draft-images img { display: block; width: 96px; height: 72px; border: 1px solid #d4d2ce; border-radius: var(--radius); object-fit: cover; background: var(--soft); }
.forum-draft-images li > div { display: grid; min-width: 0; gap: 6px; }
@media (max-width: 620px) {
  .forum-image-composer__controls { grid-template-columns: minmax(0, 1fr) auto; }
  .forum-image-composer__controls .button { grid-column: 1 / -1; width: 100%; }
  .forum-draft-images li { grid-template-columns: 76px minmax(0, 1fr) auto; gap: 9px; }
  .forum-draft-images img { width: 76px; height: 64px; }
}
</style>
