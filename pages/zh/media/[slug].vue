<script setup lang="ts">
import { knowledgeArticlePath } from '~/shared/content/knowledge'

const route = useRoute()
await navigateTo({ path: knowledgeArticlePath(String(route.params.slug)), query: route.query }, { redirectCode: 301, replace: true })
</script>
