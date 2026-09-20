/** 棋盤邊長（固定 5×5）。 */
export const BOARD_SIZE = 5

/** 棋盤總格數。 */
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE

/** 第 1 關要記住的格子數。 */
export const START_TILES = 4

/** 經典與每日挑戰一局共 8 關：4 → 11 格。 */
export const TOTAL_LEVELS = 8

/** 記憶階段長度（毫秒）。無盡模式會從這個值往下縮。 */
export const MEMORIZE_MS = 3000

/** 記憶階段開始前的倒數提示長度（毫秒）。 */
export const COUNTDOWN_MS = 600

/** 點錯之後紅色提示殘留的時間（毫秒）。 */
export const WRONG_FLASH_MS = 420

/** 同一關「連續」點錯這麼多次，就把還沒找到的格子再閃一次當提示；點對就重新計算。 */
export const HINT_AFTER_MISSES = 2

/** 提示亮起的時間（毫秒）。要比翻牌動畫（--flip-duration）長，格子才來得及翻開讓人看到。 */
export const HINT_MS = 900

/** 過關動畫停留時間（毫秒）。 */
export const LEVEL_CLEAR_MS = 900

/* ---- 遊戲模式 ---- */

/**
 * classic  自由練習，8 關，每次都是新盤面
 * daily    每日挑戰，用日期當種子，同一天全世界同一盤，每天記一次成績
 * endless  無盡模式，格數一路加、記憶時間一路縮，失誤用完就結束
 */
export type Mode = 'classic' | 'daily' | 'endless'

/** 開始畫面上的模式順序。 */
export const MODES = ['classic', 'daily', 'endless'] as const

/* ---- 無盡模式 ---- */

/** 格數上限。再往上亮格會多到變成「記暗格」，難度反而下降。 */
export const ENDLESS_MAX_TILES = 18

/** 每過一關，記憶時間縮短這麼多毫秒。 */
export const ENDLESS_MEMORIZE_STEP_MS = 150

/** 記憶時間的下限，到這裡就不再縮。 */
export const ENDLESS_MIN_MEMORIZE_MS = 1500

/** 一整局可以失誤幾次，用完就結束。 */
export const ENDLESS_MAX_MISSES = 3

/* ---- 每日挑戰 ---- */

/** 每日挑戰的第 1 天，用來算 # 編號。 */
export const DAILY_EPOCH = '2026-09-13'

/* ---- 連擊 ---- */

/**
 * 連擊倍率分段：連續答對達到 streak 格就套用該倍率，由高到低比對。
 * 倍率只影響額外的連擊獎勵分，基礎分與速度獎勵完全不動。
 */
export const COMBO_TIERS = [
  { streak: 12, multiplier: 3 },
  { streak: 8, multiplier: 2.5 },
  { streak: 5, multiplier: 2 },
  { streak: 3, multiplier: 1.5 },
] as const

/** 連擊獎勵基準：每答對一格拿 COMBO_BONUS_PER_TILE ×（倍率 − 1）分。 */
export const COMBO_BONUS_PER_TILE = 40

/** 連擊要到幾倍才值得在畫面上跳出來。 */
export const COMBO_SHOW_FROM = 3

/* ---- 計分參數 ---- */

/** 每記住一格的基礎分。 */
export const BASE_PER_TILE = 100

/** 該關零失誤的額外獎勵。 */
export const PERFECT_BONUS = 200

/** 每點錯一次扣的分數（只扣分，不扣生命）。 */
export const ERROR_PENALTY = 50

/** 速度獎勵上限。 */
export const MAX_SPEED_BONUS = 300

/** 每格的「標準作答時間」，在此之內可拿滿速度獎勵。 */
export const PAR_MS_PER_TILE = 900

/** 超過標準時間後，每多這麼多毫秒就少 1 分速度獎勵。 */
export const SPEED_DECAY_MS_PER_POINT = 20

/** 分享與成績卡上印的網址。 */
export const SITE_URL = 'arvinyang1925.github.io/FlashGrid'

/** localStorage 用到的 key。 */
export const STORAGE_KEYS = {
  best: 'flashgrid:best',
  bestEndless: 'flashgrid:endless:best',
  dailyResult: 'flashgrid:daily:result',
  dailyStreak: 'flashgrid:daily:streak',
  locale: 'flashgrid:locale',
  muted: 'flashgrid:muted',
} as const
