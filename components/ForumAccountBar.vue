<script setup lang="ts">
const session = useForumSession()
const route = useRoute()
const forumDisabled = useState('forum-disabled', () => false)

function logout() {
  session.logout()
  if (route.path.startsWith('/zh/forum')) void navigateTo('/zh/forum')
}
</script>

<template>
  <div class="forum-account-bar" aria-label="论坛账户">
    <template v-if="session.isAuthenticated.value">
      <NuxtLink class="forum-account-bar__user" to="/zh/forum/profile" :title="session.user.value?.displayName">{{ session.user.value?.displayName }}</NuxtLink>
      <NuxtLink v-if="!forumDisabled" to="/zh/forum/new">发布帖子</NuxtLink>
      <button type="button" @click="logout">退出登录</button>
    </template>
    <template v-else-if="!forumDisabled">
      <NuxtLink to="/zh/forum/login">登录</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink to="/zh/forum/register">注册</NuxtLink>
    </template>
    <span v-else>论坛暂未开放</span>
  </div>
</template>
