import { getSiteConfig } from '#server/utils/site-config'

// Public, unauthenticated read of the (non-sensitive) homepage toggles.
export default eventHandler(async (event) => {
  return await getSiteConfig(event)
})
