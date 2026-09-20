<script setup lang="ts">
import { computed } from 'vue'
import GameBoard from './components/GameBoard.vue'
import HudBar from './components/HudBar.vue'
import ResultOverlay from './components/ResultOverlay.vue'
import StartOverlay from './components/StartOverlay.vue'
import { useGame } from '@/composables/useGame'
import { useI18n } from '@/composables/useI18n'
import { COMBO_SHOW_FROM } from '@/game/config'

const { t } = useI18n()
const {
  phase,
  mode,
  outcome,
  level,
  totalLevels,
  score,
  best,
  bestEndless,
  totalErrors,
  missesLeft,
  lastLevelScore,
  isNewBest,
  totalTimeMs,
  combo,
  bestCombo,
  comboMultiplierNow,
  lastComboBonus,
  comboPulse,
  tileStates,
  lastBoard,
  boardInteractive,
  hintActive,
  memorizeMs,
  remaining,
  rank,
  todayNumber,
  dailyRecord,
  dailyDone,
  streakCount,
  start,
  selectTile,
  reset,
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
const sideInfo = computed(() => {
  if (phase.value === 'recall') return `${remaining.value} ${t.value('remaining')}`
  if (phase.value === 'levelClear') return `+${lastLevelScore.value.toLocaleString()}`

  return ''
})

/** 連擊低的時候不用一直佔著版面，到有倍率了才跳出來。 */
const comboVisible = computed(() => phase.value === 'recall' && combo.value >= COMBO_SHOW_FROM)
</script>

<template>
  <main class="app">
    <HudBar
      :mode="mode"
      :level="level"
      :total-levels="totalLevels"
      :score="score"
      :best="best"
      :best-level="bestEndless.level"
      :misses="totalErrors"
      :misses-left="missesLeft"
    />

    <section class="stage">
      <div class="prompt" :class="[`prompt--${phase}`, { 'prompt--hint': hintActive }]">
        <span class="prompt__dot" aria-hidden="true" />
        <span class="prompt__text">{{ prompt }}</span>

        <span class="prompt__right">
          <!-- key 換掉會讓元素重新掛載，動畫才會每一次都重播 -->
          <span v-if="comboVisible" :key="comboPulse" class="combo">
            <span class="combo__x">{{ t('combo') }} ×{{ comboMultiplierNow }}</span>
            <span v-if="lastComboBonus > 0" class="combo__gain">+{{ lastComboBonus }}</span>
          </span>
          <span v-if="sideInfo" class="prompt__hint">{{ sideInfo }}</span>
        </span>
      </div>

      <div class="meter" aria-hidden="true">
        <div
          v-if="phase === 'memorize'"
          class="meter__fill"
          :style="{ '--memorize-ms': `${memorizeMs}ms` }"
        />
      </div>

      <GameBoard :states="tileStates" :interactive="boardInteractive" @select="selectTile" />

      <div v-if="phase !== 'idle' && phase !== 'finished'" class="controls">
        <button class="ghost" type="button" @click="start(mode)">{{ t('restart') }}</button>
        <button class="ghost" type="button" @click="reset()">{{ t('menu') }}</button>
      </div>
    </section>

    <StartOverlay
      v-if="phase === 'idle'"
      :daily-number="todayNumber"
      :daily-done="dailyDone"
      :daily-record="dailyRecord"
      :streak-count="streakCount"
      :best="best"
      :best-endless="bestEndless"
      @start="start"
    />

    <ResultOverlay
      v-else-if="phase === 'finished'"
      :mode="mode"
      :outcome="outcome"
      :score="score"
      :misses="totalErrors"
      :total-time-ms="totalTimeMs"
      :rank="rank"
      :best-combo="bestCombo"
      :level="level"
      :best-level="bestEndless.level"
      :daily-number="todayNumber"
      :streak-count="streakCount"
      :is-new-best="isNewBest"
      :board="lastBoard"
      @again="start(mode)"
      @menu="reset()"
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

.prompt__right {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
  gap: 10px;
}

.prompt__hint {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.prompt--levelClear .prompt__hint {
  color: var(--accent);
}

.combo {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgb(245 184 46 / 14%);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  animation: combo-pop 340ms var(--ease-out);
}

.combo__gain {
  color: #fff2c9;
  font-size: 11px;
}

.controls {
  display: flex;
  gap: 8px;
}

.ghost {
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

.ghost:hover {
  color: var(--text);
  border-color: #3d3d47;
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

@keyframes combo-pop {
  from {
    transform: scale(0.72);
    opacity: 0.4;
  }
  60% {
    transform: scale(1.12);
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
