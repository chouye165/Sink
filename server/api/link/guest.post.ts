import { LinkSchema } from '#shared/schemas/link'

const GuestLinkSchema = LinkSchema.pick({
  url: true,
  slug: true,
  comment: true,
})

defineRouteMeta({
  openAPI: {
    description: 'Create a short link without authentication (public guest generation)',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['url'],
            properties: {
              url: { type: 'string', description: 'The target URL' },
              slug: { type: 'string', description: 'Custom slug (auto-generated if not provided)' },
              comment: { type: 'string', description: 'Optional comment' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const { url, slug, comment } = await readValidatedBody(event, GuestLinkSchema.parse)

  const link = {
    ...LinkSchema.parse({ url, slug, comment }),
    source: 'guest' as const,
  }

  await prepareIncomingLink(event, link)

  const existingLink = await getLink(event, link.slug)
  if (existingLink) {
    throw createError({
      status: 409,
      statusText: 'Link already exists',
    })
  }

  await putLink(event, link)
  setResponseStatus(event, 201)
  return buildLinkResponse(event, link)
})
