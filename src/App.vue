<script setup lang="ts">
import { computed } from 'vue'
import GameBoard from './components/GameBoard.vue'
import HudBar from './components/HudBar.vue'
import ResultOverlay from './components/ResultOverlay.vue'
import StartOverlay from './components/StartOverlay.vue'
import { useGame } from '@/composables/useGame'
import { useI18n } from '@/composables/useI18n'
import { MEMORIZE_MS } from '@/game/config'

const { t } = useI18n()
const {
  phase,
  level,
  score,
  best,
  totalErrors,
  lastLevelScore,
  isNewBest,
  totalTimeMs,
  tileStates,
  boardInteractive,
  remaining,
  hintActive,
  rank,
  start,
  selectTile,
} = useGame()

const prompt = computed(() => {
  switch (phase.value) {
    case 'ready':
      return t.value('getReady')
    case 'memorize':
      return t.value('memorize')
    case 'recall':
      return hintActive.value ? t.value('hintShown') : t.value('recall')
    case 'levelClear':
      return t.value('levelClear')
    default:
      return t.value('tagline')
  }
})

/** 右側的次要資訊：作答時顯示還剩幾格，過關時顯示這關拿了幾分。 */
const hint = computed(() => {
  if (phase.value === 'recall') return `${remaining.value} ${t.value('remaining')}`
  if (phase.value === 'levelClear') return `+${lastLevelScore.value.toLocaleString()}`

  return ''
})
</script>

<template>
  <main class="app">
    <HudBar :level="level" :score="score" :best="best" :misses="totalErrors" />

    <section class="stage">
      <div class="prompt" :class="[`prompt--${phase}`, { 'prompt--hint': hintActive }]">
        <span class="prompt__dot" aria-hidden="true" />
        <span class="prompt__text">{{ prompt }}</span>
        <span v-if="hint" class="prompt__hint">{{ hint }}</span>
      </div>

      <div class="meter" aria-hidden="true">
        <div
          v-if="phase === 'memorize'"
          class="meter__fill"
          :style="{ '--memorize-ms': `${MEMORIZE_MS}ms` }"
        />
      </div>

      <GameBoard :states="tileStates" :interactive="boardInteractive" @select="selectTile" />

      <button
        v-if="phase !== 'idle' && phase !== 'finished'"
        class="restart"
        type="button"
        @click="start"
      >
        {{ t('restart') }}
      </button>
    </section>

    <StartOverlay v-if="phase === 'idle'" @start="start" />

    <ResultOverlay
      v-else-if="phase === 'finished'"
      :score="score"
      :best="best"
      :misses="totalErrors"
      :total-time-ms="totalTimeMs"
      :rank="rank"
      :is-new-best="isNewBest"
      @again="start"
    />
  </main>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* safe center：視窗比內容矮時退回靠上對齊，不會把 HUD 切掉 */
  justify-content: safe center;
  gap: clamp(14px, 4vw, 22px);
  min-height: 100dvh;
  padding: clamp(16px, 5vw, 36px) 16px calc(24px + env(safe-area-inset-bottom));
}

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: var(--board-width);
}

.prompt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 24px;
  font-size: clamp(13px, 3.6vw, 15px);
  font-weight: 600;
}

.prompt__dot {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--muted);
  transition: background 200ms ease;
}

.prompt--memorize .prompt__dot,
.prompt--levelClear .prompt__dot {
  background: var(--accent);
  box-shadow: 0 0 0 4px rgb(245 184 46 / 18%);
}

.prompt--recall .prompt__dot {
  background: var(--success);
  box-shadow: 0 0 0 4px rgb(123 216 143 / 16%);
}

.prompt--hint .prompt__dot {
  background: var(--accent);
  box-shadow: 0 0 0 4px rgb(245 184 46 / 18%);
  animation: pulse 380ms ease-in-out infinite;
}

.prompt--hint .prompt__text {
  color: var(--accent);
}

.prompt--ready .prompt__dot {
  animation: pulse 600ms ease-in-out infinite;
}

.prompt__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt__hint {
  margin-left: auto;
  flex-shrink: 0;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.prompt--levelClear .prompt__hint {
  color: var(--accent);
}

.meter {
  width: 100%;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--panel);
}

.meter__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-deep), var(--accent));
  transform-origin: left;
  animation: drain var(--memorize-ms) linear forwards;
}

.restart {
  padding: 8px 18px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  transition:
    color 160ms ease,
    border-color 160ms ease;
}

.restart:hover {
  color: var(--text);
  border-color: #3d3d47;
}

@keyframes drain {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}
</style>
