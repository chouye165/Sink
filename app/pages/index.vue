<script setup lang="ts">
import type { Link } from '@/types'
import { LinkSchema, nanoid } from '#shared/schemas/link'
import { useClipboard } from '@vueuse/core'
import { Check, Copy, Shuffle } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'blank',
})

const { t } = useI18n()

const url = ref('')
const slug = ref('')
const isLoading = ref(false)
const errorMsg = ref('')
const result = ref<{ shortLink: string, slug: string } | null>(null)

const urlValidator = LinkSchema.shape.url
const generateSlug = nanoid()

function randomizeSlug() {
  slug.value = generateSlug()
}

async function generate() {
  errorMsg.value = ''
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
}
</script>

<template>
  <div class="flex min-h-[100svh] items-center justify-center px-4 py-10">
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

          <Alert v-if="errorMsg" variant="destructive">
            <AlertDescription>{{ errorMsg }}</AlertDescription>
          </Alert>

          <Button
            type="submit"
            class="w-full"
            :disabled="isLoading"
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
