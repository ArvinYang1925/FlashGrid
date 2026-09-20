import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import {
  COUNTDOWN_MS,
  ENDLESS_MAX_MISSES,
  HINT_AFTER_MISSES,
  HINT_MS,
  LEVEL_CLEAR_MS,
  STORAGE_KEYS,
  TOTAL_CELLS,
  TOTAL_LEVELS,
  WRONG_FLASH_MS,
  type Mode,
} from '@/game/config'
import { dailyNumber, dailyRng, dateKey, previousDateKey } from '@/game/daily'
import {
  comboBonusFor,
  comboMultiplier,
  isFinalLevel,
  levelScore,
  maxMissesFor,
  memorizeMsForLevel,
  pickTargets,
  rankFor,
  tilesForLevel,
} from '@/game/logic'
import { useSound } from './useSound'

/**
 * idle      起始畫面
 * ready     每關開場的短暫倒數
 * memorize  亮格記憶階段
 * recall    玩家作答階段
 * levelClear 過關動畫
 * finished  結算畫面（通關或失誤用完都算）
 */
export type Phase = 'idle' | 'ready' | 'memorize' | 'recall' | 'levelClear' | 'finished'

/**
 * 單一格子在畫面上的狀態。
 * hint 是連錯之後「還沒找到的正確格再閃一次」，看起來像 lit 但只維持 HINT_MS。
 */
export type TileState = 'dark' | 'lit' | 'found' | 'wrong' | 'hint'

/** 一局是通關結束，還是失誤用完結束。 */
export type Outcome = 'cleared' | 'failed'

/** 今天的每日挑戰成績，存在 localStorage。 */
export interface DailyRecord {
  key: string
  number: number
  score: number
  misses: number
  rank: string
  timeMs: number
  bestCombo: number
}

/** 無盡模式的最佳紀錄。 */
export interface EndlessRecord {
  level: number
  score: number
}

/** 每日挑戰的連續天數。 */
interface StreakRecord {
  last: string
  count: number
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback

    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 存不進去不影響遊玩
  }
}

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
  const mode = ref<Mode>('classic')
  const outcome = ref<Outcome>('cleared')
  const level = ref(1)
  const score = ref(0)
  const best = ref(loadBest())
  const totalErrors = ref(0)
  const levelErrors = ref(0)
  const lastLevelScore = ref(0)
  const isNewBest = ref(false)
  const totalTimeMs = ref(0)

  /** 連續答對幾格；點錯歸零，跨關不歸零，所以整局順順過會愈疊愈高。 */
  const combo = ref(0)
  const bestCombo = ref(0)
  /** 最近一次答對拿到的連擊獎勵分，給畫面跳 +N 用。 */
  const lastComboBonus = ref(0)
  /** 每答對一格就 +1，只是拿來當 CSS 動畫的重播鍵。 */
  const comboPulse = ref(0)
  /** 這一關累積的連擊獎勵分，過關時併入該關得分。 */
  const levelComboBonus = ref(0)

  /** 這一關要找的格子；shallowRef 因為每關整個換掉，不需要深層追蹤。 */
  const targets = shallowRef<Set<number>>(new Set())
  const found = ref<Set<number>>(new Set())
  const wrongFlash = ref<Set<number>>(new Set())

  /** 提示中：還沒找到的正確格會暫時亮起。 */
  const hintActive = ref(false)

  /** 失誤用完之後到結算畫面跳出來的空檔，先把棋盤鎖住。 */
  const runEnding = ref(false)

  /** 這一關目前連續點錯幾次；點對或提示過就歸零。 */
  let missStreak = 0
  let hintTimer: ReturnType<typeof setTimeout> | null = null

  /* ---- 每日挑戰與無盡模式的紀錄 ---- */

  const todayKey = ref(dateKey())
  const todayNumber = computed(() => dailyNumber(todayKey.value))

  const dailyRecord = ref<DailyRecord | null>(
    readJson<DailyRecord | null>(STORAGE_KEYS.dailyResult, null),
  )
  const dailyStreak = ref<StreakRecord>(
    readJson<StreakRecord>(STORAGE_KEYS.dailyStreak, { last: '', count: 0 }),
  )
  const bestEndless = ref<EndlessRecord>(
    readJson<EndlessRecord>(STORAGE_KEYS.bestEndless, { level: 0, score: 0 }),
  )

  /** 今天的每日挑戰是不是已經玩過了。 */
  const dailyDone = computed(() => dailyRecord.value?.key === todayKey.value)
  /** 今天已經玩過才算數的連續天數，否則顯示昨天為止的累積。 */
  const streakCount = computed(() => dailyStreak.value.count)

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

  const tilesThisLevel = computed(() => tilesForLevel(level.value, mode.value))
  const memorizeMs = computed(() => memorizeMsForLevel(level.value, mode.value))
  const remaining = computed(() => targets.value.size - found.value.size)
  const comboMultiplierNow = computed(() => comboMultiplier(combo.value))

  /** 無盡模式還剩幾次失誤；其他模式回傳 null。 */
  const missesLeft = computed(() => {
    const limit = maxMissesFor(mode.value)
    return limit === null ? null : Math.max(0, limit - totalErrors.value)
  })

  /** 這個模式共幾關，無盡模式沒有終點。 */
  const totalLevels = computed(() => (mode.value === 'endless' ? null : TOTAL_LEVELS))

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

  /** 最後一關的盤面，結算時畫在成績卡上。 */
  const lastBoard = computed(() =>
    Array.from({ length: TOTAL_CELLS }, (_, i) => targets.value.has(i)),
  )

  /** 只有作答階段、而且這局還沒判定結束時才接受點擊。 */
  const boardInteractive = computed(() => phase.value === 'recall' && !runEnding.value)

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

  /** 每日挑戰要用固定種子，其他模式每次都是新盤面。 */
  function rngForLevel() {
    return mode.value === 'daily' ? dailyRng(todayKey.value, level.value) : Math.random
  }

  function beginLevel() {
    clearTimers()
    hideHint()
    missStreak = 0
    found.value = new Set()
    wrongFlash.value = new Set()
    levelErrors.value = 0
    levelComboBonus.value = 0
    targets.value = new Set(pickTargets(tilesThisLevel.value, TOTAL_CELLS, rngForLevel()))
    phase.value = 'ready'

    later(() => {
      phase.value = 'memorize'
      play('reveal')

      later(() => {
        phase.value = 'recall'
        levelStartedAt = performance.now()
        play('hide')
      }, memorizeMs.value)
    }, COUNTDOWN_MS)
  }

  function start(nextMode: Mode = 'classic') {
    mode.value = nextMode
    // 跨過午夜才開局的話，這裡會換到新的一天
    if (nextMode === 'daily') todayKey.value = dateKey()

    score.value = 0
    totalErrors.value = 0
    totalTimeMs.value = 0
    lastLevelScore.value = 0
    isNewBest.value = false
    outcome.value = 'cleared'
    runEnding.value = false
    combo.value = 0
    bestCombo.value = 0
    lastComboBonus.value = 0
    levelComboBonus.value = 0
    level.value = 1
    runStartedAt = performance.now()
    beginLevel()
  }

  /** 把今天的每日挑戰成績與連續天數寫進 localStorage。 */
  function recordDaily() {
    const record: DailyRecord = {
      key: todayKey.value,
      number: todayNumber.value,
      score: score.value,
      misses: totalErrors.value,
      rank: rank.value,
      timeMs: totalTimeMs.value,
      bestCombo: bestCombo.value,
    }

    dailyRecord.value = record
    writeJson(STORAGE_KEYS.dailyResult, record)

    const previous = dailyStreak.value
    let count = 1
    if (previous.last === todayKey.value) count = previous.count
    else if (previous.last === previousDateKey(todayKey.value)) count = previous.count + 1

    dailyStreak.value = { last: todayKey.value, count }
    writeJson(STORAGE_KEYS.dailyStreak, dailyStreak.value)
  }

  /** 無盡模式記最佳關卡；同關卡則比分數。 */
  function recordEndless() {
    const previous = bestEndless.value
    const better =
      level.value > previous.level ||
      (level.value === previous.level && score.value > previous.score)

    if (!better) return

    // 第一次玩沒有舊紀錄可破，撐到第 1 關就喊「刷新紀錄」太浮誇
    isNewBest.value = previous.level > 0
    bestEndless.value = { level: level.value, score: score.value }
    writeJson(STORAGE_KEYS.bestEndless, bestEndless.value)
  }

  function finishRun(result: Outcome) {
    clearTimers()
    hideHint()
    totalTimeMs.value = performance.now() - runStartedAt
    outcome.value = result
    runEnding.value = false
    phase.value = 'finished'

    if (mode.value === 'endless') {
      recordEndless()
    } else if (score.value > best.value) {
      best.value = score.value
      isNewBest.value = true
      saveBest(score.value)
    }

    if (mode.value === 'daily') recordDaily()

    play(result === 'cleared' ? 'complete' : 'gameOver')
  }

  function completeLevel() {
    const elapsedMs = performance.now() - levelStartedAt
    const gained = levelScore({
      tiles: tilesThisLevel.value,
      errors: levelErrors.value,
      elapsedMs,
      comboBonus: levelComboBonus.value,
    })

    lastLevelScore.value = gained
    score.value += gained
    hideHint()
    phase.value = 'levelClear'
    play('levelClear')

    later(() => {
      if (isFinalLevel(level.value, mode.value)) {
        finishRun('cleared')
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

      combo.value += 1
      if (combo.value > bestCombo.value) bestCombo.value = combo.value

      const bonus = comboBonusFor(combo.value)
      lastComboBonus.value = bonus
      levelComboBonus.value += bonus
      comboPulse.value += 1

      // 連擊愈高音愈高，最多往上 12 個半音
      play('correct', Math.min(combo.value - 1, 12))

      if (found.value.size === targets.value.size) completeLevel()
      return
    }

    // 點錯：經典與每日只扣分，無盡模式則是扣一條命
    levelErrors.value += 1
    totalErrors.value += 1
    combo.value = 0
    lastComboBonus.value = 0
    wrongFlash.value = new Set(wrongFlash.value).add(index)
    play('wrong')

    const limit = maxMissesFor(mode.value)
    if (limit !== null && totalErrors.value >= limit) {
      // 讓紅色閃完再跳結算，不然玩家看不到自己錯在哪
      runEnding.value = true
      later(() => finishRun('failed'), WRONG_FLASH_MS + 160)
      return
    }

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
    combo.value = 0
    bestCombo.value = 0
    levelComboBonus.value = 0
    targets.value = new Set()
    found.value = new Set()
    wrongFlash.value = new Set()
    hideHint()
    runEnding.value = false
    missStreak = 0
    todayKey.value = dateKey()
  }

  /** 本局累積要記的總格數，用來換算評價。 */
  const totalTilesSeen = computed(() => {
    const lastLevel = mode.value === 'endless' ? level.value : TOTAL_LEVELS
    let sum = 0
    for (let lv = 1; lv <= lastLevel; lv++) sum += tilesForLevel(lv, mode.value)
    return sum
  })

  const rank = computed(() => rankFor(totalErrors.value, totalTilesSeen.value))

  return {
    phase,
    mode,
    outcome,
    level,
    totalLevels,
    score,
    best,
    bestEndless,
    totalErrors,
    levelErrors,
    missesLeft,
    maxMisses: ENDLESS_MAX_MISSES,
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
    hintActive,
    boardInteractive,
    tilesThisLevel,
    memorizeMs,
    remaining,
    rank,
    todayKey,
    todayNumber,
    dailyRecord,
    dailyDone,
    streakCount,
    start,
    selectTile,
    reset,
  }
}
