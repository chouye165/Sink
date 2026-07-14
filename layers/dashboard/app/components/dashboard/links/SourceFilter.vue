<script setup lang="ts">
import { Filter, ShieldCheck, Users } from 'lucide-vue-next'

const linksStore = useDashboardLinksStore()

const options = [
  { value: 'all', label: 'links.filter.all' },
  { value: 'admin', label: 'links.filter.admin' },
  { value: 'guest', label: 'links.filter.guest' },
] as const
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline">
        <TooltipProvider>
          <Tooltip :delay-duration="100">
            <TooltipTrigger class="flex items-center">
              <Filter
                class="
                  h-4 w-4
                  sm:mr-2
                "
              />
              <span
                class="
                  hidden
                  sm:inline
                "
              >
                {{ $t('links.filter.source') }}: {{ $t(`links.filter.${linksStore.sourceFilter}`) }}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{{ $t('links.filter.source') }}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem
        v-for="option in options"
        :key="option.value"
        @click="linksStore.sourceFilter = option.value"
      >
        <ShieldCheck v-if="option.value === 'admin'" class="mr-2 h-4 w-4" />
        <Users v-else-if="option.value === 'guest'" class="mr-2 h-4 w-4" />
        <Filter v-else class="mr-2 h-4 w-4" />
        {{ $t(option.label) }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
