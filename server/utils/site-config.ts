import type { H3Event } from 'h3'
import { z } from 'zod'

export const SiteConfigSchema = z.object({
  homepageEnabled: z.boolean().default(true),
  captchaEnabled: z.boolean().default(true),
})

export type SiteConfig = z.infer<typeof SiteConfigSchema>

const CONFIG_KEY = 'config:site'

export async function getSiteConfig(event: H3Event): Promise<SiteConfig> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  const raw = await KV.get(CONFIG_KEY, { type: 'json' })
  if (!raw)
    return SiteConfigSchema.parse({})

  return SiteConfigSchema.parse(raw)
}

export async function setSiteConfig(event: H3Event, config: SiteConfig): Promise<SiteConfig> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  const parsed = SiteConfigSchema.parse(config)
  await KV.put(CONFIG_KEY, JSON.stringify(parsed))
  return parsed
}
