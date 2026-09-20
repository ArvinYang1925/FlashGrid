import {
  BASE_PER_TILE,
  COMBO_BONUS_PER_TILE,
  COMBO_TIERS,
  ENDLESS_MAX_MISSES,
  ENDLESS_MAX_TILES,
  ENDLESS_MEMORIZE_STEP_MS,
  ENDLESS_MIN_MEMORIZE_MS,
  ERROR_PENALTY,
  MAX_SPEED_BONUS,
  MEMORIZE_MS,
  PAR_MS_PER_TILE,
  PERFECT_BONUS,
  SPEED_DECAY_MS_PER_POINT,
  START_TILES,
  TOTAL_CELLS,
  TOTAL_LEVELS,
  type Mode,
} from './config'
import type { Rng } from './rng'

export type { Rng }

/**
 * 第 `level` 關要記住幾格。第 1 關 START_TILES 格，之後每關 +1。
 * 無盡模式會在 ENDLESS_MAX_TILES 打住。
 */
export function tilesForLevel(level: number, mode: Mode = 'classic'): number {
  const grown = START_TILES + (level - 1)
  return mode === 'endless' ? Math.min(grown, ENDLESS_MAX_TILES) : grown
}

/**
 * 第 `level` 關的記憶時間。只有無盡模式會愈來愈短，到下限就不再縮。
 */
export function memorizeMsForLevel(level: number, mode: Mode = 'classic'): number {
  if (mode !== 'endless') return MEMORIZE_MS

  const shortened = MEMORIZE_MS - (level - 1) * ENDLESS_MEMORIZE_STEP_MS
  return Math.max(ENDLESS_MIN_MEMORIZE_MS, shortened)
}

/** 這個模式共幾關；無盡模式沒有終點，回傳 null。 */
export function totalLevelsFor(mode: Mode): number | null {
  return mode === 'endless' ? null : TOTAL_LEVELS
}

/** 這一關是不是最後一關。無盡模式永遠不是。 */
export function isFinalLevel(level: number, mode: Mode = 'classic'): boolean {
  const total = totalLevelsFor(mode)
  return total !== null && level >= total
}

/** 這個模式最多能失誤幾次；null 代表不會因為失誤結束。 */
export function maxMissesFor(mode: Mode): number | null {
  return mode === 'endless' ? ENDLESS_MAX_MISSES : null
}

/** 連續答對 `streak` 格時的分數倍率。 */
export function comboMultiplier(streak: number): number {
  for (const tier of COMBO_TIERS) {
    if (streak >= tier.streak) return tier.multiplier
  }

  return 1
}

/** 這一格因為連擊多拿的分數；倍率還在 ×1 時是 0。 */
export function comboBonusFor(streak: number): number {
  return Math.round(COMBO_BONUS_PER_TILE * (comboMultiplier(streak) - 1))
}

/**
 * 從 0..total-1 之中隨機挑 `count` 個不重複的索引。
 *
 * 用部分 Fisher–Yates 洗牌：每次從剩餘區間抽一個換到前面，
 * 只做 count 次，因此不會有「重抽到已選過的格子」的無界迴圈。
 */
export function pickTargets(count: number, total = TOTAL_CELLS, rng: Rng = Math.random): number[] {
  const size = Math.max(0, Math.min(count, total))
  const pool = Array.from({ length: total }, (_, i) => i)

  for (let i = 0; i < size; i++) {
    const j = i + Math.floor(rng() * (total - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, size).sort((a, b) => a - b)
}

/**
 * 速度獎勵：在標準時間內完成拿滿分，之後線性遞減到 0。
 */
export function speedBonus(tiles: number, elapsedMs: number): number {
  const parMs = tiles * PAR_MS_PER_TILE
  if (elapsedMs <= parMs) return MAX_SPEED_BONUS

  const overshoot = elapsedMs - parMs
  const remaining = MAX_SPEED_BONUS - Math.floor(overshoot / SPEED_DECAY_MS_PER_POINT)
  return Math.max(0, remaining)
}

export interface LevelResult {
  /** 這一關要記住的格數。 */
  tiles: number
  /** 這一關點錯的次數。 */
  errors: number
  /** 從進入作答到找齊所有格子的耗時（毫秒）。 */
  elapsedMs: number
  /** 這一關累積的連擊獎勵分。 */
  comboBonus?: number
}

/**
 * 單關得分：基礎分 + 零失誤獎勵 + 速度獎勵 + 連擊獎勵 − 失誤扣分，最低 0 分。
 */
export function levelScore({ tiles, errors, elapsedMs, comboBonus = 0 }: LevelResult): number {
  const base = tiles * BASE_PER_TILE
  const perfect = errors === 0 ? PERFECT_BONUS : 0
  const penalty = errors * ERROR_PENALTY

  return Math.max(0, base + perfect + speedBonus(tiles, elapsedMs) + comboBonus - penalty)
}

/** 依正確率給一個 S/A/B/C 評價，用在結算畫面。 */
export function rankFor(totalErrors: number, totalTiles: number): 'S' | 'A' | 'B' | 'C' {
  if (totalErrors === 0) return 'S'

  const errorRate = totalErrors / Math.max(1, totalTiles)
  if (errorRate <= 0.15) return 'A'
  if (errorRate <= 0.4) return 'B'
  return 'C'
}
