import { describe, expect, it } from 'vitest'
import { hashSeed, mulberry32 } from './rng'

describe('hashSeed', () => {
  it('同樣的字串永遠得到同樣的種子', () => {
    expect(hashSeed('flashgrid:2026-09-20:1')).toBe(hashSeed('flashgrid:2026-09-20:1'))
  })

  it('不同字串得到不同種子', () => {
    const seeds = new Set(
      ['a', 'b', 'flashgrid:2026-09-20:1', 'flashgrid:2026-09-20:2'].map(hashSeed),
    )

    expect(seeds.size).toBe(4)
  })

  it('空字串也能算，而且是合法的 32 位元無號整數', () => {
    const seed = hashSeed('')

    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(2 ** 32)
  })
})

describe('mulberry32', () => {
  it('同一個種子產生同一串數字', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)

    for (let i = 0; i < 50; i++) expect(a()).toBe(b())
  })

  it('不同種子很快就分岔', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)

    expect(a()).not.toBe(b())
  })

  it('輸出永遠落在 [0, 1)', () => {
    const next = mulberry32(hashSeed('flashgrid'))

    for (let i = 0; i < 1000; i++) {
      const value = next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('分佈大致平均，不會一直卡在同一區間', () => {
    const next = mulberry32(99)
    const buckets = [0, 0, 0, 0]

    for (let i = 0; i < 4000; i++) buckets[Math.floor(next() * 4)] += 1

    for (const count of buckets) {
      expect(count).toBeGreaterThan(800)
      expect(count).toBeLessThan(1200)
    }
  })
})
