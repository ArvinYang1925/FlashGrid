import { describe, expect, it } from 'vitest'
import { DAILY_EPOCH, TOTAL_CELLS } from './config'
import { dailyNumber, dailyRng, dateKey, previousDateKey } from './daily'
import { pickTargets, tilesForLevel } from './logic'

describe('dateKey', () => {
  it('用本地時區的年月日，補滿兩位數', () => {
    expect(dateKey(new Date(2026, 8, 20))).toBe('2026-09-20')
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('同一天的凌晨與深夜算同一個 key', () => {
    expect(dateKey(new Date(2026, 8, 20, 0, 0))).toBe(dateKey(new Date(2026, 8, 20, 23, 59)))
  })
})

describe('dailyNumber', () => {
  it('第一天是 #1', () => {
    expect(dailyNumber(DAILY_EPOCH)).toBe(1)
  })

  it('每過一天就 +1', () => {
    expect(dailyNumber('2026-09-14')).toBe(2)
    expect(dailyNumber('2026-09-20')).toBe(8)
  })

  it('跨月與跨年都算得對', () => {
    // 2026-09-13 到 2026-10-13 共 30 天
    expect(dailyNumber('2026-10-13')).toBe(31)
    // 2026-09-13 到 2027-01-01 共 110 天
    expect(dailyNumber('2027-01-01')).toBe(111)
  })
})

describe('previousDateKey', () => {
  it('回到前一天', () => {
    expect(previousDateKey('2026-09-20')).toBe('2026-09-19')
  })

  it('跨月、跨年、閏年都不會算錯', () => {
    expect(previousDateKey('2026-10-01')).toBe('2026-09-30')
    expect(previousDateKey('2027-01-01')).toBe('2026-12-31')
    expect(previousDateKey('2028-03-01')).toBe('2028-02-29')
  })

  it('跟 dailyNumber 一致：前一天的編號剛好少 1', () => {
    const key = '2026-11-05'
    expect(dailyNumber(previousDateKey(key))).toBe(dailyNumber(key) - 1)
  })
})

describe('dailyRng', () => {
  it('同一天同一關，抽到的盤面完全一樣', () => {
    const first = pickTargets(6, TOTAL_CELLS, dailyRng('2026-09-20', 3))
    const second = pickTargets(6, TOTAL_CELLS, dailyRng('2026-09-20', 3))

    expect(second).toEqual(first)
  })

  it('同一天的不同關卡是不同盤面', () => {
    const level1 = pickTargets(6, TOTAL_CELLS, dailyRng('2026-09-20', 1))
    const level2 = pickTargets(6, TOTAL_CELLS, dailyRng('2026-09-20', 2))

    expect(level2).not.toEqual(level1)
  })

  it('不同天是不同盤面', () => {
    const today = pickTargets(6, TOTAL_CELLS, dailyRng('2026-09-20', 1))
    const tomorrow = pickTargets(6, TOTAL_CELLS, dailyRng('2026-09-21', 1))

    expect(tomorrow).not.toEqual(today)
  })

  it('整局 8 關重跑兩次，每一關都一模一樣', () => {
    const run = () =>
      Array.from({ length: 8 }, (_, i) =>
        pickTargets(tilesForLevel(i + 1), TOTAL_CELLS, dailyRng('2026-09-20', i + 1)),
      )

    expect(run()).toEqual(run())
  })
})
