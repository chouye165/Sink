<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'playcaptcha/clawcaptcha.css'

// PlayCaptcha is a React component, so we mount it into a host element with a
// tiny React root. This file is a `.client.vue`, so it is never pulled into the
// server bundle (Nuxt keeps it client-only).
//
// The library exposes a `language` prop ('en' | 'zh') that localizes ALL of its
// internal UI text (heading fallback, instruction line, tray buttons, the
// "About" panel, and the failure message). We render a dedicated 中文 / EN
// toggle above the widget and pass the chosen language down. Changing it
// re-mounts the React root so the whole captcha interface switches language.
const props = defineProps<{ title?: string }>()
const emit = defineEmits<{ verify: [] }>()

const { locale } = useI18n()
// Start in sync with the app's current locale, but allow an independent switch.
const captchaLang = ref<'en' | 'zh'>(locale.value.startsWith('zh') ? 'zh' : 'en')

const host = ref<HTMLElement | null>(null)
const loading = ref(true)
let root: import('react-dom/client').Root | null = null

// Lazily load the React bits + the captcha component once.
let ReactMod: typeof import('react')['default'] | null = null
let createRootFn: typeof import('react-dom/client')['createRoot'] | null = null
let ClawCaptchaComp: import('react').ComponentType<Record<string, unknown>> | null = null

async function ensureLib() {
  if (ReactMod && createRootFn && ClawCaptchaComp)
    return
  const React = (await import('react')).default
  const { createRoot } = await import('react-dom/client')
  const { ClawCaptcha } = await import('playcaptcha')
  ReactMod = React
  createRootFn = createRoot
  ClawCaptchaComp = ClawCaptcha as typeof ClawCaptchaComp
}

async function mountCaptcha() {
  if (!host.value)
    return
  await ensureLib()
  root?.unmount()
  const instance = createRootFn!(host.value)
  instance.render(
    ReactMod!.createElement(ClawCaptchaComp!, {
      title: props.title,
      language: captchaLang.value,
      onVerify: () => emit('verify'),
    }),
  )
  root = instance
  loading.value = false
}

function setLang(lang: 'en' | 'zh') {
  if (captchaLang.value === lang)
    return
  captchaLang.value = lang
}

onMounted(mountCaptcha)
// Re-mount the widget whenever the captcha language is toggled.
watch(captchaLang, mountCaptcha)

onBeforeUnmount(() => {
  root?.unmount()
  root = null
})
</script>

<template>
  <div class="flex w-full flex-col items-center">
    <!-- Dedicated captcha language switch (中文 / EN) -->
    <div class="mb-3 inline-flex items-center rounded-full border bg-muted/50 p-0.5 text-xs font-medium">
      <button
        type="button"
        :aria-pressed="captchaLang === 'zh'"
        :class="captchaLang === 'zh'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'"
        class="rounded-full px-3 py-1 transition-colors"
        @click="setLang('zh')"
      >
        中文
      </button>
      <button
        type="button"
        :aria-pressed="captchaLang === 'en'"
        :class="captchaLang === 'en'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'"
        class="rounded-full px-3 py-1 transition-colors"
        @click="setLang('en')"
      >
        EN
      </button>
    </div>

    <div ref="host" />
    <p
      v-if="loading"
      class="py-4 text-center text-xs text-muted-foreground"
    >
      {{ $t('home.captcha.loading') }}
    </p>
  </div>
</template>
