export default defineNuxtPlugin(() => {
  void useForumSession().restore()
})
