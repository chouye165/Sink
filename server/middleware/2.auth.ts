import { timingSafeEqual } from 'node:crypto'

const BEARER_REGEX = /^Bearer\s+/

export default eventHandler(async (event) => {
  if (!event.path.startsWith('/api/'))
    return

  // Public, unauthenticated short-link generation endpoint for guests.
  if (event.path === '/api/link/guest' && event.method === 'POST') {
    event.context.authMethod = 'guest'
    return
  }

  // Public, unauthenticated read of the (non-sensitive) homepage toggles.
  if (event.path === '/api/config' && event.method === 'GET') {
    event.context.authMethod = 'public'
    return
  }

  const token = getHeader(event, 'Authorization')?.replace(BEARER_REGEX, '')
  if (await verifySiteToken(token, useRuntimeConfig(event).siteToken)) {
    event.context.authMethod = 'site-token'
    return
  }

  if (await verifyCloudflareAccess(event)) {
    if (isCloudflareAccessRequestAllowed(event)) {
      event.context.authMethod = 'cloudflare-access'
      return
    }

    throw createError({
      status: 403,
      statusText: 'Forbidden',
    })
  }

  if (token && token.length < 8) {
    throw createError({
      status: 401,
      statusText: 'Token is too short',
    })
  }

  throw createError({
    status: 401,
    statusText: 'Unauthorized',
  })
})

async function verifySiteToken(provided: string | undefined, expected: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided || '')),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  return timingSafeEqual(new Uint8Array(providedHash), new Uint8Array(expectedHash))
}
