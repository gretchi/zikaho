// Web Audio による音声エンジン
//  - 音声ファイルの読み込み
//  - 合成音声の前後の無音トリミングと音量の正規化（つなぎ目の違和感対策）
//  - クリップ列の隙間なし連続再生（間隔はこちらで制御）

import { ZONES } from './building'

export type BusName = 'receiver' | 'panel' | 'broadcast'

export type SeqItem = { clip: string; caption?: string; gain?: number } | { gap: number }

export interface Playback {
  stop(): void
  done: Promise<boolean>
}

interface ClipSpec {
  url: string
  /** 合成音声: 無音トリミング＋音量正規化 */
  voice?: boolean
}

const BASE = import.meta.env.BASE_URL

function clipSpecs(): Record<string, ClipSpec> {
  const specs: Record<string, ClipSpec> = {
    sig1_soft: { url: 'se/dai_1_keiho_attack_yowame.wav' },
    sig2: { url: 'se/dai_2_keiho.wav' },
    guide: { url: 'se/kidou.wav', voice: true },
    pi: { url: 'se/toa_pi.WAV' },
    pi4: { url: 'se/toa_pi_4.wav' },
    relay1: { url: 'se/relay_1.mp3' },
    relay2: { url: 'se/relay_2.mp3' },
  }
  const ja = ['detection_1', 'detection_3', 'occurrence_1', 'occurrence_3', 'falsealerm_1']
  const en = [...ja]
  for (const z of ZONES) {
    ja.push(z.jaDet, z.jaOcc)
    en.push(`detection_2_${z.en}`, `occurrence_2_${z.en}`)
  }
  for (const k of ja) specs[`ja/${k}`] = { url: `voice/ja/${k}.wav`, voice: true }
  for (const k of en) specs[`en/${k}`] = { url: `voice/en/${k}.mp3`, voice: true }
  return specs
}

/** 正規化の目標値（10ms 窓の有音部 RMS） */
const VOICE_TARGET_RMS = 0.11

export class AudioEngine {
  readonly ctx: AudioContext
  /** 音源の接続先（ユニティゲイン）。放送系はここでレベルを計測する */
  private buses: Record<BusName, GainNode>
  /** 音量（モニタ音量） */
  private volumes: Record<BusName, GainNode>
  private analyser: AnalyserNode
  private levelBuf: Float32Array<ArrayBuffer>
  private buffers = new Map<string, AudioBuffer>()
  readonly missing: string[] = []

  constructor() {
    this.ctx = new AudioContext()
    const master = this.ctx.createDynamicsCompressor()
    master.threshold.value = -6
    master.ratio.value = 8
    master.connect(this.ctx.destination)
    const mkVol = () => {
      const g = this.ctx.createGain()
      g.connect(master)
      return g
    }
    this.volumes = { receiver: mkVol(), panel: mkVol(), broadcast: mkVol() }
    const mkIn = (name: BusName) => {
      const g = this.ctx.createGain()
      g.connect(this.volumes[name])
      return g
    }
    this.buses = { receiver: mkIn('receiver'), panel: mkIn('panel'), broadcast: mkIn('broadcast') }
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.levelBuf = new Float32Array(this.analyser.fftSize)
    this.buses.broadcast.connect(this.analyser)
  }

  async load(onProgress?: (done: number, total: number) => void): Promise<void> {
    const specs = Object.entries(clipSpecs())
    let done = 0
    await Promise.all(
      specs.map(async ([key, spec]) => {
        try {
          const res = await fetch(BASE + spec.url)
          if (!res.ok) throw new Error(`${res.status}`)
          let buf = await this.ctx.decodeAudioData(await res.arrayBuffer())
          if (spec.voice) buf = this.processVoice(buf)
          this.buffers.set(key, buf)
        } catch (e) {
          console.warn('音声の読み込みに失敗:', spec.url, e)
          this.missing.push(spec.url)
        }
        onProgress?.(++done, specs.length)
      }),
    )
  }

  has(key: string): boolean {
    return this.buffers.has(key)
  }

  setVolume(bus: BusName, v: number) {
    this.volumes[bus].gain.setTargetAtTime(v, this.ctx.currentTime, 0.02)
  }

  /** 放送出力のレベル（dBFS, ピーク）。モニタ音量の影響を受けない */
  broadcastLevelDb(): number {
    this.analyser.getFloatTimeDomainData(this.levelBuf)
    let peak = 0
    for (const v of this.levelBuf) peak = Math.max(peak, Math.abs(v))
    return peak > 0 ? 20 * Math.log10(peak) : -Infinity
  }

  /**
   * 合成音声の後処理
   *  - 前後の無音を除去（区切りの間はシーケンス側で一定に制御する）
   *  - 有音部の RMS を揃える（階名部分だけ小さい、といった段差をなくす）
   *  - 切り口に短いフェード
   */
  private processVoice(buf: AudioBuffer): AudioBuffer {
    const sr = buf.sampleRate
    const ch = buf.numberOfChannels
    const n = buf.length
    const data = Array.from({ length: ch }, (_, i) => buf.getChannelData(i))
    const win = Math.max(1, Math.round(sr * 0.01))
    const nw = Math.ceil(n / win)
    const rms = new Float32Array(nw)
    let peak = 0
    for (let w = 0; w < nw; w++) {
      let s = 0
      let c = 0
      const end = Math.min(n, (w + 1) * win)
      for (const d of data) {
        for (let i = w * win; i < end; i++) {
          s += d[i]! * d[i]!
          c++
        }
      }
      rms[w] = Math.sqrt(s / Math.max(1, c))
      peak = Math.max(peak, rms[w]!)
    }
    if (peak <= 0) return buf
    const thr = peak * 0.04
    let first = -1
    let last = -1
    for (let w = 0; w < nw; w++) {
      if (rms[w]! > thr) {
        if (first < 0) first = w
        last = w
      }
    }
    if (first < 0) return buf
    const start = Math.max(0, first * win - Math.round(sr * 0.03))
    const end = Math.min(n, (last + 1) * win + Math.round(sr * 0.08))

    let s2 = 0
    let c = 0
    for (let w = first; w <= last; w++) {
      if (rms[w]! > peak * 0.15) {
        s2 += rms[w]! * rms[w]!
        c++
      }
    }
    const active = Math.sqrt(s2 / Math.max(1, c))
    let samplePeak = 0
    for (const d of data) for (let i = start; i < end; i++) samplePeak = Math.max(samplePeak, Math.abs(d[i]!))
    const gain = Math.min(VOICE_TARGET_RMS / active, 0.95 / Math.max(samplePeak, 1e-6))

    const len = end - start
    const out = this.ctx.createBuffer(ch, len, sr)
    const fade = Math.min(Math.round(sr * 0.006), Math.floor(len / 2))
    for (let k = 0; k < ch; k++) {
      const src = data[k]!
      const dst = out.getChannelData(k)
      for (let i = 0; i < len; i++) {
        let env = 1
        if (i < fade) env = i / fade
        else if (i > len - fade) env = (len - i) / fade
        dst[i] = src[start + i]! * gain * env
      }
    }
    return out
  }

  playOnce(bus: BusName, clip: string, gain = 1) {
    const buf = this.buffers.get(clip)
    if (!buf) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const g = this.ctx.createGain()
    g.gain.value = gain
    src.connect(g).connect(this.buses[bus])
    src.start()
  }

  /** クリップ列をサンプル精度で連続再生する */
  playSequence(bus: BusName, items: SeqItem[], onCaption?: (c: string) => void): Playback {
    const ctx = this.ctx
    const t0 = ctx.currentTime + 0.05
    let t = t0
    const sources: AudioBufferSourceNode[] = []
    const timers: number[] = []
    for (const item of items) {
      if ('gap' in item) {
        t += item.gap
        continue
      }
      const buf = this.buffers.get(item.clip)
      if (!buf) continue
      const src = ctx.createBufferSource()
      src.buffer = buf
      const g = ctx.createGain()
      g.gain.value = item.gain ?? 1
      src.connect(g).connect(this.buses[bus])
      src.start(t)
      sources.push(src)
      if (item.caption !== undefined && onCaption) {
        const caption = item.caption
        timers.push(window.setTimeout(() => onCaption(caption), (t - ctx.currentTime) * 1000))
      }
      t += buf.duration
    }
    let finished = false
    let resolve!: (v: boolean) => void
    const done = new Promise<boolean>((r) => (resolve = r))
    timers.push(
      window.setTimeout(
        () => {
          finished = true
          resolve(true)
        },
        (t - ctx.currentTime) * 1000,
      ),
    )
    return {
      done,
      stop() {
        if (finished) return
        finished = true
        timers.forEach((id) => clearTimeout(id))
        for (const s of sources) {
          try {
            s.stop()
          } catch {
            /* not started */
          }
        }
        resolve(false)
      },
    }
  }
}
