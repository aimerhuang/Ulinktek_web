<script setup lang="ts">
import { RefreshCw, Save, Upload, UserRound } from 'lucide-vue-next'
import { FORUM_PROFESSIONS, type PublicForumUserProfile } from '~/shared/forum/contracts'

const api = useForumApi()
const session = useForumSession()
const feedback = useForumFormFeedback()
const profile = ref<PublicForumUserProfile>()
const displayName = ref('')
const bio = ref('')
const profession = ref('')
const loading = ref(true)
const saving = ref(false)
const avatarBusy = ref(false)
const successMessage = ref('')
const avatarInput = ref<HTMLInputElement>()

async function loadProfile() {
  const user = session.user.value
  if (!user) return
  profile.value = await api.getPublicUser(user.id)
  displayName.value = profile.value.displayName
  bio.value = profile.value.bio || ''
  profession.value = profile.value.profession || ''
}

onMounted(async () => {
  try {
    await session.restore()
    if (!session.isAuthenticated.value) {
      await navigateTo({ path: '/zh/forum/login', query: { returnTo: '/zh/forum/profile' } })
      return
    }
    await loadProfile()
  } catch (error) {
    feedback.capture(error, '个人资料加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
})

async function saveProfile() {
  feedback.reset()
  successMessage.value = ''
  const normalizedName = displayName.value.normalize('NFKC').trim()
  const normalizedBio = bio.value.normalize('NFKC').trim()
  if (!normalizedName || [...normalizedName].length > 64) feedback.fieldErrors.value.displayName = '昵称须为 1-64 个字符。'
  if ([...normalizedBio].length > 200) feedback.fieldErrors.value.bio = '个人简介不能超过 200 个字符。'
  if (profession.value && !FORUM_PROFESSIONS.includes(profession.value as typeof FORUM_PROFESSIONS[number])) feedback.fieldErrors.value.profession = '请选择列表中的职业。'
  if (Object.keys(feedback.fieldErrors.value).length) return

  saving.value = true
  try {
    await session.authorized(token => api.updateProfile(token, {
      displayName: normalizedName,
      bio: normalizedBio || null,
      profession: profession.value || null,
    }))
    await session.refresh()
    await loadProfile()
    successMessage.value = '个人资料已更新。'
  } catch (error) {
    feedback.capture(error, '个人资料保存失败，请稍后重试。')
  } finally {
    saving.value = false
  }
}

async function updateAvatar(action: (token: string) => Promise<unknown>, success: string) {
  feedback.reset()
  successMessage.value = ''
  avatarBusy.value = true
  try {
    await session.authorized(action)
    await loadProfile()
    successMessage.value = success
  } catch (error) {
    feedback.capture(error, '头像更新失败，请稍后重试。')
  } finally {
    avatarBusy.value = false
  }
}

async function uploadAvatar(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    feedback.message.value = '头像仅支持 JPEG、PNG 或 WebP 图片。'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    feedback.message.value = '头像文件不能超过 2 MiB。'
    return
  }
  await updateAvatar(token => api.uploadAvatar(token, file), '头像已上传并裁切为方图。')
}

usePageSeo({ title: '个人资料', description: '管理管道技术社区的公开资料和头像。', path: '/zh/forum/profile', noindex: true })
useHead({ bodyAttrs: { class: 'forum-route' } })
</script>

<template>
  <section class="section forum-section">
    <div class="page-width forum-profile-settings">
      <NuxtLink class="forum-back-link" to="/zh/forum">返回技术社区</NuxtLink>
      <div v-if="loading" class="forum-detail-loading" role="status"><Skeleton width="18rem" height="2rem" /><Skeleton width="100%" height="12rem" /><span class="visually-hidden">正在加载个人资料</span></div>
      <div v-else-if="!profile" class="forum-state" role="alert"><h1>无法打开个人资料</h1><p>{{ feedback.message.value || '请重新登录后再试。' }}</p></div>
      <template v-else>
        <header class="forum-settings-heading"><h1>个人资料</h1><p>昵称、头像、职业和简介会显示在公开主页与帖子作者信息中。</p></header>
        <div class="forum-settings-layout">
          <section class="forum-avatar-settings" aria-labelledby="forum-avatar-title">
            <h2 id="forum-avatar-title">头像</h2>
            <ForumAvatar :avatar="profile.avatar" :name="profile.displayName" size="lg" />
            <input ref="avatarInput" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" @change="uploadAvatar">
            <div class="forum-avatar-actions">
              <button class="button button--secondary" type="button" :disabled="avatarBusy" @click="avatarInput?.click()"><Upload :size="17" aria-hidden="true" />上传图片</button>
              <button class="button button--secondary" type="button" :disabled="avatarBusy" @click="updateAvatar(token => api.randomizeAvatar(token), '已生成新的 Beanheads 头像。')"><RefreshCw :size="17" aria-hidden="true" />随机头像</button>
              <button class="button button--secondary" type="button" :disabled="avatarBusy" @click="updateAvatar(token => api.resetAvatar(token), '已恢复昵称首字头像。')"><UserRound :size="17" aria-hidden="true" />首字头像</button>
            </div>
            <p class="forum-field-help">支持 JPEG、PNG、WebP，最大 2 MiB。上传后会移除元数据并裁切为方图。</p>
          </section>

          <form class="forum-profile-form" @submit.prevent="saveProfile">
            <div class="forum-field">
              <label for="profile-display-name">昵称</label>
              <input id="profile-display-name" v-model="displayName" type="text" maxlength="64" autocomplete="nickname">
              <p v-if="feedback.fieldErrors.value.displayName" class="forum-field-error">{{ feedback.fieldErrors.value.displayName }}</p>
            </div>
            <div class="forum-field">
              <label for="profile-profession">职业</label>
              <select id="profile-profession" v-model="profession"><option value="">暂不填写</option><option v-for="item in FORUM_PROFESSIONS" :key="item" :value="item">{{ item }}</option></select>
              <p v-if="feedback.fieldErrors.value.profession" class="forum-field-error">{{ feedback.fieldErrors.value.profession }}</p>
            </div>
            <div class="forum-field">
              <label for="profile-bio">个人简介</label>
              <textarea id="profile-bio" v-model="bio" rows="5" maxlength="200" />
              <div class="forum-field-counter"><span v-if="feedback.fieldErrors.value.bio" class="forum-field-error">{{ feedback.fieldErrors.value.bio }}</span><span>{{ [...bio].length }}/200</span></div>
            </div>
            <p v-if="feedback.message.value" class="form-feedback form-feedback--error" role="alert">{{ feedback.message.value }}</p>
            <p v-if="successMessage" class="form-feedback form-feedback--success" role="status">{{ successMessage }}</p>
            <button class="button button--primary" type="submit" :disabled="saving || avatarBusy"><Save :size="17" aria-hidden="true" />{{ saving ? '保存中' : '保存资料' }}</button>
          </form>
        </div>
      </template>
    </div>
  </section>
</template>
