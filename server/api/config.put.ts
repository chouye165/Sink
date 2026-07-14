import { getSiteConfig, setSiteConfig, SiteConfigSchema } from '#server/utils/site-config'

// Admin-only update. Merges the provided partial with the existing config so
// a caller can flip a single toggle without resetting the other.
export default eventHandler(async (event) => {
  const existing = await getSiteConfig(event)
  const body = await readValidatedBody(event, SiteConfigSchema.partial().parse)
  const merged = { ...existing, ...body }
  return await setSiteConfig(event, merged)
})
