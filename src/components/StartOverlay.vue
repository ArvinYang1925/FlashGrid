<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { DailyRecord, EndlessRecord } from '@/composables/useGame'
import type { Mode } from '@/game/config'

defineProps<{
  dailyNumber: number
  dailyDone: boolean
  dailyRecord: DailyRecord | null
  streakCount: number
  best: number
  bestEndless: EndlessRecord
}>()

defineEmits<{ start: [mode: Mode] }>()

const { t } = useI18n()
</script>

<template>
  <div class="overlay">
    <div class="card">
      <p class="tagline">{{ t('tagline') }}</p>

      <h2 class="card__heading">{{ t('chooseMode') }}</h2>

      <div class="modes">
        <button class="mode" type="button" @click="$emit('start', 'classic')">
          <span class="mode__main">
            <span class="mode__name">{{ t('modeClassic') }}</span>
            <span class="mode__hint">{{ t('modeClassicHint') }}</span>
          </span>
          <span v-if="best > 0" class="mode__stat">
            <span class="mode__stat-label">{{ t('best') }}</span>
            <span class="mode__stat-value">{{ best.toLocaleString() }}</span>
          </span>
        </button>

        <button
          class="mode"
          :class="{ 'mode--done': dailyDone }"
          type="button"
          :disabled="dailyDone"
          @click="$emit('start', 'daily')"
        >
          <span class="mode__main">
            <span class="mode__name">
              {{ t('modeDaily') }}
              <span class="mode__tag">#{{ dailyNumber }}</span>
            </span>
            <span class="mode__hint">
              {{ dailyDone ? t('dailyAgainTomorrow') : t('modeDailyHint') }}
            </span>
          </span>
          <span v-if="dailyDone && dailyRecord" class="mode__stat">
            <span class="mode__stat-label">{{ t('dailyPlayed') }}</span>
            <span class="mode__stat-value">
              {{ dailyRecord.rank }} · {{ dailyRecord.score.toLocaleString() }}
            </span>
          </span>
        </button>

        <button class="mode" type="button" @click="$emit('start', 'endless')">
          <span class="mode__main">
            <span class="mode__name">{{ t('modeEndless') }}</span>
            <span class="mode__hint">{{ t('modeEndlessHint') }}</span>
          </span>
          <span v-if="bestEndless.level > 0" class="mode__stat">
            <span class="mode__stat-label">{{ t('bestLevel') }}</span>
            <span class="mode__stat-value">{{ bestEndless.level }}</span>
          </span>
        </button>
      </div>

      <p v-if="streakCount > 1" class="streak">★ {{ t('dailyStreak', { n: streakCount }) }}</p>

      <h2 class="card__heading">{{ t('howToTitle') }}</h2>
      <ol class="steps">
        <li>{{ t('howTo1') }}</li>
        <li>{{ t('howTo2') }}</li>
        <li>{{ t('howTo3') }}</li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
  background: rgb(8 8 10 / 82%);
  backdrop-filter: blur(6px);
  animation: fade 220ms var(--ease-out);
}

.card {
  width: min(92vw, 420px);
  padding: clamp(20px, 5vw, 28px);
  border: 1px solid var(--line);
  border-radius: var(--radius-panel);
  background: var(--panel);
  box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
}

.tagline {
  margin: 0 0 20px;
  color: var(--accent);
  font-size: clamp(15px, 4vw, 17px);
  font-weight: 600;
  line-height: 1.5;
}

.card__heading {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.modes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.mode {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 15px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #0f0f13;
  text-align: left;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms var(--ease-out);
}

.mode:not(:disabled):hover {
  border-color: var(--accent-deep);
  background: #15151b;
}

.mode:not(:disabled):active {
  transform: scale(0.98);
}

.mode--done {
  cursor: default;
  opacity: 0.7;
}

.mode__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.mode__name {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 15px;
  font-weight: 650;
}

.mode__tag {
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.mode__hint {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.mode__stat {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.mode__stat-label {
  color: var(--muted);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.mode__stat-value {
  color: var(--accent);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.streak {
  margin: 0 0 18px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.steps {
  margin: 0;
  padding-left: 20px;
  color: #cfcfd6;
  font-size: 13px;
  line-height: 1.6;
}

.steps li + li {
  margin-top: 6px;
}

@keyframes fade {
  from {
    opacity: 0;
  }
}
</style>
