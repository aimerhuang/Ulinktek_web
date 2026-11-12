<script setup lang="ts">
import { KNOWLEDGE_BASE_PATH } from '~/shared/content/knowledge'

const route = useRoute()
await navigateTo({ path: KNOWLEDGE_BASE_PATH, query: route.query }, { redirectCode: 301, replace: true })
</script>
