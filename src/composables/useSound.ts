import { ref } from 'vue'
import { STORAGE_KEYS } from '@/game/config'

export type SoundName = 'reveal' | 'hide' | 'correct' | 'wrong' | 'hint' | 'levelClear' | 'complete'

type Note = {
  /** 頻率（Hz）。 */
  freq: number
  /** 相對於音效開始的延遲（秒）。 */
  at: number
  /** 長度（秒）。 */
  dur: number
  /** 音量峰值。 */
  gain?: number
  type?: OscillatorType
}

/** 每個音效就是幾顆短音的組合，全部用振盪器即時合成，不需要任何音檔。 */
const PATTERNS: Record<SoundName, Note[]> = {
  reveal: [{ freq: 660, at: 0, dur: 0.08, gain: 0.18, type: 'triangle' }],
  hide: [{ freq: 300, at: 0, dur: 0.1, gain: 0.14, type: 'sine' }],
  correct: [
    { freq: 880, at: 0, dur: 0.07, gain: 0.2 },
    { freq: 1320, at: 0.06, dur: 0.1, gain: 0.16 },
  ],
  wrong: [{ freq: 150, at: 0, dur: 0.2, gain: 0.22, type: 'sawtooth' }],
  // 排在 wrong 的低音之後，兩個上行的柔音，像「叮叮」提醒一下
  hint: [
    { freq: 740, at: 0.22, dur: 0.09, gain: 0.14, type: 'triangle' },
    { freq: 988, at: 0.32, dur: 0.16, gain: 0.14, type: 'triangle' },
  ],
  levelClear: [
    { freq: 523.25, at: 0, dur: 0.1, gain: 0.18 },
    { freq: 659.25, at: 0.09, dur: 0.1, gain: 0.18 },
    { freq: 783.99, at: 0.18, dur: 0.18, gain: 0.18 },
  ],
  complete: [
    { freq: 523.25, at: 0, dur: 0.12, gain: 0.2 },
    { freq: 659.25, at: 0.11, dur: 0.12, gain: 0.2 },
    { freq: 783.99, at: 0.22, dur: 0.12, gain: 0.2 },
    { freq: 1046.5, at: 0.33, dur: 0.32, gain: 0.22 },
  ],
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.muted) === '1'
  } catch {
    return false
  }
}

const muted = ref(loadMuted())
let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  // 瀏覽器要求音訊必須由使用者互動觸發，所以延後到第一次播放才建立
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }

  if (ctx.state === 'suspended') void ctx.resume()

  return ctx
}

export function useSound() {
  function play(name: SoundName) {
    if (muted.value) return

    const audio = getContext()
    if (!audio) return

    const now = audio.currentTime

    for (const note of PATTERNS[name]) {
      const osc = audio.createOscillator()
      const amp = audio.createGain()
      const peak = note.gain ?? 0.18
      const start = now + note.at
      const end = start + note.dur

      osc.type = note.type ?? 'square'
      osc.frequency.setValueAtTime(note.freq, start)

      // 極短的 attack + 指數 decay，避免爆音
      amp.gain.setValueAtTime(0.0001, start)
      amp.gain.exponentialRampToValueAtTime(peak, start + 0.01)
      amp.gain.exponentialRampToValueAtTime(0.0001, end)

      osc.connect(amp).connect(audio.destination)
      osc.start(start)
      osc.stop(end + 0.02)
    }
  }

  function toggleMute() {
    muted.value = !muted.value

    try {
      localStorage.setItem(STORAGE_KEYS.muted, muted.value ? '1' : '0')
    } catch {
      // 存不進去不影響遊玩
    }
  }

  return { muted, play, toggleMute }
}
