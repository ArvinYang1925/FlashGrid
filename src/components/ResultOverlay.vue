<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useScoreCard } from '@/composables/useScoreCard'
import type { Outcome } from '@/composables/useGame'
import { SITE_URL, type Mode } from '@/game/config'
import type { ScoreCardData } from '@/game/scoreCard'

const props = defineProps<{
  mode: Mode
  outcome: Outcome
  score: number
  misses: number
  totalTimeMs: number
  rank: string
  bestCombo: number
  level: number
  bestLevel: number
  dailyNumber: number
  streakCount: number
  isNewBest: boolean
  board: boolean[]
}>()

defineEmits<{ again: []; menu: [] }>()

const { t } = useI18n()
const { status, save } = useScoreCard()

const isEndless = computed(() => props.mode === 'endless')
const isDaily = computed(() => props.mode === 'daily')

const duration = computed(() => {
  const totalSeconds = Math.round(props.totalTimeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

const modeLabel = computed(() => {
  if (isDaily.value) return t.value('dailyNo', { n: props.dailyNumber })
  return isEndless.value ? t.value('modeEndless') : t.value('modeClassic')
})

const headlineLabel = computed(() => (isEndless.value ? t.value('levelReached') : t.value('rank')))
const headlineValue = computed(() => (isEndless.value ? String(props.level) : props.rank))

/** 結算卡片上的四格統計，經典／每日看失誤，無盡看最佳關卡。 */
const summary = computed(() => [
  { key: 'score', label: t.value('finalScore'), value: props.score.toLocaleString(), accent: true },
  isEndless.value
    ? { key: 'bestLevel', label: t.value('bestLevel'), value: String(props.bestLevel) }
    : { key: 'misses', label: t.value('totalMisses'), value: String(props.misses) },
  { key: 'time', label: t.value('totalTime'), value: duration.value },
  { key: 'combo', label: t.value('bestCombo'), value: `×${props.bestCombo}` },
])

const cardData = computed<ScoreCardData>(() => ({
  title: t.value('title'),
  modeLabel: modeLabel.value,
  headlineLabel: headlineLabel.value,
  headlineValue: headlineValue.value,
  scoreLabel: t.value('finalScore'),
  score: props.score,
  stats: [
    isEndless.value
      ? { label: t.value('level'), value: String(props.level) }
      : { label: t.value('totalMisses'), value: String(props.misses) },
    { label: t.value('totalTime'), value: duration.value },
    { label: t.value('bestCombo'), value: `×${props.bestCombo}` },
  ],
  board: props.board,
  url: SITE_URL,
}))

const cardFileName = computed(() => {
  const suffix = isDaily.value ? `daily-${props.dailyNumber}` : props.mode
  return `flashgrid-${suffix}-${props.score}.png`
})

const cardLabel = computed(() => {
  switch (status.value) {
    case 'working':
      return t.value('savingCard')
    case 'done':
      return t.value('cardSaved')
    case 'failed':
      return t.value('cardFailed')
    default:
      return t.value('saveCard')
  }
})
</script>

<template>
  <div class="overlay">
    <div class="card">
      <p class="eyebrow">
        {{ outcome === 'cleared' ? t('complete') : t('gameOver') }}
        <span class="eyebrow__mode">{{ modeLabel }}</span>
      </p>

      <div class="rank" :data-rank="headlineValue">
        <span class="rank__label">{{ headlineLabel }}</span>
        <span class="rank__value">{{ headlineValue }}</span>
      </div>

      <p v-if="isNewBest" class="new-best">★ {{ t('newBest') }}</p>
      <p v-else-if="isDaily && streakCount > 1" class="new-best">
        ★ {{ t('dailyStreak', { n: streakCount }) }}
      </p>

      <dl class="summary">
        <div v-for="item in summary" :key="item.key">
          <dt>{{ item.label }}</dt>
          <dd :class="{ summary__score: item.accent }">{{ item.value }}</dd>
        </div>
      </dl>

      <p v-if="isDaily" class="note">{{ t('dailyAgainTomorrow') }}</p>

      <div class="actions">
        <button v-if="!isDaily" class="primary" type="button" @click="$emit('again')">
          {{ t('playAgain') }}
        </button>

        <button
          class="secondary"
          type="button"
          :disabled="status === 'working'"
          @click="save(cardData, cardFileName)"
        >
          {{ cardLabel }}
        </button>

        <button class="ghost" type="button" @click="$emit('menu')">{{ t('menu') }}</button>
      </div>
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
  background: rgb(8 8 10 / 86%);
  backdrop-filter: blur(6px);
  animation: fade 260ms var(--ease-out);
}

.card {
  width: min(92vw, 400px);
  padding: clamp(22px, 5vw, 30px);
  border: 1px solid var(--line);
  border-radius: var(--radius-panel);
  background: var(--panel);
  box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
  text-align: center;
}

.eyebrow {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.eyebrow__mode {
  color: var(--accent);
  font-size: 11px;
  letter-spacing: 0.06em;
}

.rank {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-bottom: 14px;
}

.rank__label {
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.rank__value {
  font-size: clamp(52px, 15vw, 68px);
  font-weight: 800;
  line-height: 1;
  color: var(--accent);
}

.rank[data-rank='S'] .rank__value {
  background: linear-gradient(160deg, #fff2c9, var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 4px 18px rgb(245 184 46 / 35%));
}

.rank[data-rank='C'] .rank__value {
  color: var(--muted);
}

.new-best {
  margin: 0 0 16px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
}

.summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 0 0 18px;
}

.summary > div {
  padding: 11px 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #0f0f13;
}

.summary dt {
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.summary dd {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.summary__score {
  color: var(--accent);
}

.note {
  margin: 0 0 18px;
  color: var(--muted);
  font-size: 12px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.primary,
.secondary,
.ghost {
  width: 100%;
  border-radius: 12px;
  font-weight: 700;
  transition: transform 160ms var(--ease-out);
}

.primary {
  padding: 13px;
  border: 0;
  background: linear-gradient(160deg, var(--accent), var(--accent-deep));
  color: #1d1503;
  font-size: 15px;
}

.secondary {
  padding: 12px;
  border: 1px solid var(--accent-deep);
  background: transparent;
  color: var(--accent);
  font-size: 14px;
}

.secondary:disabled {
  cursor: default;
  opacity: 0.6;
}

.ghost {
  padding: 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.ghost:hover {
  color: var(--text);
  border-color: #3d3d47;
}

.primary:active,
.secondary:active,
.ghost:active {
  transform: scale(0.97);
}

@keyframes fade {
  from {
    opacity: 0;
  }
}
</style>
