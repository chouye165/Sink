import type { H3Event } from 'h3'
import type { z } from 'zod'
import type { LinkSchema } from '#shared/schemas/link'
import { parseURL, stringifyParsedURL } from 'ufo'

type Link = z.infer<typeof LinkSchema>

export function withoutQuery(url: string): string {
  const parsed = parseURL(url)
  return stringifyParsedURL({ ...parsed, search: '' })
}

export function normalizeSlug(event: H3Event, slug: string): string {
  const { caseSensitive } = useRuntimeConfig(event)
  return caseSensitive ? slug : slug.toLowerCase()
}

export function buildShortLink(event: H3Event, slug: string): string {
  return `${getRequestProtocol(event)}://${getRequestHost(event)}/${slug}`
}

export async function putLink(event: H3Event, link: Link): Promise<void> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const expiration = getExpiration(event, link.expiration)

  await KV.put(`link:${link.slug}`, JSON.stringify(link), {
    expiration,
    metadata: {
      expiration,
      url: withoutQuery(link.url),
      comment: link.comment,
    },
  })
}

export async function getLink(event: H3Event, slug: string, cacheTtl?: number): Promise<Link | null> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  return await KV.get(`link:${slug}`, { type: 'json', cacheTtl }) as Link | null
}

export async function getLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const { metadata, value: link } = await KV.getWithMetadata(`link:${slug}`, { type: 'json' })
  return { link: link as Link | null, metadata: metadata as Record<string, unknown> | null }
}

export async function deleteLink(event: H3Event, slug: string): Promise<void> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  await KV.delete(`link:${slug}`)
}

export async function linkExists(event: H3Event, slug: string): Promise<boolean> {
  const link = await getLink(event, slug)
  return link !== null
}

interface ListLinksOptions {
  limit: number
  cursor?: string
  source?: 'admin' | 'guest'
}

interface ListLinksResult {
  links: Link[]
  list_complete: boolean
  cursor?: string
}

export async function listLinks(event: H3Event, options: ListLinksOptions): Promise<ListLinksResult> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const collected: Link[] = []
  let currentCursor = options.cursor || undefined
  let complete = false

  // Keep paginating until we have collected `limit` matching links or exhausted the store.
  while (collected.length < options.limit && !complete) {
    const list = await KV.list({
      prefix: 'link:',
      limit: options.limit,
      cursor: currentCursor,
    })

    const pageLinks = await Promise.all(
      (list.keys || []).map(async (key: { name: string }) => {
        const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' }) as { metadata: Record<string, unknown> | null, value: Link | null }
        if (link) {
          return {
            ...(metadata ?? {}),
            ...link,
          } as Link
        }
        return null
      }),
    )

    for (const link of pageLinks) {
      if (!link)
        continue

      // Legacy links created before the `source` field existed are treated as admin-owned.
      const linkSource = link.source ?? 'admin'
      link.source = linkSource

      if (options.source && linkSource !== options.source)
        continue

      collected.push(link)
      if (collected.length >= options.limit)
        break
    }

    if (list.list_complete) {
      complete = true
    }
    else {
      currentCursor = 'cursor' in list ? list.cursor : undefined
    }
  }

  return {
    links: collected,
    list_complete: complete,
    cursor: currentCursor,
  }
}
