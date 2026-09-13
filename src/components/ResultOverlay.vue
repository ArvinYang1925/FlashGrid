<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  score: number
  best: number
  misses: number
  totalTimeMs: number
  rank: string
  isNewBest: boolean
}>()

defineEmits<{ again: [] }>()

const { t } = useI18n()

const duration = computed(() => {
  const totalSeconds = Math.round(props.totalTimeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})
</script>

<template>
  <div class="overlay">
    <div class="card">
      <p class="eyebrow">{{ t('complete') }}</p>

      <div class="rank" :data-rank="rank">
        <span class="rank__label">{{ t('rank') }}</span>
        <span class="rank__value">{{ rank }}</span>
      </div>

      <p v-if="isNewBest" class="new-best">★ {{ t('newBest') }}</p>

      <dl class="summary">
        <div>
          <dt>{{ t('finalScore') }}</dt>
          <dd class="summary__score">{{ score.toLocaleString() }}</dd>
        </div>
        <div>
          <dt>{{ t('totalMisses') }}</dt>
          <dd>{{ misses }}</dd>
        </div>
        <div>
          <dt>{{ t('totalTime') }}</dt>
          <dd>{{ duration }}</dd>
        </div>
        <div>
          <dt>{{ t('best') }}</dt>
          <dd>{{ best.toLocaleString() }}</dd>
        </div>
      </dl>

      <button class="primary" type="button" @click="$emit('again')">{{ t('playAgain') }}</button>
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
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
  margin: 0 0 22px;
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

.primary {
  width: 100%;
  padding: 13px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(160deg, var(--accent), var(--accent-deep));
  color: #1d1503;
  font-size: 15px;
  font-weight: 700;
  transition: transform 160ms var(--ease-out);
}

.primary:active {
  transform: scale(0.97);
}

@keyframes fade {
  from {
    opacity: 0;
  }
}
</style>
