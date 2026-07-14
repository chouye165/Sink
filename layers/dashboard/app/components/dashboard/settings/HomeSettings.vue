<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface SiteConfig {
  homepageEnabled: boolean
  captchaEnabled: boolean
}

const config = ref<SiteConfig | null>(null)
const saving = ref(false)
const saved = ref(false)

async function load() {
  config.value = await useAPI<SiteConfig>('/api/config')
}

onMounted(load)

async function update(patch: Partial<SiteConfig>) {
  saving.value = true
  saved.value = false
  try {
    config.value = await useAPI<SiteConfig>('/api/config', {
      method: 'PUT',
      body: patch,
    })
    saved.value = true
    window.setTimeout(() => (saved.value = false), 2000)
  }
  catch (error) {
    console.error('Failed to update homepage settings:', error)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <h2 class="text-lg font-semibold">
        {{ $t('settings.home.title') }}
      </h2>
      <p class="text-sm text-muted-foreground">
        {{ $t('settings.home.description') }}
      </p>
    </div>

    <Card>
      <CardContent class="space-y-4 pt-6">
        <div class="flex items-center justify-between gap-4">
          <div class="space-y-0.5">
            <Label>{{ $t('settings.home.homepage_enabled') }}</Label>
            <p class="text-xs text-muted-foreground">
              {{ $t('settings.home.homepage_enabled_desc') }}
            </p>
          </div>
          <Switch
            :model-value="config?.homepageEnabled ?? true"
            :disabled="!config || saving"
            @update:model-value="update({ homepageEnabled: $event as boolean })"
          />
        </div>

        <Separator />

        <div class="flex items-center justify-between gap-4">
          <div class="space-y-0.5">
            <Label>{{ $t('settings.home.captcha_enabled') }}</Label>
            <p class="text-xs text-muted-foreground">
              {{ $t('settings.home.captcha_enabled_desc') }}
            </p>
          </div>
          <Switch
            :model-value="config?.captchaEnabled ?? true"
            :disabled="!config || saving"
            @update:model-value="update({ captchaEnabled: $event as boolean })"
          />
        </div>
      </CardContent>
      <CardFooter v-if="saved">
        <p class="text-sm text-green-600">
          {{ $t('settings.home.saved') }}
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
