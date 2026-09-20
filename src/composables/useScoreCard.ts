import { ref } from 'vue'
import { CARD_SIZE, drawScoreCard, type ScoreCardData } from '@/game/scoreCard'

export type CardStatus = 'idle' | 'working' | 'done' | 'failed'

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/** 有系統分享面板（多半是手機）就用分享，否則直接下載。 */
async function deliver(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (error) {
      // 使用者自己取消分享就算了，不要再退回下載打擾他
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function useScoreCard() {
  const status = ref<CardStatus>('idle')
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  function flash(next: CardStatus) {
    status.value = next
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      status.value = 'idle'
      resetTimer = null
    }, 2200)
  }

  /** 畫出成績卡並交給使用者（分享面板或下載）。 */
  async function save(data: ScoreCardData, fileName: string) {
    if (status.value === 'working') return

    status.value = 'working'

    try {
      const canvas = document.createElement('canvas')
      canvas.width = CARD_SIZE
      canvas.height = CARD_SIZE

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('這個瀏覽器不支援 canvas 2d')

      drawScoreCard(ctx, data)

      const blob = await toBlob(canvas)
      if (!blob) throw new Error('canvas 轉不出 PNG')

      await deliver(blob, fileName)
      flash('done')
    } catch {
      flash('failed')
    }
  }

  return { status, save }
}
