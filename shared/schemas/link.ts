import { customAlphabet } from 'nanoid'
import { z } from 'zod'
import { LINK_PASSWORD_MASK_PREFIX } from '../utils/link-password'

// IMPORTANT: `useAppConfig()` / `useRuntimeConfig()` must NOT be called at
// module scope. Doing so breaks SSR / prerender of any page that imports this
// module, because those composables require an active Nuxt context and the
// module is evaluated outside of one. Resolve the values lazily instead — they
// are only ever needed at parse time (a request) or during component setup
// (client / SSR), where a Nuxt context always exists.
function getSlugRegex(): RegExp {
  try {
    // Only works inside a Nuxt context (a request handler or component setup).
    return useAppConfig().slugRegex
  }
  catch {
    // Module imported outside a Nuxt context (e.g. during SSR of a page that
    // imports this schema). Fall back to the same pattern defined in
    // app/app.config.ts so the schema can still be constructed.
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i
  }
}
function getSlugDefaultLength(): number {
  try {
    return +(useRuntimeConfig().public.slugDefaultLength || 6)
  }
  catch {
    return 6
  }
}

export const nanoid = (length: number = getSlugDefaultLength()): string =>
  customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', length)()

const GeoSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, url]) => [key.trim().toUpperCase(), url]),
  )
}, z.record(z.string().trim().regex(/^[A-Z]{2}$/), z.string().trim().url().max(2048)))

export const LinkPasswordSchema = z.string().trim().min(1).max(128).refine(
  password => !password.startsWith(LINK_PASSWORD_MASK_PREFIX),
  'masked password cannot be submitted',
)

export const EditLinkPasswordSchema = z.string().trim().max(128).refine(
  password => !password.startsWith(LINK_PASSWORD_MASK_PREFIX),
  'masked password cannot be submitted',
).optional()

export const LinkSchema = z.object({
  id: z.string().trim().max(26).default(nanoid(10)),
  url: z.string().trim().url().max(2048),
  slug: z.string().trim().max(2048).regex(getSlugRegex()).default(() => nanoid()),
  comment: z.string().trim().max(2048).optional(),
  createdAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  updatedAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  expiration: z.number().int().safe().refine(expiration => expiration > Math.floor(Date.now() / 1000), {
    message: 'expiration must be greater than current time',
    path: ['expiration'],
  }).optional(),
  title: z.string().trim().max(256).optional(),
  description: z.string().trim().max(2048).optional(),
  image: z.string().trim().max(128).optional(),
  apple: z.string().trim().url().max(2048).optional(),
  google: z.string().trim().url().max(2048).optional(),
  cloaking: z.boolean().optional(),
  redirectWithQuery: z.boolean().optional(),
  password: LinkPasswordSchema.optional(),
  unsafe: z.boolean().optional(),
  geo: GeoSchema.optional(),
  source: z.enum(['admin', 'guest']).default('admin'),
})

export type Link = z.infer<typeof LinkSchema>

export interface ExportData {
  version: string
  exportedAt: string
  count: number
  links: Link[]
  cursor?: string
  list_complete: boolean
}
