// Dashboard Layer - Client-side only rendering
export default defineNuxtConfig({
  // IMPORTANT: `ssr: false` must NOT be set at the root level here, because
  // layer config is merged into the whole app and would make every page
  // (including the public home page) client-only. With the home page rendered
  // entirely on the client, a failed JS bundle load (e.g. a broken dev asset
  // URL) leaves a blank white page. Scope client-only rendering to the
  // dashboard routes only via routeRules instead.
  routeRules: {
    '/dashboard/**': {
      ssr: false,
      prerender: true,
    },
    '/dashboard': {
      redirect: '/dashboard/links',
    },
  },
})
