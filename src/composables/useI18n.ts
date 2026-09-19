import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/game/config'

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
    getReady: 'Get ready…',
    memorize: 'Remember the color tiles',
    recall: 'Find the color tiles',
    hintShown: 'Look again!',
    levelClear: 'Level clear!',
    remaining: 'left',
    complete: 'All levels cleared!',
    finalScore: 'Final score',
    totalMisses: 'Total misses',
    totalTime: 'Total time',
    newBest: 'New best score!',
    playAgain: 'Play again',
    restart: 'Restart',
    howToTitle: 'How to play',
    howTo1: 'Yellow tiles flash for 3 seconds — memorize them.',
    howTo2: 'The board goes dark. Tap every tile that was yellow.',
    howTo3: 'A miss costs points, never a life. 8 levels, 4 to 11 tiles.',
    howTo4: 'Miss twice in a row and the tiles you still need flash again as a hint.',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    langLabel: 'Language',
    rank: 'Rank',
  },
  zh: {
    title: 'FlashGrid 閃記方格',
    tagline: '記住亮起的格子，然後把它們找回來。',
    start: '開始遊戲',
    level: '關卡',
    score: '分數',
    best: '最高分',
    misses: '失誤',
    getReady: '準備…',
    memorize: '記住亮起的格子',
    recall: '找出剛才的格子',
    hintShown: '再看一次！',
    levelClear: '過關！',
    remaining: '格未找到',
    complete: '全部通關！',
    finalScore: '最終分數',
    totalMisses: '總失誤',
    totalTime: '總耗時',
    newBest: '刷新最高分！',
    playAgain: '再玩一次',
    restart: '重新開始',
    howToTitle: '玩法',
    howTo1: '黃色格子會亮 3 秒，把位置記下來。',
    howTo2: '棋盤轉暗後，把剛才亮過的格子全部點出來。',
    howTo3: '點錯只扣分、不扣命。共 8 關，從 4 格到 11 格。',
    howTo4: '連續點錯 2 次，還沒找到的格子會再閃一次當提示。',
    soundOn: '音效開',
    soundOff: '音效關',
    langLabel: '語言',
    rank: '評價',
  },
} as const

export type MessageKey = keyof (typeof messages)['en']

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

  const t = computed(() => (key: MessageKey) => messages[locale.value][key])

  return { locale, setLocale, toggleLocale, t }
}
