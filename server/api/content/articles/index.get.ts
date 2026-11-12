import { getArticles } from '~/server/utils/cms'

export default defineEventHandler((event) => getArticles(useRuntimeConfig(event)))
