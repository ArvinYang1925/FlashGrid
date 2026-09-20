import { DAILY_EPOCH } from './config'
import { hashSeed, mulberry32, type Rng } from './rng'

/** 一天的毫秒數。 */
const DAY_MS = 86_400_000

/** 取本地時區的 YYYY-MM-DD，讓「今天」跟玩家自己的桌曆一致。 */
export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 把 YYYY-MM-DD 換算成「從 1970-01-01 起算的第幾天」。
 * 全程走 UTC，純粹當成日曆算術，不受本地時區與日光節約影響。
 */
function dayIndex(key: string): number {
  const [year, month, day] = key.split('-').map(Number)
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS)
}

/** 把「第幾天」換回 YYYY-MM-DD。 */
function keyFromDayIndex(index: number): string {
  const date = new Date(index * DAY_MS)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/** 這天是第幾號題目；DAILY_EPOCH 當天是 #1。 */
export function dailyNumber(key: string): number {
  return dayIndex(key) - dayIndex(DAILY_EPOCH) + 1
}

/** 前一天的 key，用來判斷連續天數有沒有斷。 */
export function previousDateKey(key: string): string {
  return keyFromDayIndex(dayIndex(key) - 1)
}

/**
 * 某一天某一關專用的隨機來源。
 * 關卡也放進種子，所以同一天的 8 關各不相同，但每個人拿到的都一樣。
 */
export function dailyRng(key: string, level: number): Rng {
  return mulberry32(hashSeed(`flashgrid:${key}:${level}`))
}
