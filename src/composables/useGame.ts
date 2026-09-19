import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import {
  COUNTDOWN_MS,
  HINT_AFTER_MISSES,
  HINT_MS,
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

/**
 * 單一格子在畫面上的狀態。
 * hint 是連錯之後「還沒找到的正確格再閃一次」，看起來像 lit 但只維持 HINT_MS。
 */
export type TileState = 'dark' | 'lit' | 'found' | 'wrong' | 'hint'

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

  /** 提示中：還沒找到的正確格會暫時亮起。 */
  const hintActive = ref(false)

  /** 這一關目前連續點錯幾次；點對或提示過就歸零。 */
  let missStreak = 0
  let hintTimer: ReturnType<typeof setTimeout> | null = null

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

  function cancel(id: ReturnType<typeof setTimeout>) {
    clearTimeout(id)
    timers.delete(id)
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
      if (hintActive.value && targets.value.has(i) && !found.value.has(i)) return 'hint'
      if (wrongFlash.value.has(i)) return 'wrong'
      if (found.value.has(i)) return 'found'
      return 'dark'
    })
  })

  /** 只有作答階段才接受點擊。 */
  const boardInteractive = computed(() => phase.value === 'recall')

  /** 把還沒找到的正確格再亮一下，HINT_MS 之後自動暗回去。 */
  function showHint() {
    hideHint()
    hintActive.value = true
    play('hint')

    hintTimer = later(() => {
      hintTimer = null
      hintActive.value = false
    }, HINT_MS)
  }

  function hideHint() {
    if (hintTimer) {
      cancel(hintTimer)
      hintTimer = null
    }
    hintActive.value = false
  }

  function beginLevel() {
    clearTimers()
    hideHint()
    missStreak = 0
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
    hideHint()
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
      missStreak = 0
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

    // 連錯太多次就把答案再閃一次；提示過後重新計算，避免一路被餵答案
    missStreak += 1
    if (missStreak >= HINT_AFTER_MISSES) {
      missStreak = 0
      showHint()
    }
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
    hideHint()
    missStreak = 0
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
    hintActive,
    boardInteractive,
    tilesThisLevel,
    remaining,
    rank,
    start,
    selectTile,
    reset,
  }
}
