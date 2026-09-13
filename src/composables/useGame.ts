import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import {
  COUNTDOWN_MS,
  LEVEL_CLEAR_MS,
  MEMORIZE_MS,
  STORAGE_KEYS,
  TOTAL_CELLS,
  TOTAL_LEVELS,
  WRONG_FLASH_MS,
} from '@/game/config'
import { isFinalLevel, levelScore, pickTargets, rankFor, tilesForLevel } from '@/game/logic'
import { useSound } from './useSound'

/**
 * idle      起始畫面
 * ready     每關開場的短暫倒數
 * memorize  亮格記憶階段
 * recall    玩家作答階段
 * levelClear 過關動畫
 * finished  全部通關的結算畫面
 */
export type Phase = 'idle' | 'ready' | 'memorize' | 'recall' | 'levelClear' | 'finished'

/** 單一格子在畫面上的狀態。 */
export type TileState = 'dark' | 'lit' | 'found' | 'wrong'

function loadBest(): number {
  try {
    const raw = Number(localStorage.getItem(STORAGE_KEYS.best))
    return Number.isFinite(raw) && raw > 0 ? raw : 0
  } catch {
    return 0
  }
}

function saveBest(value: number) {
  try {
    localStorage.setItem(STORAGE_KEYS.best, String(value))
  } catch {
    // 存不進去不影響遊玩
  }
}

export function useGame() {
  const { play } = useSound()

  const phase = ref<Phase>('idle')
  const level = ref(1)
  const score = ref(0)
  const best = ref(loadBest())
  const totalErrors = ref(0)
  const levelErrors = ref(0)
  const lastLevelScore = ref(0)
  const isNewBest = ref(false)
  const totalTimeMs = ref(0)

  /** 這一關要找的格子；shallowRef 因為每關整個換掉，不需要深層追蹤。 */
  const targets = shallowRef<Set<number>>(new Set())
  const found = ref<Set<number>>(new Set())
  const wrongFlash = ref<Set<number>>(new Set())

  let levelStartedAt = 0
  let runStartedAt = 0
  const timers = new Set<ReturnType<typeof setTimeout>>()

  function later(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
    return id
  }

  function clearTimers() {
    for (const id of timers) clearTimeout(id)
    timers.clear()
  }

  onScopeDispose(clearTimers)

  const tilesThisLevel = computed(() => tilesForLevel(level.value))
  const remaining = computed(() => targets.value.size - found.value.size)

  /** 每一格目前該顯示成什麼；模板直接讀這個陣列即可。 */
  const tileStates = computed<TileState[]>(() => {
    const showAnswer = phase.value === 'memorize' || phase.value === 'levelClear'

    return Array.from({ length: TOTAL_CELLS }, (_, i) => {
      if (showAnswer && targets.value.has(i)) return 'lit'
      if (wrongFlash.value.has(i)) return 'wrong'
      if (found.value.has(i)) return 'found'
      return 'dark'
    })
  })

  /** 只有作答階段才接受點擊。 */
  const boardInteractive = computed(() => phase.value === 'recall')

  function beginLevel() {
    clearTimers()
    found.value = new Set()
    wrongFlash.value = new Set()
    levelErrors.value = 0
    targets.value = new Set(pickTargets(tilesThisLevel.value))
    phase.value = 'ready'

    later(() => {
      phase.value = 'memorize'
      play('reveal')

      later(() => {
        phase.value = 'recall'
        levelStartedAt = performance.now()
        play('hide')
      }, MEMORIZE_MS)
    }, COUNTDOWN_MS)
  }

  function start() {
    score.value = 0
    totalErrors.value = 0
    totalTimeMs.value = 0
    lastLevelScore.value = 0
    isNewBest.value = false
    level.value = 1
    runStartedAt = performance.now()
    beginLevel()
  }

  function finishRun() {
    totalTimeMs.value = performance.now() - runStartedAt
    phase.value = 'finished'

    if (score.value > best.value) {
      best.value = score.value
      isNewBest.value = true
      saveBest(score.value)
    }

    play('complete')
  }

  function completeLevel() {
    const elapsedMs = performance.now() - levelStartedAt
    const gained = levelScore({
      tiles: tilesThisLevel.value,
      errors: levelErrors.value,
      elapsedMs,
    })

    lastLevelScore.value = gained
    score.value += gained
    phase.value = 'levelClear'
    play('levelClear')

    later(() => {
      if (isFinalLevel(level.value)) {
        finishRun()
      } else {
        level.value += 1
        beginLevel()
      }
    }, LEVEL_CLEAR_MS)
  }

  function selectTile(index: number) {
    if (!boardInteractive.value) return
    if (found.value.has(index) || wrongFlash.value.has(index)) return

    if (targets.value.has(index)) {
      // Set 是 ref 的值，要換成新的物件才會觸發更新
      found.value = new Set(found.value).add(index)
      play('correct')

      if (found.value.size === targets.value.size) completeLevel()
      return
    }

    // 點錯：只扣分、不扣命，紅色提示閃一下就恢復
    levelErrors.value += 1
    totalErrors.value += 1
    wrongFlash.value = new Set(wrongFlash.value).add(index)
    play('wrong')

    later(() => {
      const next = new Set(wrongFlash.value)
      next.delete(index)
      wrongFlash.value = next
    }, WRONG_FLASH_MS)
  }

  function reset() {
    clearTimers()
    phase.value = 'idle'
    level.value = 1
    score.value = 0
    totalErrors.value = 0
    levelErrors.value = 0
    targets.value = new Set()
    found.value = new Set()
    wrongFlash.value = new Set()
  }

  /** 本局累積要記的總格數，用來換算評價。 */
  const totalTilesSeen = computed(() => {
    let sum = 0
    for (let lv = 1; lv <= TOTAL_LEVELS; lv++) sum += tilesForLevel(lv)
    return sum
  })

  const rank = computed(() => rankFor(totalErrors.value, totalTilesSeen.value))

  return {
    phase,
    level,
    score,
    best,
    totalErrors,
    levelErrors,
    lastLevelScore,
    isNewBest,
    totalTimeMs,
    tileStates,
    boardInteractive,
    tilesThisLevel,
    remaining,
    rank,
    start,
    selectTile,
    reset,
  }
}
