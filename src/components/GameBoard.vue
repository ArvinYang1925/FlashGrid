<script setup lang="ts">
import TileCard from './TileCard.vue'
import { BOARD_SIZE } from '@/game/config'
import type { TileState } from '@/composables/useGame'

defineProps<{
  states: TileState[]
  interactive: boolean
}>()

const emit = defineEmits<{ select: [index: number] }>()

/** 以左上到右下的對角線當波紋起點，翻牌看起來比逐格掃描自然。 */
function staggerFor(index: number) {
  const row = Math.floor(index / BOARD_SIZE)
  const col = index % BOARD_SIZE
  return (row + col) * 22
}
</script>

<template>
  <div class="board" :class="{ 'board--idle': !interactive }">
    <TileCard
      v-for="(state, index) in states"
      :key="index"
      :index="index"
      :state="state"
      :stagger="staggerFor(index)"
      :interactive="interactive"
      @select="emit('select', $event)"
    />
  </div>
</template>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(v-bind('BOARD_SIZE'), 1fr);
  gap: var(--board-gap);
  width: var(--board-width);
  padding: var(--board-gap);
  border: 1px solid var(--line);
  border-radius: var(--radius-panel);
  background: var(--panel);
  transition: opacity 200ms ease;
}

.board--idle {
  opacity: 0.92;
}
</style>
