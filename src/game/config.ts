/** 棋盤邊長（固定 5×5）。 */
export const BOARD_SIZE = 5

/** 棋盤總格數。 */
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE

/** 第 1 關要記住的格子數。 */
export const START_TILES = 4

/** 一局共 8 關：4 → 11 格。 */
export const TOTAL_LEVELS = 8

/** 記憶階段長度（毫秒）。 */
export const MEMORIZE_MS = 3000

/** 記憶階段開始前的倒數提示長度（毫秒）。 */
export const COUNTDOWN_MS = 600

/** 點錯之後紅色提示殘留的時間（毫秒）。 */
export const WRONG_FLASH_MS = 420

/** 過關動畫停留時間（毫秒）。 */
export const LEVEL_CLEAR_MS = 900

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

/** localStorage 用到的 key。 */
export const STORAGE_KEYS = {
  best: 'flashgrid:best',
  locale: 'flashgrid:locale',
  muted: 'flashgrid:muted',
} as const
