import {
  BASE_PER_TILE,
  ERROR_PENALTY,
  MAX_SPEED_BONUS,
  PAR_MS_PER_TILE,
  PERFECT_BONUS,
  SPEED_DECAY_MS_PER_POINT,
  START_TILES,
  TOTAL_CELLS,
  TOTAL_LEVELS,
} from './config'

/** 隨機來源，測試時可注入固定序列。 */
export type Rng = () => number

/**
 * 第 `level` 關要記住幾格。第 1 關 START_TILES 格，之後每關 +1。
 */
export function tilesForLevel(level: number): number {
  return START_TILES + (level - 1)
}

/** 這一關是不是最後一關。 */
export function isFinalLevel(level: number): boolean {
  return level >= TOTAL_LEVELS
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
}

/**
 * 單關得分：基礎分 + 零失誤獎勵 + 速度獎勵 − 失誤扣分，最低 0 分。
 */
export function levelScore({ tiles, errors, elapsedMs }: LevelResult): number {
  const base = tiles * BASE_PER_TILE
  const perfect = errors === 0 ? PERFECT_BONUS : 0
  const penalty = errors * ERROR_PENALTY

  return Math.max(0, base + perfect + speedBonus(tiles, elapsedMs) - penalty)
}

/** 依正確率給一個 S/A/B/C 評價，用在結算畫面。 */
export function rankFor(totalErrors: number, totalTiles: number): 'S' | 'A' | 'B' | 'C' {
  if (totalErrors === 0) return 'S'

  const errorRate = totalErrors / Math.max(1, totalTiles)
  if (errorRate <= 0.15) return 'A'
  if (errorRate <= 0.4) return 'B'
  return 'C'
}
