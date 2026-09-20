/** 隨機來源，測試與每日挑戰會注入固定序列。 */
export type Rng = () => number

/**
 * FNV-1a 32 位元字串雜湊，把「日期＋關卡」這種字串換成一個種子。
 * 不需要密碼學強度，只要同樣的輸入永遠得到同樣的輸出。
 */
export function hashSeed(input: string): number {
  let hash = 2166136261 >>> 0

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

/**
 * mulberry32：32 位元的小型偽隨機產生器。
 * 同一個 seed 一定產生同一串數字，所以每日挑戰才能全世界同一盤。
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0

  return function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
