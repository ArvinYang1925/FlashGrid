import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import {
  COUNTDOWN_MS,
  ENDLESS_MAX_MISSES,
  HINT_AFTER_MISSES,
  HINT_MS,
  LEVEL_CLEAR_MS,
  MEMORIZE_MS,
  TOTAL_CELLS,
  TOTAL_LEVELS,
  WRONG_FLASH_MS,
  type Mode,
} from '@/game/config'
import { memorizeMsForLevel } from '@/game/logic'
import { useGame } from './useGame'

/**
 * Math.random 固定回傳 0 時 pickTargets 會選到前 N 格（見 logic.test.ts），
 * 所以經典模式第 1 關的答案一定是 0、1、2、3；10 以後的格子拿來當「點錯」用。
 * 每日挑戰走的是固定種子，盤面要從畫面上讀，不能假設。
 */
const TARGET = [0, 1, 2, 3]
const WRONG = [10, 11, 12, 13, 14, 15]

/** 測試裡固定的「今天」：2026-09-20，剛好是每日挑戰 #8。 */
const TODAY = new Date(2026, 8, 20, 12, 0, 0)

type Game = ReturnType<typeof useGame>

function createGame(): Game {
  const game = effectScope().run(() => useGame())
  if (!game) throw new Error('useGame 沒有回傳狀態')

  return game
}

/** 目前畫面上亮著的格子，記憶階段用來讀出這一關的答案。 */
function litIndices(game: Game): number[] {
  return game.tileStates.value.flatMap((state, index) => (state === 'lit' ? [index] : []))
}

/** 從關卡開頭的倒數快轉到作答階段，順便把答案讀出來。 */
function revealTargets(game: Game, mode: Mode): number[] {
  vi.advanceTimersByTime(COUNTDOWN_MS)
  expect(game.phase.value).toBe('memorize')

  const targets = litIndices(game)
  vi.advanceTimersByTime(memorizeMsForLevel(game.level.value, mode))
  expect(game.phase.value).toBe('recall')

  return targets
}

/** 開一局並快轉到第 1 關的作答階段。 */
function startRecall(mode: Mode = 'classic'): Game {
  const game = createGame()
  game.start(mode)
  revealTargets(game, mode)

  return game
}

/** 完整打完一關（全部點對），停在下一關的倒數或結算畫面。 */
function clearLevel(game: Game, mode: Mode) {
  for (const index of revealTargets(game, mode)) game.selectTile(index)
  expect(game.phase.value).toBe('levelClear')
  vi.advanceTimersByTime(LEVEL_CLEAR_MS)
}

/** 連續點錯 n 次，每次用一個還沒點過的錯格（避開點錯後短暫鎖住的那格）。 */
function missTimes(game: Game, n: number, from = 0) {
  for (let i = 0; i < n; i++) game.selectTile(WRONG[from + i])
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useGame 連錯提示', () => {
  it('連錯還沒到 HINT_AFTER_MISSES 次，不會出提示', () => {
    const game = startRecall()

    missTimes(game, HINT_AFTER_MISSES - 1)

    expect(game.hintActive.value).toBe(false)
    expect(game.tileStates.value).not.toContain('hint')
  })

  it('連錯 HINT_AFTER_MISSES 次就亮提示，而且只亮還沒找到的正確格', () => {
    const game = startRecall()

    game.selectTile(TARGET[0])
    missTimes(game, HINT_AFTER_MISSES)

    expect(game.hintActive.value).toBe(true)

    const states = game.tileStates.value
    expect(states[TARGET[0]]).toBe('found')
    expect(states[TARGET[1]]).toBe('hint')
    expect(states[TARGET[2]]).toBe('hint')
    expect(states[TARGET[3]]).toBe('hint')
    expect(states[WRONG[HINT_AFTER_MISSES - 1]]).toBe('wrong')
    expect(states[TOTAL_CELLS - 1]).toBe('dark')
    expect(states.filter((s) => s === 'hint')).toHaveLength(TARGET.length - 1)
  })

  it('提示 HINT_MS 之後自動暗回去', () => {
    const game = startRecall()

    missTimes(game, HINT_AFTER_MISSES)
    vi.advanceTimersByTime(HINT_MS - 1)
    expect(game.hintActive.value).toBe(true)

    vi.advanceTimersByTime(1)
    expect(game.hintActive.value).toBe(false)
    expect(game.tileStates.value[TARGET[0]]).toBe('dark')
  })

  it('中間點對一格，連錯次數會重新計算', () => {
    const game = startRecall()

    missTimes(game, HINT_AFTER_MISSES - 1)
    game.selectTile(TARGET[0])
    missTimes(game, HINT_AFTER_MISSES - 1, HINT_AFTER_MISSES - 1)

    expect(game.hintActive.value).toBe(false)

    game.selectTile(WRONG[2 * (HINT_AFTER_MISSES - 1)])
    expect(game.hintActive.value).toBe(true)
  })

  it('提示過後連錯次數歸零，要再連錯 HINT_AFTER_MISSES 次才會再提示', () => {
    const game = startRecall()

    missTimes(game, HINT_AFTER_MISSES)
    vi.advanceTimersByTime(HINT_MS)
    expect(game.hintActive.value).toBe(false)

    missTimes(game, HINT_AFTER_MISSES - 1, HINT_AFTER_MISSES)
    expect(game.hintActive.value).toBe(false)

    game.selectTile(WRONG[2 * HINT_AFTER_MISSES - 1])
    expect(game.hintActive.value).toBe(true)
  })

  it('提示中點對格子會直接變成 found，找齊之後提示跟著收掉', () => {
    const game = startRecall()

    game.selectTile(TARGET[0])
    game.selectTile(TARGET[1])
    missTimes(game, HINT_AFTER_MISSES)
    expect(game.hintActive.value).toBe(true)

    game.selectTile(TARGET[2])
    expect(game.tileStates.value[TARGET[2]]).toBe('found')
    expect(game.hintActive.value).toBe(true)

    game.selectTile(TARGET[3])
    expect(game.phase.value).toBe('levelClear')
    expect(game.hintActive.value).toBe(false)
  })

  it('提示只影響畫面，失誤數照樣每次點錯都 +1', () => {
    const game = startRecall()

    missTimes(game, HINT_AFTER_MISSES + 1)

    expect(game.totalErrors.value).toBe(HINT_AFTER_MISSES + 1)
    expect(game.levelErrors.value).toBe(HINT_AFTER_MISSES + 1)
  })

  it('重新開始會清掉提示', () => {
    const game = startRecall()

    missTimes(game, HINT_AFTER_MISSES)
    expect(game.hintActive.value).toBe(true)

    game.start('classic')
    expect(game.hintActive.value).toBe(false)
    expect(game.tileStates.value).not.toContain('hint')
  })
})

describe('useGame 連擊', () => {
  it('每點對一格就加一，並記下整局最高', () => {
    const game = startRecall()

    game.selectTile(TARGET[0])
    expect(game.combo.value).toBe(1)

    game.selectTile(TARGET[1])
    expect(game.combo.value).toBe(2)
    expect(game.bestCombo.value).toBe(2)
  })

  it('點錯就把連擊打回零，但最高連擊留著', () => {
    const game = startRecall()

    game.selectTile(TARGET[0])
    game.selectTile(TARGET[1])
    game.selectTile(WRONG[0])

    expect(game.combo.value).toBe(0)
    expect(game.bestCombo.value).toBe(2)
  })

  it('連擊到門檻才有倍率，前兩格都還是 ×1', () => {
    const game = startRecall()

    game.selectTile(TARGET[0])
    expect(game.comboMultiplierNow.value).toBe(1)
    expect(game.lastComboBonus.value).toBe(0)

    game.selectTile(TARGET[1])
    expect(game.comboMultiplierNow.value).toBe(1)

    game.selectTile(TARGET[2])
    expect(game.comboMultiplierNow.value).toBeGreaterThan(1)
    expect(game.lastComboBonus.value).toBeGreaterThan(0)
  })

  it('連擊獎勵會併進該關得分', () => {
    const game = startRecall()

    for (const index of TARGET) game.selectTile(index)

    // 4 格 ×100 基礎 + 200 零失誤 + 300 速度滿分 + 第 3、4 格各 20 分連擊獎勵
    expect(game.lastLevelScore.value).toBe(940)
    expect(game.score.value).toBe(940)
  })

  it('連擊跨關不會斷，第 2 關開頭就能接著往上疊', () => {
    const game = createGame()
    game.start('classic')

    clearLevel(game, 'classic')

    expect(game.level.value).toBe(2)
    expect(game.combo.value).toBe(TARGET.length)

    revealTargets(game, 'classic')
    game.selectTile(0)
    expect(game.combo.value).toBe(TARGET.length + 1)
  })

  it('重新開局時連擊全部歸零', () => {
    const game = startRecall()

    game.selectTile(TARGET[0])
    game.selectTile(TARGET[1])

    game.start('classic')
    expect(game.combo.value).toBe(0)
    expect(game.bestCombo.value).toBe(0)
  })
})

describe('useGame 無盡模式', () => {
  it('一開始就有滿額的失誤次數', () => {
    const game = startRecall('endless')

    expect(game.missesLeft.value).toBe(ENDLESS_MAX_MISSES)
    expect(game.totalLevels.value).toBeNull()
  })

  it('每點錯一次就少一條命', () => {
    const game = startRecall('endless')

    game.selectTile(WRONG[0])
    expect(game.missesLeft.value).toBe(ENDLESS_MAX_MISSES - 1)
  })

  it('失誤用完就結束，而且結束前棋盤先鎖住', () => {
    const game = startRecall('endless')

    missTimes(game, ENDLESS_MAX_MISSES)

    expect(game.missesLeft.value).toBe(0)
    expect(game.boardInteractive.value).toBe(false)
    expect(game.phase.value).toBe('recall')

    vi.advanceTimersByTime(WRONG_FLASH_MS + 160)

    expect(game.phase.value).toBe('finished')
    expect(game.outcome.value).toBe('failed')
  })

  it('鎖住之後再點也不會多扣命', () => {
    const game = startRecall('endless')

    missTimes(game, ENDLESS_MAX_MISSES)
    game.selectTile(WRONG[ENDLESS_MAX_MISSES])

    expect(game.totalErrors.value).toBe(ENDLESS_MAX_MISSES)
  })

  it('結束時把撐到的關卡記成最佳紀錄', () => {
    const game = startRecall('endless')

    missTimes(game, ENDLESS_MAX_MISSES)
    vi.advanceTimersByTime(WRONG_FLASH_MS + 160)

    expect(game.bestEndless.value.level).toBe(1)
  })

  it('第一次玩沒有舊紀錄可破，不會喊刷新紀錄', () => {
    const game = startRecall('endless')

    missTimes(game, ENDLESS_MAX_MISSES)
    vi.advanceTimersByTime(WRONG_FLASH_MS + 160)

    expect(game.isNewBest.value).toBe(false)
  })

  it('已經有紀錄之後再打破，才算刷新紀錄', () => {
    const game = createGame()

    // 第一局：過了第 1 關，在第 2 關陣亡，留下「最佳第 2 關」
    game.start('endless')
    clearLevel(game, 'endless')
    revealTargets(game, 'endless')
    missTimes(game, ENDLESS_MAX_MISSES)
    vi.advanceTimersByTime(WRONG_FLASH_MS + 160)

    expect(game.bestEndless.value.level).toBe(2)
    expect(game.isNewBest.value).toBe(false)

    // 第二局：撐到第 3 關才陣亡，這次才算刷新
    game.start('endless')
    clearLevel(game, 'endless')
    clearLevel(game, 'endless')
    revealTargets(game, 'endless')
    missTimes(game, ENDLESS_MAX_MISSES)
    vi.advanceTimersByTime(WRONG_FLASH_MS + 160)

    expect(game.bestEndless.value.level).toBe(3)
    expect(game.isNewBest.value).toBe(true)
  })

  it('沒打破舊紀錄就不會覆寫', () => {
    const game = createGame()

    game.start('endless')
    clearLevel(game, 'endless')
    revealTargets(game, 'endless')
    missTimes(game, ENDLESS_MAX_MISSES)
    vi.advanceTimersByTime(WRONG_FLASH_MS + 160)
    const record = { ...game.bestEndless.value }

    // 第二局第 1 關就陣亡，紀錄要原封不動
    game.start('endless')
    revealTargets(game, 'endless')
    missTimes(game, ENDLESS_MAX_MISSES)
    vi.advanceTimersByTime(WRONG_FLASH_MS + 160)

    expect(game.bestEndless.value).toEqual(record)
    expect(game.isNewBest.value).toBe(false)
  })

  it('打完第 8 關不會停，會繼續往第 9 關走', () => {
    const game = createGame()
    game.start('endless')

    for (let i = 0; i < TOTAL_LEVELS; i++) clearLevel(game, 'endless')

    expect(game.phase.value).not.toBe('finished')
    expect(game.level.value).toBe(TOTAL_LEVELS + 1)
  })

  it('記憶時間一關比一關短', () => {
    const game = createGame()
    game.start('endless')

    const first = game.memorizeMs.value
    clearLevel(game, 'endless')

    expect(game.memorizeMs.value).toBeLessThan(first)
  })
})

describe('useGame 經典模式', () => {
  it('打完第 8 關就結算，而且是通關結束', () => {
    const game = createGame()
    game.start('classic')

    for (let i = 0; i < TOTAL_LEVELS; i++) clearLevel(game, 'classic')

    expect(game.phase.value).toBe('finished')
    expect(game.outcome.value).toBe('cleared')
    expect(game.level.value).toBe(TOTAL_LEVELS)
  })

  it('點錯再多也不會結束，只是扣分', () => {
    const game = startRecall('classic')

    missTimes(game, WRONG.length)

    expect(game.missesLeft.value).toBeNull()
    expect(game.phase.value).toBe('recall')
    expect(game.boardInteractive.value).toBe(true)
  })

  it('記憶時間每關都一樣', () => {
    const game = createGame()
    game.start('classic')

    expect(game.memorizeMs.value).toBe(MEMORIZE_MS)
    clearLevel(game, 'classic')
    expect(game.memorizeMs.value).toBe(MEMORIZE_MS)
  })
})

describe('useGame 每日挑戰', () => {
  it('編號跟著日期走', () => {
    const game = createGame()

    expect(game.todayKey.value).toBe('2026-09-20')
    expect(game.todayNumber.value).toBe(8)
  })

  it('同一天重開兩次，盤面一模一樣，而且不受 Math.random 影響', () => {
    const first = createGame()
    first.start('daily')
    const firstBoard = revealTargets(first, 'daily')

    vi.spyOn(Math, 'random').mockReturnValue(0.77)

    const second = createGame()
    second.start('daily')
    const secondBoard = revealTargets(second, 'daily')

    expect(secondBoard).toEqual(firstBoard)
  })

  it('不同天是不同盤面', () => {
    const today = createGame()
    today.start('daily')
    const todayBoard = revealTargets(today, 'daily')

    vi.setSystemTime(new Date(2026, 8, 21, 12, 0, 0))

    const tomorrow = createGame()
    tomorrow.start('daily')
    const tomorrowBoard = revealTargets(tomorrow, 'daily')

    expect(tomorrow.todayNumber.value).toBe(9)
    expect(tomorrowBoard).not.toEqual(todayBoard)
  })

  it('還沒玩完之前不算今天已完成', () => {
    const game = createGame()
    expect(game.dailyDone.value).toBe(false)

    game.start('daily')
    revealTargets(game, 'daily')
    expect(game.dailyDone.value).toBe(false)
  })

  it('全部打完才記成績，並開始算連續天數', () => {
    const game = createGame()
    game.start('daily')

    for (let i = 0; i < TOTAL_LEVELS; i++) clearLevel(game, 'daily')

    expect(game.phase.value).toBe('finished')
    expect(game.dailyDone.value).toBe(true)
    expect(game.streakCount.value).toBe(1)

    const record = game.dailyRecord.value
    expect(record?.key).toBe('2026-09-20')
    expect(record?.number).toBe(8)
    expect(record?.score).toBe(game.score.value)
    expect(record?.misses).toBe(game.totalErrors.value)
  })

  it('經典模式打完不會動到每日挑戰的紀錄', () => {
    const game = createGame()
    game.start('classic')

    for (let i = 0; i < TOTAL_LEVELS; i++) clearLevel(game, 'classic')

    expect(game.dailyRecord.value).toBeNull()
    expect(game.dailyDone.value).toBe(false)
  })
})
