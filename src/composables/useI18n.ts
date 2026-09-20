import { computed, ref } from 'vue'
import { ENDLESS_MAX_MISSES, STORAGE_KEYS, TOTAL_LEVELS } from '@/game/config'

export type Locale = 'en' | 'zh'

const messages = {
  en: {
    title: 'FlashGrid',
    tagline: 'Remember the tiles. Then find them.',
    start: 'Start',
    level: 'Level',
    score: 'Score',
    best: 'Best',
    misses: 'Misses',
    lives: 'Lives',
    combo: 'Combo',
    getReady: 'Get ready…',
    memorize: 'Remember the color tiles',
    recall: 'Find the color tiles',
    hintShown: 'Look again!',
    levelClear: 'Level clear!',
    remaining: 'left',
    complete: 'All levels cleared!',
    gameOver: 'Out of lives',
    finalScore: 'Final score',
    totalMisses: 'Total misses',
    totalTime: 'Total time',
    bestCombo: 'Best combo',
    newBest: 'New best score!',
    playAgain: 'Play again',
    restart: 'Restart',
    menu: 'Menu',
    howToTitle: 'How to play',
    howTo1: 'Yellow tiles flash, then the board goes dark — tap every tile that was yellow.',
    howTo2: 'Miss twice in a row and the tiles you still need flash again as a hint.',
    howTo3: `Chain correct taps for a combo multiplier, up to ×3.`,
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    langLabel: 'Language',
    rank: 'Rank',
    chooseMode: 'Choose a mode',
    modeClassic: 'Classic',
    modeClassicHint: `${TOTAL_LEVELS} levels, a fresh board every time`,
    modeDaily: 'Daily challenge',
    modeDailyHint: 'Same board for everyone, once a day',
    modeEndless: 'Endless',
    modeEndlessHint: `More tiles, less time, ${ENDLESS_MAX_MISSES} lives`,
    dailyNo: 'Daily #{n}',
    dailyPlayed: 'Played today',
    dailyStreak: '{n}-day streak',
    dailyAgainTomorrow: 'A new board arrives tomorrow.',
    playedToday: "Today's result",
    levelReached: 'Reached level',
    bestLevel: 'Best level',
    saveCard: 'Save score card',
    savingCard: 'Drawing…',
    cardSaved: 'Saved!',
    cardFailed: 'Could not save',
  },
  zh: {
    title: 'FlashGrid 閃記方格',
    tagline: '記住亮起的格子，然後把它們找回來。',
    start: '開始遊戲',
    level: '關卡',
    score: '分數',
    best: '最高分',
    misses: '失誤',
    lives: '生命',
    combo: '連擊',
    getReady: '準備…',
    memorize: '記住亮起的格子',
    recall: '找出剛才的格子',
    hintShown: '再看一次！',
    levelClear: '過關！',
    remaining: '格未找到',
    complete: '全部通關！',
    gameOver: '生命用完了',
    finalScore: '最終分數',
    totalMisses: '總失誤',
    totalTime: '總耗時',
    bestCombo: '最高連擊',
    newBest: '刷新最高紀錄！',
    playAgain: '再玩一次',
    restart: '重新開始',
    menu: '回主選單',
    howToTitle: '玩法',
    howTo1: '黃色格子會先亮起，棋盤轉暗後把剛才亮過的格子全部點出來。',
    howTo2: '連續點錯 2 次，還沒找到的格子會再閃一次當提示。',
    howTo3: '連續點對會累積連擊倍率，最高 ×3。',
    soundOn: '音效開',
    soundOff: '音效關',
    langLabel: '語言',
    rank: '評價',
    chooseMode: '選擇模式',
    modeClassic: '經典模式',
    modeClassicHint: `共 ${TOTAL_LEVELS} 關，每次都是新盤面`,
    modeDaily: '每日挑戰',
    modeDailyHint: '每天一題，全世界同一盤',
    modeEndless: '無盡模式',
    modeEndlessHint: `格數愈來愈多、時間愈來愈短，${ENDLESS_MAX_MISSES} 條命`,
    dailyNo: '每日挑戰 #{n}',
    dailyPlayed: '今天已完成',
    dailyStreak: '連續 {n} 天',
    dailyAgainTomorrow: '明天會換新的一盤。',
    playedToday: '今天的成績',
    levelReached: '撐到第幾關',
    bestLevel: '最佳關卡',
    saveCard: '儲存成績卡',
    savingCard: '產生中…',
    cardSaved: '已儲存！',
    cardFailed: '儲存失敗',
  },
} as const

export type MessageKey = keyof (typeof messages)['en']

/** 文案裡的 {n} 之類的佔位字，用這個換掉。 */
export type Vars = Record<string, string | number>

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

function loadLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.locale)
    if (saved === 'en' || saved === 'zh') return saved
  } catch {
    // localStorage 可能被瀏覽器封鎖，忽略即可
  }

  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

// 模組層級的單一狀態，讓所有元件共用同一個語言設定
const locale = ref<Locale>(loadLocale())

export function useI18n() {
  function setLocale(next: Locale) {
    locale.value = next
    document.documentElement.lang = next === 'zh' ? 'zh-Hant' : 'en'

    try {
      localStorage.setItem(STORAGE_KEYS.locale, next)
    } catch {
      // 存不進去不影響遊玩
    }
  }

  function toggleLocale() {
    setLocale(locale.value === 'en' ? 'zh' : 'en')
  }

  const t = computed(
    () => (key: MessageKey, vars?: Vars) => interpolate(messages[locale.value][key], vars),
  )

  return { locale, setLocale, toggleLocale, t }
}
