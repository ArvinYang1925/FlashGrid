<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { useSound } from '@/composables/useSound'
import { TOTAL_LEVELS } from '@/game/config'

defineProps<{
  level: number
  score: number
  best: number
  misses: number
}>()

const { locale, toggleLocale, t } = useI18n()
const { muted, toggleMute } = useSound()
</script>

<template>
  <header class="hud">
    <div class="hud__top">
      <h1 class="hud__title">{{ t('title') }}</h1>

      <div class="hud__actions">
        <button
          class="chip"
          type="button"
          :aria-label="t('langLabel')"
          :title="t('langLabel')"
          @click="toggleLocale"
        >
          {{ locale === 'en' ? '中' : 'EN' }}
        </button>
        <button
          class="chip"
          type="button"
          :aria-label="muted ? t('soundOff') : t('soundOn')"
          :title="muted ? t('soundOff') : t('soundOn')"
          :aria-pressed="!muted"
          @click="toggleMute"
        >
          <!-- 用 inline SVG 而不是 emoji，避免各平台字型把它畫成單色外框 -->
          <svg
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" stroke="none" />
            <template v-if="muted">
              <path d="m16.5 9.5 4 5m0-5-4 5" />
            </template>
            <template v-else>
              <path d="M16 9.2a4 4 0 0 1 0 5.6" />
              <path d="M18.8 6.6a7.6 7.6 0 0 1 0 10.8" />
            </template>
          </svg>
        </button>
      </div>
    </div>

    <dl class="stats">
      <div class="stat">
        <dt>{{ t('level') }}</dt>
        <dd>
          {{ level }}<span class="stat__sub">/{{ TOTAL_LEVELS }}</span>
        </dd>
      </div>
      <div class="stat">
        <dt>{{ t('score') }}</dt>
        <dd>{{ score.toLocaleString() }}</dd>
      </div>
      <div class="stat">
        <dt>{{ t('best') }}</dt>
        <dd>{{ best.toLocaleString() }}</dd>
      </div>
      <div class="stat">
        <dt>{{ t('misses') }}</dt>
        <dd :class="{ 'stat--warn': misses > 0 }">{{ misses }}</dd>
      </div>
    </dl>
  </header>
</template>

<style scoped>
.hud {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: var(--board-width);
}

.hud__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hud__title {
  margin: 0;
  font-size: clamp(17px, 4.4vw, 21px);
  font-weight: 650;
  letter-spacing: -0.01em;
}

.hud__actions {
  display: flex;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  font-size: 13px;
  font-weight: 600;
  transition:
    border-color 160ms ease,
    transform 160ms ease;
}

.chip:hover {
  border-color: #3d3d47;
}

.chip:active {
  transform: scale(0.95);
}

.icon {
  width: 17px;
  height: 17px;
  color: var(--text);
}

.chip[aria-pressed='false'] .icon {
  color: var(--muted);
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 0;
}

.stat {
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  text-align: center;
}

.stat dt {
  margin-bottom: 3px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stat dd {
  margin: 0;
  font-size: clamp(15px, 4vw, 18px);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.stat__sub {
  color: var(--muted);
  font-size: 0.7em;
  font-weight: 500;
}

.stat--warn {
  color: var(--danger);
}
</style>
