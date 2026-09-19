import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { COUNTDOWN_MS, HINT_AFTER_MISSES, HINT_MS, MEMORIZE_MS, TOTAL_CELLS } from '@/game/config'
import { useGame } from './useGame'

/**
 * Math.random 固定回傳 0 時 pickTargets 會選到前 N 格（見 logic.test.ts），
 * 所以第 1 關的答案一定是 0、1、2、3；10 以後的格子拿來當「點錯」用。
 */
const TARGET = [0, 1, 2, 3]
const WRONG = [10, 11, 12, 13, 14, 15]

type Game = ReturnType<typeof useGame>

/** 開一局並快轉到第 1 關的作答階段。 */
function startRecall(): Game {
  const game = effectScope().run(() => useGame())
  if (!game) throw new Error('useGame 沒有回傳狀態')

  game.start()
  vi.advanceTimersByTime(COUNTDOWN_MS + MEMORIZE_MS)
  expect(game.phase.value).toBe('recall')

  return game
}

/** 連續點錯 n 次，每次用一個還沒點過的錯格（避開點錯後短暫鎖住的那格）。 */
function missTimes(game: Game, n: number, from = 0) {
  for (let i = 0; i < n; i++) game.selectTile(WRONG[from + i])
}

describe('useGame 連錯提示', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

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

    game.start()
    expect(game.hintActive.value).toBe(false)
    expect(game.tileStates.value).not.toContain('hint')
  })
})
