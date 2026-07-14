<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import 'playcaptcha/clawcaptcha.css'

// PlayCaptcha is a React component, so we mount it into a host element with a
// tiny React root. This file is a `.client.vue`, so it is never pulled into the
// server bundle (Nuxt keeps it client-only).
const emit = defineEmits<{ verify: [] }>()

const host = ref<HTMLElement | null>(null)
const loading = ref(true)
let root: import('react-dom/client').Root | null = null

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
        language: 'zh',
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
