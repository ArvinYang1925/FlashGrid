import { describe, expect, it } from 'vitest'
import {
  BASE_PER_TILE,
  MAX_SPEED_BONUS,
  PAR_MS_PER_TILE,
  PERFECT_BONUS,
  START_TILES,
  TOTAL_CELLS,
  TOTAL_LEVELS,
} from './config'
import { isFinalLevel, levelScore, pickTargets, rankFor, speedBonus, tilesForLevel } from './logic'

describe('tilesForLevel', () => {
  it('第 1 關是 START_TILES 格，之後每關 +1', () => {
    expect(tilesForLevel(1)).toBe(START_TILES)
    expect(tilesForLevel(2)).toBe(START_TILES + 1)
    expect(tilesForLevel(TOTAL_LEVELS)).toBe(START_TILES + TOTAL_LEVELS - 1)
  })

  it('最後一關的格數仍少於棋盤總格數', () => {
    expect(tilesForLevel(TOTAL_LEVELS)).toBeLessThan(TOTAL_CELLS)
  })
})

describe('isFinalLevel', () => {
  it('只在最後一關為 true', () => {
    expect(isFinalLevel(TOTAL_LEVELS - 1)).toBe(false)
    expect(isFinalLevel(TOTAL_LEVELS)).toBe(true)
  })
})

describe('pickTargets', () => {
  it('回傳指定數量、不重複、且遞增排序的索引', () => {
    const picked = pickTargets(7)

    expect(picked).toHaveLength(7)
    expect(new Set(picked).size).toBe(7)
    expect([...picked].sort((a, b) => a - b)).toEqual(picked)
  })

  it('所有索引都落在棋盤範圍內', () => {
    for (let run = 0; run < 200; run++) {
      for (const index of pickTargets(11)) {
        expect(index).toBeGreaterThanOrEqual(0)
        expect(index).toBeLessThan(TOTAL_CELLS)
      }
    }
  })

  it('要求數量超過總格數時，最多只回傳總格數', () => {
    expect(pickTargets(99)).toHaveLength(TOTAL_CELLS)
  })

  it('要求 0 格時回傳空陣列', () => {
    expect(pickTargets(0)).toEqual([])
  })

  it('rng 永遠回傳 0 時，取到的是前 count 個索引', () => {
    // rng() === 0 讓部分洗牌每次都選中「剩餘區間的第一個」，即原地不動。
    expect(pickTargets(3, TOTAL_CELLS, () => 0)).toEqual([0, 1, 2])
  })

  it('rng 逼近 1 時不會越界', () => {
    const picked = pickTargets(5, TOTAL_CELLS, () => 0.999999)

    expect(picked).toHaveLength(5)
    expect(Math.max(...picked)).toBeLessThan(TOTAL_CELLS)
  })
})

describe('speedBonus', () => {
  it('在標準時間內拿滿分', () => {
    expect(speedBonus(4, 0)).toBe(MAX_SPEED_BONUS)
    expect(speedBonus(4, 4 * PAR_MS_PER_TILE)).toBe(MAX_SPEED_BONUS)
  })

  it('超時後遞減', () => {
    const par = 4 * PAR_MS_PER_TILE
    expect(speedBonus(4, par + 2000)).toBeLessThan(MAX_SPEED_BONUS)
    expect(speedBonus(4, par + 4000)).toBeLessThan(speedBonus(4, par + 2000))
  })

  it('拖太久時歸零，不會變成負分', () => {
    expect(speedBonus(4, 10 * 60 * 1000)).toBe(0)
  })

  it('格數越多，標準時間越寬鬆', () => {
    expect(speedBonus(11, 9000)).toBeGreaterThan(speedBonus(4, 9000))
  })
})

describe('levelScore', () => {
  it('零失誤且夠快時 = 基礎分 + 零失誤獎勵 + 速度滿分', () => {
    const score = levelScore({ tiles: 4, errors: 0, elapsedMs: 1000 })

    expect(score).toBe(4 * BASE_PER_TILE + PERFECT_BONUS + MAX_SPEED_BONUS)
  })

  it('有失誤就拿不到零失誤獎勵，而且要扣分', () => {
    const perfect = levelScore({ tiles: 6, errors: 0, elapsedMs: 1000 })
    const sloppy = levelScore({ tiles: 6, errors: 2, elapsedMs: 1000 })

    expect(sloppy).toBeLessThan(perfect)
  })

  it('失誤再多也不會出現負分', () => {
    expect(levelScore({ tiles: 4, errors: 999, elapsedMs: 60_000 })).toBe(0)
  })

  it('格數越多，同樣表現下分數越高', () => {
    const small = levelScore({ tiles: 4, errors: 1, elapsedMs: 3000 })
    const big = levelScore({ tiles: 10, errors: 1, elapsedMs: 3000 })

    expect(big).toBeGreaterThan(small)
  })
})

describe('rankFor', () => {
  it('全對給 S', () => {
    expect(rankFor(0, 60)).toBe('S')
  })

  it('失誤率越高評價越低', () => {
    expect(rankFor(5, 60)).toBe('A')
    expect(rankFor(20, 60)).toBe('B')
    expect(rankFor(40, 60)).toBe('C')
  })

  it('總格數為 0 時不會除以零', () => {
    expect(rankFor(3, 0)).toBe('C')
  })
})
