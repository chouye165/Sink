<script setup lang="ts">
import type { Link } from '@/types'
import { useClipboard } from '@vueuse/core'
import { Check, Copy, Shuffle } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { showError } from '#app'
import { LinkSchema, nanoid } from '#shared/schemas/link'

interface SiteConfig {
  homepageEnabled: boolean
  captchaEnabled: boolean
}

definePageMeta({
  layout: 'blank',
})

const { t, locale } = useI18n()

const url = ref('')
const slug = ref('')
const isLoading = ref(false)
const errorMsg = ref('')
const result = ref<{ shortLink: string, slug: string } | null>(null)
const captchaVerified = ref(false)

const urlValidator = LinkSchema.shape.url
const generateSlug = nanoid()

// Public, non-sensitive site toggles fetched from the server.
const config = ref<SiteConfig | null>(null)
const loadingConfig = ref(true)

const showCaptcha = computed(() => config.value?.captchaEnabled !== false)

onMounted(async () => {
  try {
    const data = await $fetch<SiteConfig>('/api/config')
    config.value = data
    // When the homepage generator is disabled, fall back to the existing 404 page.
    if (data.homepageEnabled === false) {
      showError({ statusCode: 404, statusMessage: 'Not Found' })
      return
    }
    // With the captcha disabled, treat the user as already verified.
    if (data.captchaEnabled === false)
      captchaVerified.value = true
  }
  catch {
    // If the config cannot be read, default to the enabled behaviour.
    config.value = { homepageEnabled: true, captchaEnabled: true }
  }
  finally {
    loadingConfig.value = false
  }
})

function randomizeSlug() {
  slug.value = generateSlug()
}

async function generate() {
  errorMsg.value = ''
  if (!captchaVerified.value) {
    errorMsg.value = t('home.captcha.required')
    return
  }
  const urlCheck = urlValidator.safeParse(url.value)
  if (!urlCheck.success) {
    errorMsg.value = t('home.invalid_url')
    return
  }

  isLoading.value = true
  try {
    const data = await $fetch<{ shortLink: string, link: Link }>('/api/link/guest', {
      method: 'POST',
      body: { url: url.value, slug: slug.value || undefined },
    })
    result.value = { shortLink: data.shortLink, slug: data.link.slug }
    slug.value = ''
  }
  catch (error: unknown) {
    const err = error as { status?: number, data?: { statusText?: string }, message?: string }
    if (err?.status === 409) {
      errorMsg.value = t('home.slug_taken')
    }
    else {
      errorMsg.value = err?.data?.statusText || err?.message || t('home.error_generic')
    }
  }
  finally {
    isLoading.value = false
  }
}

const shortLinkSource = computed(() => result.value?.shortLink ?? '')
const { copy, copied } = useClipboard({ source: shortLinkSource, copiedDuring: 1500 })

function copyLink() {
  if (!result.value)
    return
  copy(result.value.shortLink)
  toast.success(t('home.copy_success'))
}

function reset() {
  result.value = null
  url.value = ''
  slug.value = ''
  errorMsg.value = ''
  captchaVerified.value = false
}
</script>

<template>
  <!-- Language switcher, always available so the captcha text can switch -->
  <div class="fixed right-4 top-4 z-50">
    <SwitchLanguage />
  </div>

  <div
    v-if="loadingConfig"
    class="flex min-h-[100svh] items-center justify-center"
  >
    <span
      class="
        h-6 w-6 animate-spin rounded-full border-2 border-current
        border-t-transparent
      "
    />
  </div>

  <div
    v-else
    class="flex min-h-[100svh] items-center justify-center px-4 py-10"
  >
    <Card class="w-full max-w-xl">
      <CardHeader>
        <CardTitle class="text-2xl">
          {{ $t('home.title') }}
        </CardTitle>
        <CardDescription>
          {{ $t('home.subtitle') }}
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-4">
        <!-- Result state -->
        <div v-if="result" class="space-y-4">
          <div class="rounded-lg border bg-muted/40 p-4">
            <p
              class="mb-2 text-xs tracking-wide text-muted-foreground uppercase"
            >
              {{ $t('home.result_title') }}
            </p>
            <div class="flex items-center gap-2">
              <code class="flex-1 truncate text-sm font-medium">{{ result.shortLink }}</code>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                :aria-label="$t('home.copy')"
                @click="copyLink"
              >
                <Check v-if="copied" class="h-4 w-4" />
                <Copy v-else class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            class="w-full"
            @click="reset"
          >
            {{ $t('home.create_another') }}
          </Button>
        </div>

        <!-- Form state -->
        <form
          v-else
          class="space-y-4"
          @submit.prevent="generate"
        >
          <div class="space-y-2">
            <Label for="url">{{ $t('home.form.url') }}</Label>
            <Input
              id="url"
              v-model="url"
              type="url"
              inputmode="url"
              autocomplete="url"
              placeholder="https://example.com"
              :disabled="isLoading"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="slug">{{ $t('home.form.slug') }}</Label>
            <div class="flex gap-2">
              <Input
                id="slug"
                v-model="slug"
                type="text"
                autocomplete="off"
                :placeholder="$t('home.form.slug_placeholder')"
                :disabled="isLoading"
                class="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                :aria-label="$t('home.form.random')"
                :disabled="isLoading"
                @click="randomizeSlug"
              >
                <Shuffle class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- Human verification -->
          <div
            v-if="showCaptcha"
            class="space-y-2"
          >
            <p class="text-xs text-muted-foreground">
              {{ $t('home.captcha.prompt') }}
            </p>
            <PlayCaptcha
              v-if="!captchaVerified"
              :key="locale"
              @verify="captchaVerified = true"
            />
            <div
              v-else
              class="
                flex items-center gap-2 rounded-md border border-green-500/40
                bg-green-500/10 px-3 py-2 text-sm text-green-600
              "
            >
              <Check class="h-4 w-4" />
              {{ $t('home.captcha.verified') }}
            </div>
          </div>

          <Alert v-if="errorMsg" variant="destructive">
            <AlertDescription>{{ errorMsg }}</AlertDescription>
          </Alert>

          <Button
            type="submit"
            class="w-full"
            :disabled="isLoading || !captchaVerified"
          >
            <span
              v-if="isLoading" class="
                mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current
                border-t-transparent
              "
            />
            {{ isLoading ? $t('home.generating') : $t('home.generate') }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
