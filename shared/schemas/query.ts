import { z } from 'zod'

// `useRuntimeConfig()` must not be called at module scope — it breaks SSR of
// any page that imports this schema (the composable needs a Nuxt context).
// Resolve it lazily with a safe fallback for module-load time.
function getListQueryLimit(): number {
  try {
    return +useRuntimeConfig().listQueryLimit
  }
  catch {
    return 500
  }
}

export const QuerySchema = z.object({
  id: z.string().optional(),
  startAt: z.coerce.number().int().safe().optional(),
  endAt: z.coerce.number().int().safe().optional(),
  url: z.string().optional(),
  slug: z.string().optional(),
  referer: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  os: z.string().optional(),
  browser: z.string().optional(),
  browserType: z.string().optional(),
  device: z.string().optional(),
  deviceType: z.string().optional(),
  limit: z.coerce.number().int().safe().default(() => getListQueryLimit()),
})

export type Query = z.infer<typeof QuerySchema>

// export const FilterSchema = QuerySchema.omit({ id: true, startAt: true, endAt: true, limit: true }).extend({
//   index1: z.string().optional(),
// })
