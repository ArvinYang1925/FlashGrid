import { describe, expect, it } from 'vitest'
import {
  BASE_PER_TILE,
  COMBO_BONUS_PER_TILE,
  COMBO_TIERS,
  ENDLESS_MAX_MISSES,
  ENDLESS_MAX_TILES,
  ENDLESS_MEMORIZE_STEP_MS,
  ENDLESS_MIN_MEMORIZE_MS,
  MAX_SPEED_BONUS,
  MEMORIZE_MS,
  PAR_MS_PER_TILE,
  PERFECT_BONUS,
  START_TILES,
  TOTAL_CELLS,
  TOTAL_LEVELS,
} from './config'
import {
  comboBonusFor,
  comboMultiplier,
  isFinalLevel,
  levelScore,
  maxMissesFor,
  memorizeMsForLevel,
  pickTargets,
  rankFor,
  speedBonus,
  tilesForLevel,
  totalLevelsFor,
} from './logic'

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

  it('每日挑戰跟經典一樣是 8 關', () => {
    expect(isFinalLevel(TOTAL_LEVELS, 'daily')).toBe(true)
  })

  it('無盡模式永遠不是最後一關', () => {
    expect(isFinalLevel(TOTAL_LEVELS, 'endless')).toBe(false)
    expect(isFinalLevel(999, 'endless')).toBe(false)
  })
})

describe('totalLevelsFor', () => {
  it('經典與每日有終點，無盡沒有', () => {
    expect(totalLevelsFor('classic')).toBe(TOTAL_LEVELS)
    expect(totalLevelsFor('daily')).toBe(TOTAL_LEVELS)
    expect(totalLevelsFor('endless')).toBeNull()
  })
})

describe('maxMissesFor', () => {
  it('只有無盡模式會因為失誤結束', () => {
    expect(maxMissesFor('classic')).toBeNull()
    expect(maxMissesFor('daily')).toBeNull()
    expect(maxMissesFor('endless')).toBe(ENDLESS_MAX_MISSES)
  })
})

describe('tilesForLevel（無盡模式）', () => {
  it('前期跟經典一樣每關 +1', () => {
    expect(tilesForLevel(1, 'endless')).toBe(START_TILES)
    expect(tilesForLevel(5, 'endless')).toBe(START_TILES + 4)
  })

  it('到上限就不再增加', () => {
    const capLevel = ENDLESS_MAX_TILES - START_TILES + 1

    expect(tilesForLevel(capLevel, 'endless')).toBe(ENDLESS_MAX_TILES)
    expect(tilesForLevel(capLevel + 50, 'endless')).toBe(ENDLESS_MAX_TILES)
  })

  it('格數上限仍然少於棋盤總格數', () => {
    expect(ENDLESS_MAX_TILES).toBeLessThan(TOTAL_CELLS)
  })
})

describe('memorizeMsForLevel', () => {
  it('經典與每日永遠是固定的記憶時間', () => {
    expect(memorizeMsForLevel(1)).toBe(MEMORIZE_MS)
    expect(memorizeMsForLevel(8)).toBe(MEMORIZE_MS)
    expect(memorizeMsForLevel(8, 'daily')).toBe(MEMORIZE_MS)
  })

  it('無盡模式每關縮短一點', () => {
    expect(memorizeMsForLevel(1, 'endless')).toBe(MEMORIZE_MS)
    expect(memorizeMsForLevel(2, 'endless')).toBe(MEMORIZE_MS - ENDLESS_MEMORIZE_STEP_MS)
    expect(memorizeMsForLevel(5, 'endless')).toBe(MEMORIZE_MS - 4 * ENDLESS_MEMORIZE_STEP_MS)
  })

  it('縮到下限就停住，不會變成 0 或負數', () => {
    expect(memorizeMsForLevel(100, 'endless')).toBe(ENDLESS_MIN_MEMORIZE_MS)
    expect(memorizeMsForLevel(100, 'endless')).toBeGreaterThan(0)
  })

  it('關卡愈後面，時間只會變短不會變長', () => {
    for (let level = 1; level < 30; level++) {
      expect(memorizeMsForLevel(level + 1, 'endless')).toBeLessThanOrEqual(
        memorizeMsForLevel(level, 'endless'),
      )
    }
  })
})

describe('comboMultiplier', () => {
  it('連擊還沒起來時是 ×1', () => {
    expect(comboMultiplier(0)).toBe(1)
    expect(comboMultiplier(1)).toBe(1)
    expect(comboMultiplier(2)).toBe(1)
  })

  it('跨過每個分段門檻就升一級', () => {
    for (const tier of COMBO_TIERS) {
      expect(comboMultiplier(tier.streak)).toBe(tier.multiplier)
    }
  })

  it('COMBO_TIERS 由高到低排好，比對才不會抓錯段', () => {
    for (let i = 1; i < COMBO_TIERS.length; i++) {
      expect(COMBO_TIERS[i].streak).toBeLessThan(COMBO_TIERS[i - 1].streak)
      expect(COMBO_TIERS[i].multiplier).toBeLessThan(COMBO_TIERS[i - 1].multiplier)
    }
  })

  it('連擊愈高倍率只會上升，而且有上限', () => {
    const highest = COMBO_TIERS[0].multiplier

    for (let streak = 0; streak < 60; streak++) {
      expect(comboMultiplier(streak + 1)).toBeGreaterThanOrEqual(comboMultiplier(streak))
      expect(comboMultiplier(streak)).toBeLessThanOrEqual(highest)
    }
  })
})

describe('comboBonusFor', () => {
  it('倍率還在 ×1 的時候不加分', () => {
    expect(comboBonusFor(0)).toBe(0)
    expect(comboBonusFor(2)).toBe(0)
  })

  it('加的分數就是基準分乘上超出 ×1 的部分', () => {
    const lowest = COMBO_TIERS[COMBO_TIERS.length - 1]

    expect(comboBonusFor(lowest.streak)).toBe(
      Math.round(COMBO_BONUS_PER_TILE * (lowest.multiplier - 1)),
    )
  })

  it('永遠是非負整數', () => {
    for (let streak = 0; streak < 40; streak++) {
      const bonus = comboBonusFor(streak)
      expect(Number.isInteger(bonus)).toBe(true)
      expect(bonus).toBeGreaterThanOrEqual(0)
    }
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

  it('沒給 comboBonus 時當作 0，維持原本的算法', () => {
    const withoutCombo = levelScore({ tiles: 5, errors: 1, elapsedMs: 2000 })
    const explicitZero = levelScore({ tiles: 5, errors: 1, elapsedMs: 2000, comboBonus: 0 })

    expect(explicitZero).toBe(withoutCombo)
  })

  it('連擊獎勵是直接加上去的', () => {
    const base = levelScore({ tiles: 5, errors: 0, elapsedMs: 1000 })
    const boosted = levelScore({ tiles: 5, errors: 0, elapsedMs: 1000, comboBonus: 120 })

    expect(boosted).toBe(base + 120)
  })

  it('連擊獎勵救不回扣到見底的分數，最低還是 0', () => {
    expect(levelScore({ tiles: 4, errors: 999, elapsedMs: 60_000, comboBonus: 80 })).toBe(0)
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
