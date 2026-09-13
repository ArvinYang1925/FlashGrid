<script setup lang="ts">
import { computed } from 'vue'
import type { TileState } from '@/composables/useGame'

const props = defineProps<{
  index: number
  state: TileState
  interactive: boolean
  /** 依索引給一點翻牌延遲，讓整盤像波浪一樣翻開。 */
  stagger: number
}>()

const emit = defineEmits<{ select: [index: number] }>()

/** dark 以外的狀態都翻到背面（有顏色的那一面）。 */
const faceUp = computed(() => props.state !== 'dark')

// 只有翻開時才需要延遲；蓋回去時整盤要一起變暗，比較有「時間到」的感覺
const delay = computed(() => (faceUp.value ? `${props.stagger}ms` : '0ms'))
</script>

<template>
  <button
    class="tile"
    :class="[`tile--${state}`, { 'tile--up': faceUp }]"
    :style="{ '--delay': delay }"
    :disabled="!interactive"
    :aria-pressed="state === 'found'"
    type="button"
    @click="emit('select', index)"
  >
    <span class="tile__inner">
      <span class="tile__face tile__face--front" />
      <span class="tile__face tile__face--back" />
    </span>
  </button>
</template>

<style scoped>
.tile {
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  background: none;
  perspective: 700px;
}

.tile:disabled {
  cursor: default;
}

.tile__inner {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform var(--flip-duration) var(--ease-out);
  transition-delay: var(--delay);
}

.tile--up .tile__inner {
  transform: rotateY(180deg);
}

.tile__face {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-tile);
  backface-visibility: hidden;
  transition: background var(--flip-duration) var(--ease-out);
}

.tile__face--front {
  background: linear-gradient(160deg, var(--tile-face-top), var(--tile-face));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 7%);
}

.tile__face--back {
  transform: rotateY(180deg);
  background: linear-gradient(160deg, var(--accent), var(--accent-deep));
}

.tile--found .tile__face--back {
  background: linear-gradient(160deg, var(--accent), var(--accent-deep));
  box-shadow:
    0 0 0 2px rgb(245 184 46 / 35%),
    0 6px 18px rgb(245 184 46 / 22%);
}

.tile--wrong .tile__face--back {
  background: linear-gradient(160deg, #f2686c, var(--danger));
}

.tile--lit .tile__face--back {
  box-shadow: 0 6px 22px rgb(245 184 46 / 26%);
}

/* 可點的時候給一點回饋，作答階段才會生效 */
.tile:not(:disabled):hover .tile__face--front {
  background: linear-gradient(160deg, #53535c, #42424a);
}

.tile:not(:disabled):active .tile__inner {
  transform: scale(0.94);
}

.tile--up:not(:disabled):active .tile__inner {
  transform: rotateY(180deg) scale(0.94);
}
</style>
