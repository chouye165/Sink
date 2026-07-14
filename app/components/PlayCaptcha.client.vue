<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import 'playcaptcha/clawcaptcha.css'

// PlayCaptcha is a React component, so we mount it into a host element with a
// tiny React root. This file is a `.client.vue`, so it is never pulled into the
// server bundle (Nuxt keeps it client-only).
const emit = defineEmits<{ verify: [] }>()

const { locale } = useI18n()

const host = ref<HTMLElement | null>(null)
const loading = ref(true)
let root: import('react-dom/client').Root | null = null

// Map a Nuxt i18n locale code to a PlayCaptcha language code.
// PlayCaptcha expects short codes: `zh` (Simplified), `zh-TW` (Traditional),
// `en`, and the primary subtag for the rest (e.g. `fr-FR` -> `fr`).
function captchaLanguage(): string {
  const code = (locale.value || 'en-US').toLowerCase()
  if (code.startsWith('zh'))
    return code === 'zh-cn' ? 'zh' : 'zh-TW'
  if (code.startsWith('en'))
    return 'en'
  return code.split('-')[0]
}

onMounted(async () => {
  if (!host.value)
    return
  try {
    const React = (await import('react')).default
    const { createRoot } = await import('react-dom/client')
    const { ClawCaptcha } = await import('playcaptcha')

    const instance = createRoot(host.value)
    instance.render(
      React.createElement(ClawCaptcha as React.ComponentType<Record<string, unknown>>, {
        language: captchaLanguage(),
        onVerify: () => emit('verify'),
      }),
    )
    root = instance
  }
  finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  root?.unmount()
  root = null
})
</script>

<template>
  <div class="flex w-full flex-col items-center">
    <div ref="host" />
    <p
      v-if="loading"
      class="py-4 text-center text-xs text-muted-foreground"
    >
      {{ $t('home.captcha.loading') }}
    </p>
  </div>
</template>
