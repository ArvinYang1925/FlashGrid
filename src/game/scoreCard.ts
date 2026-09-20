import { BOARD_SIZE } from './config'

/** 成績卡的邊長（正方形，適合直接貼社群）。 */
export const CARD_SIZE = 1080

export interface CardStat {
  label: string
  value: string
}

export interface ScoreCardData {
  /** 左上角的遊戲名稱。 */
  title: string
  /** 名稱下面那行，例如「每日挑戰 #8」。 */
  modeLabel: string
  /** 主數字的說明，例如「評價」或「撐到第幾關」。 */
  headlineLabel: string
  /** 主數字本身，例如「S」或「12」。 */
  headlineValue: string
  /** 分數的說明文字。 */
  scoreLabel: string
  /** 分數。 */
  score: number
  /** 下方三格小統計。 */
  stats: CardStat[]
  /** 最後一關的盤面，true 代表那格是答案；長度必須是 BOARD_SIZE²。 */
  board: boolean[]
  /** 卡片最下面印的網址。 */
  url: string
}

const BG = '#08080a'
const PANEL = '#131318'
const LINE = '#2a2a32'
const TEXT = '#f3f3f6'
const MUTED = '#8b8b95'
const ACCENT = '#f5b82e'
const ACCENT_DEEP = '#dd9a05'
const TILE_FACE = '#31313a'

const FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif'

function font(weight: number, size: number): string {
  return `${weight} ${size}px ${FONT_STACK}`
}

/** roundRect 在舊瀏覽器可能沒有，退回一般矩形也不影響閱讀。 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()

  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

/**
 * 把成績畫到 canvas 上。純繪圖，不碰 DOM 也不碰檔案，方便單獨測試。
 * 座標以 CARD_SIZE 為基準，呼叫端負責把 canvas 設成這個大小。
 */
export function drawScoreCard(ctx: CanvasRenderingContext2D, data: ScoreCardData): void {
  const pad = 80

  // 背景：純色打底，再蓋一層從上方灑下來的暖光
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE)

  const glow = ctx.createRadialGradient(CARD_SIZE / 2, -120, 0, CARD_SIZE / 2, -120, CARD_SIZE)
  glow.addColorStop(0, 'rgba(245, 184, 46, 0.16)')
  glow.addColorStop(1, 'rgba(245, 184, 46, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE)

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  // 標題與模式
  ctx.fillStyle = MUTED
  ctx.font = font(600, 40)
  ctx.fillText(data.title, pad, 126)

  ctx.fillStyle = ACCENT
  ctx.font = font(700, 48)
  ctx.fillText(data.modeLabel, pad, 192)

  drawBoard(ctx, data.board, CARD_SIZE - pad - 280, 92, 280)

  // 主數字
  ctx.fillStyle = MUTED
  ctx.font = font(600, 28)
  ctx.fillText(data.headlineLabel.toUpperCase(), pad, 372)

  const headlineGradient = ctx.createLinearGradient(pad, 390, pad, 520)
  headlineGradient.addColorStop(0, '#fff2c9')
  headlineGradient.addColorStop(1, ACCENT)
  ctx.fillStyle = headlineGradient
  ctx.font = font(800, 172)
  ctx.fillText(data.headlineValue, pad - 6, 516)

  // 分數
  ctx.fillStyle = MUTED
  ctx.font = font(600, 28)
  ctx.fillText(data.scoreLabel.toUpperCase(), pad, 608)

  ctx.fillStyle = TEXT
  ctx.font = font(750, 108)
  ctx.fillText(data.score.toLocaleString('en-US'), pad - 4, 706)

  drawStats(ctx, data.stats, pad, 766, CARD_SIZE - pad * 2, 150)

  // 頁尾網址
  ctx.textAlign = 'center'
  ctx.fillStyle = MUTED
  ctx.font = font(600, 30)
  ctx.fillText(data.url, CARD_SIZE / 2, 1004)
  ctx.textAlign = 'left'
}

/** 右上角的迷你盤面，亮的是最後一關的答案。 */
function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: boolean[],
  x: number,
  y: number,
  size: number,
) {
  const gap = 10
  const cell = (size - gap * (BOARD_SIZE - 1)) / BOARD_SIZE

  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    const row = Math.floor(i / BOARD_SIZE)
    const col = i % BOARD_SIZE
    const cx = x + col * (cell + gap)
    const cy = y + row * (cell + gap)

    if (board[i]) {
      const fill = ctx.createLinearGradient(cx, cy, cx + cell, cy + cell)
      fill.addColorStop(0, ACCENT)
      fill.addColorStop(1, ACCENT_DEEP)
      ctx.fillStyle = fill
    } else {
      ctx.fillStyle = TILE_FACE
    }

    roundRect(ctx, cx, cy, cell, cell, 12)
    ctx.fill()
  }
}

/** 底部三格統計。 */
function drawStats(
  ctx: CanvasRenderingContext2D,
  stats: CardStat[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (stats.length === 0) return

  const gap = 20
  const boxWidth = (width - gap * (stats.length - 1)) / stats.length

  stats.forEach((stat, index) => {
    const bx = x + index * (boxWidth + gap)

    ctx.fillStyle = PANEL
    roundRect(ctx, bx, y, boxWidth, height, 24)
    ctx.fill()

    ctx.strokeStyle = LINE
    ctx.lineWidth = 2
    roundRect(ctx, bx + 1, y + 1, boxWidth - 2, height - 2, 23)
    ctx.stroke()

    ctx.textAlign = 'center'
    const centerX = bx + boxWidth / 2

    ctx.fillStyle = MUTED
    ctx.font = font(600, 26)
    ctx.fillText(stat.label.toUpperCase(), centerX, y + 56)

    ctx.fillStyle = TEXT
    ctx.font = font(700, 52)
    ctx.fillText(stat.value, centerX, y + 116)
  })

  ctx.textAlign = 'left'
}
