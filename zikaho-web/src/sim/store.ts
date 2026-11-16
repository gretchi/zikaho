// シミュレーターの状態と動作ロジック
//
// 受信機（P型1級）
//   感知器・発信機の作動 → 火災灯・地区表示灯（主音響・地区音響は素材がないため表示のみ）
//   移報 → 非常放送設備へ回線ごとの火災信号を送る（移報停止で遮断）
//
// 非常放送設備（自火報連動）
//   火災信号（感知器・発信機とも）→ 感知器発報放送（第1シグナル＋女声）×2 を1ブロックとして繰り返す
//                         ブロックの合間に操作部の音声ガイド、火災放送移行タイマー起動
//                         別回線の信号は鳴動区域を追加するだけ（女声のまま）
//   火災SW / タイマー満了 → 火災放送（[第1シグナル＋男声]×2＋第2シグナル）
//   非火災SW            → 非火災報放送（第1シグナル＋女声）×2 で停止
//   火災放送中に一定時間経過 or 新たな火災信号 → 全区域鳴動
//   地区ベル（表示のみ）: 放送の出力中とマイク使用中は一時停止（ベルカット）

import { reactive, watch } from 'vue'
import { AudioEngine, type Playback, type SeqItem } from './audio'
import {
  DEVICES,
  RECEIVER_LINES,
  ZONE_IDS,
  ZONES,
  zoneByLine,
  zoneDef,
  zonedAreas,
  type ZoneId,
} from './building'

// ---------------------------------------------------------------- state

export interface ZoneState {
  fire: boolean
  test: boolean
  station: boolean
  broken: boolean
  order: number
}

export type AmpMode = 'idle' | 'detection' | 'fire' | 'nonfire'

export interface LogEntry {
  time: string
  text: string
  kind: 'fire' | 'info' | 'op'
}

export const state = reactive({
  ready: false,
  loading: { done: 0, total: 0 },
  now: Date.now(),
  settings: {
    transferSec: 180,
    allAreaSec: 300,
    zoned: true,
    english: true,
    volReceiver: 0.35,
    volPanel: 0.8,
    volBroadcast: 0.9,
  },
  devices: Object.fromEntries(DEVICES.map((d) => [d.id, { active: false, latched: false }])) as Record<
    string,
    { active: boolean; latched: boolean }
  >,
  receiver: {
    acPower: true,
    zones: Object.fromEntries(
      ZONE_IDS.map((id) => [id, { fire: false, test: false, station: false, broken: false, order: 0 }]),
    ) as Record<ZoneId, ZoneState>,
    sw: {
      mainStop: false,
      areaStop: false,
      transferStop: false,
      fireTest: false,
      contTest: false,
      autoRestore: false,
    },
    line: 1,
    batteryTest: false,
    log: [] as LogEntry[],
  },
  amp: {
    mode: 'idle' as AmpMode,
    /** メッセージに入れる出火場所 */
    origin: null as ZoneId | null,
    sources: [] as ZoneId[],
    stations: [] as ZoneId[],
    manual: [] as ZoneId[],
    allArea: false,
    areas: [] as ZoneId[],
    startedAt: 0,
    transferAt: null as number | null,
    allAt: null as number | null,
    mic: false,
    guide: false,
    playing: false,
    /** 放送を出力中（ベルカット中） */
    onAir: false,
    caption: '',
  },
})

const engine: { a: AudioEngine | null } = { a: null }
let fireOrder = 0

// ---------------------------------------------------------------- helpers

function hhmmss(d = new Date()): string {
  return d.toTimeString().slice(0, 8)
}

function log(text: string, kind: LogEntry['kind'] = 'info') {
  state.receiver.log.unshift({ time: hhmmss(), text, kind })
  if (state.receiver.log.length > 40) state.receiver.log.pop()
}

function sfx(clip: string, bus: 'panel' | 'receiver' = 'panel', gain = 1) {
  engine.a?.playOnce(bus, clip, gain)
}

/** 放送出力レベル（dBFS）。音声エンジン未初期化なら -Infinity */
export function broadcastLevelDb(): number {
  return engine.a ? engine.a.broadcastLevelDb() : -Infinity
}

export function anyFire(): boolean {
  return ZONE_IDS.some((id) => state.receiver.zones[id].fire)
}

export function switchCaution(): boolean {
  const sw = state.receiver.sw
  return sw.mainStop || sw.areaStop || sw.transferStop || sw.fireTest || sw.contTest || sw.autoRestore
}

/** 地区ベル（音声素材がないため表示のみ）: 放送出力中・マイク使用中は一時停止 */
export function bellState(): 'off' | 'ring' | 'cut' {
  if (!anyFire() || state.receiver.sw.areaStop) return 'off'
  return state.amp.onAir || state.amp.mic ? 'cut' : 'ring'
}

export function stationLamp(zone: ZoneId): boolean {
  return state.receiver.zones[zone].station
}

// ---------------------------------------------------------------- receiver

/** 受信機へ火災信号が入る */
function receiverSignal(zone: ZoneId, opts: { station?: boolean; test?: boolean } = {}) {
  const z = state.receiver.zones[zone]
  const def = zoneDef(zone)
  const newZone = !z.fire
  const newStation = !!opts.station && !z.station
  if (!newZone && !newStation) return

  if (newZone) {
    z.fire = true
    z.test = !!opts.test
    z.order = ++fireOrder
    // 停止中に新たな火災信号 → 音響停止スイッチを定位に戻して再鳴動
    state.receiver.sw.mainStop = false
    state.receiver.sw.areaStop = false
    sfx('relay1', 'receiver', 0.8)
  }
  if (newStation) z.station = true
  log(
    `${opts.test ? '[試験] ' : ''}火災 ${def.line}回線 ${def.label}${opts.station ? '（発信機）' : ''}`,
    opts.test ? 'info' : 'fire',
  )

  if (!state.receiver.sw.transferStop) ampSignal(zone, !!opts.station)
}

/** 感知器を作動させてから受信機が火災信号を受けるまでの時間（発信機は即時） */
const DETECTOR_SIGNAL_DELAY_MS = 2000
const deviceTimers = new Map<string, number>()

export function clickDevice(id: string) {
  const dev = state.devices[id]!
  const def = DEVICES.find((d) => d.id === id)!
  dev.active = !dev.active
  window.clearTimeout(deviceTimers.get(id))
  deviceTimers.delete(id)
  if (!dev.active) {
    log(def.kind === 'station' ? `${def.label} 押しボタン復旧` : `${def.label} 煙・熱 除去`, 'op')
    return
  }
  const fire = () => {
    deviceTimers.delete(id)
    if (!dev.active) return
    if (state.receiver.zones[def.zone].broken) {
      log(`${def.label} 作動（回線断線のため受信できず）`, 'op')
      return
    }
    if (def.kind !== 'station') dev.latched = true
    receiverSignal(def.zone, { station: def.kind === 'station' })
  }
  if (def.kind === 'station') fire()
  else deviceTimers.set(id, window.setTimeout(fire, DETECTOR_SIGNAL_DELAY_MS))
}

export function toggleSwitch(key: keyof typeof state.receiver.sw) {
  const sw = state.receiver.sw
  sw[key] = !sw[key]
  sfx('relay2', 'receiver', 0.5)
  const names: Record<keyof typeof sw, string> = {
    mainStop: '主音響停止',
    areaStop: '地区音響停止',
    transferStop: '移報停止',
    fireTest: '火災試験',
    contTest: '導通試験',
    autoRestore: '試験復旧',
  }
  log(`${names[key]} スイッチ ${sw[key] ? '操作' : '定位'}`, 'op')
  if (key === 'fireTest' && sw.fireTest) testCurrentLine()
}

export function selectLine(delta: number) {
  const r = state.receiver
  r.line = ((r.line - 1 + delta + RECEIVER_LINES) % RECEIVER_LINES) + 1
  sfx('pi', 'receiver', 0.4)
  if (r.sw.fireTest) testCurrentLine()
}

function testCurrentLine() {
  const def = zoneByLine(state.receiver.line)
  if (!def) return
  receiverSignal(def.id, { test: true })
  if (state.receiver.sw.autoRestore) {
    const id = def.id
    window.setTimeout(() => {
      const z = state.receiver.zones[id]
      if (z.fire && z.test && state.receiver.sw.autoRestore) {
        z.fire = false
        z.test = false
        log(`[試験] ${def.line}回線 自動復旧`)
      }
    }, 3000)
  }
}

export function continuityOk(): boolean {
  const r = state.receiver
  if (!r.sw.contTest) return false
  const def = zoneByLine(r.line)
  return !!def && !r.zones[def.id].broken
}

export function fireRestore() {
  const r = state.receiver
  sfx('relay2', 'receiver')
  for (const id of ZONE_IDS) {
    const z = r.zones[id]
    z.fire = false
    z.test = false
    z.station = false
  }
  for (const d of Object.values(state.devices)) d.latched = false
  log('火災復旧', 'op')
  // 煙が残っている感知器・押されたままの発信機・火災試験中の回線は再発報する
  window.setTimeout(() => {
    for (const def of DEVICES) {
      const d = state.devices[def.id]!
      if (!d.active || r.zones[def.zone].broken) continue
      if (def.kind !== 'station') d.latched = true
      receiverSignal(def.zone, { station: def.kind === 'station' })
    }
    if (r.sw.fireTest) testCurrentLine()
  }, 1500)
}

export function setBroken(zone: ZoneId, broken: boolean) {
  state.receiver.zones[zone].broken = broken
  log(`${zoneDef(zone).label} 回線 ${broken ? '断線（模擬）' : '断線解除'}`, 'op')
}

export function setAcPower(on: boolean) {
  state.receiver.acPower = on
  log(on ? '交流電源 復電' : '停電 → 予備電源へ切替', 'op')
}

// ---------------------------------------------------------------- amp

function recomputeAreas() {
  const a = state.amp
  const auto = !state.settings.zoned || a.allArea ? ZONE_IDS : zonedAreas(a.sources)
  let set = new Set<ZoneId>([...auto, ...a.manual])
  // 発報を伴わない手動起動で区域未選択なら全館
  if (set.size === 0 && (a.mode === 'fire' || a.mic)) set = new Set(ZONE_IDS)
  if (a.mode === 'idle') set = a.mic ? set : new Set()
  // 非火災報放送の終了後は鳴動区域なし
  if (a.mode === 'nonfire' && !a.playing) set = a.mic ? set : new Set()
  const next = ZONE_IDS.filter((id) => set.has(id))
  if (next.join() !== a.areas.join()) sfx('relay1', 'panel', 0.6)
  a.areas = next
}

function ampSignal(zone: ZoneId, station: boolean) {
  const a = state.amp
  const now = Date.now()
  const isNewZone = !a.sources.includes(zone)
  if (isNewZone) a.sources.push(zone)
  if (station && !a.stations.includes(zone)) a.stations.push(zone)

  switch (a.mode) {
    case 'idle':
    case 'nonfire':
      a.origin = zone
      a.startedAt = now
      a.allArea = false
      startDetection()
      break
    case 'detection':
      // 発信機・別回線の信号でも初報は女声のまま。鳴動区域だけ追加する
      if (isNewZone) recomputeAreas()
      break
    case 'fire':
      if (isNewZone && state.settings.zoned && !a.allArea) {
        a.allArea = true
        log('非常放送: 新たな火災信号 → 全区域鳴動')
      }
      recomputeAreas()
      break
  }
}

function startDetection() {
  const a = state.amp
  a.mode = 'detection'
  a.transferAt = a.startedAt + state.settings.transferSec * 1000
  a.allAt = a.startedAt + Math.max(state.settings.allAreaSec, state.settings.transferSec) * 1000
  a.guide = true
  log('非常放送: 感知器発報放送 起動')
  recomputeAreas()
  restartProgram()
}

function startFire(reason: string) {
  const a = state.amp
  if (!a.startedAt) a.startedAt = Date.now()
  a.mode = 'fire'
  a.transferAt = null
  a.allAt = a.startedAt + Math.max(state.settings.allAreaSec, state.settings.transferSec) * 1000
  a.guide = false
  log(`非常放送: 火災放送（${reason}）`, 'fire')
  recomputeAreas()
  restartProgram()
}

export function ampButton(
  key: 'fire' | 'nonfire' | 'all' | 'reset' | 'mic' | 'guideStop',
) {
  const a = state.amp
  sfx('pi', 'panel')
  switch (key) {
    case 'fire':
      if (a.mode === 'fire') return
      if (a.mode === 'idle' || a.mode === 'nonfire') {
        a.startedAt = Date.now()
        if (a.mode === 'idle') a.origin = null
      }
      startFire('火災スイッチ')
      break
    case 'nonfire':
      if (a.mode !== 'detection' && a.mode !== 'fire') return
      a.mode = 'nonfire'
      a.transferAt = null
      a.allAt = null
      a.guide = false
      log('非常放送: 非火災報放送')
      restartProgram()
      break
    case 'all':
      a.manual = a.manual.length === ZONE_IDS.length ? [] : [...ZONE_IDS]
      recomputeAreas()
      break
    case 'mic':
      a.mic = !a.mic
      log(`非常放送: マイク ${a.mic ? 'ON' : 'OFF'}`, 'op')
      recomputeAreas()
      restartProgram()
      break
    case 'guideStop':
      a.guide = false
      guidePlayback?.stop()
      break
    case 'reset':
      ampReset()
      break
  }
}

export function toggleManualArea(zone: ZoneId) {
  const a = state.amp
  sfx('pi', 'panel')
  a.manual = a.manual.includes(zone) ? a.manual.filter((z) => z !== zone) : [...a.manual, zone]
  recomputeAreas()
}

function ampReset() {
  const a = state.amp
  stopProgram()
  a.mode = 'idle'
  a.origin = null
  a.sources = []
  a.stations = []
  a.manual = []
  a.allArea = false
  a.areas = []
  a.startedAt = 0
  a.transferAt = null
  a.allAt = null
  a.mic = false
  a.guide = false
  a.onAir = false
  a.caption = ''
  sfx('relay2', 'panel')
  log('非常放送: 復旧', 'op')
  // 受信機が火災表示中なら移報が継続しているため再起動する
  window.setTimeout(() => {
    if (state.receiver.sw.transferStop) return
    const fires = ZONE_IDS.filter((id) => state.receiver.zones[id].fire).sort(
      (x, y) => state.receiver.zones[x].order - state.receiver.zones[y].order,
    )
    for (const id of fires) ampSignal(id, state.receiver.zones[id].station)
  }, 1500)
}

// ---------------------------------------------------------------- broadcast program

const JA_TEXT = {
  det1: 'ただいま、',
  det3: '火災感知器が作動しました。係員が確認しておりますので、次の放送にご注意ください。',
  occ1: '火事です！ 火事です！',
  occ3: '火災が発生しました。落ち着いて、避難してください。',
  nonfire: '先ほどの、火災感知器の作動は、確認の結果、異常がありませんでした。ご安心ください。',
}

/** 区切りの間（秒）。素材の前後無音を削ったうえでここで一定にする */
const GAP = {
  afterSignal: 0.5,
  afterTadaima: 0.12,
  afterPlace: 0.16,
  afterKaji: 0.35,
  beforeEnglish: 0.9,
  enPart: 0.1,
  beforeSignal2: 0.6,
  /** 同じブロック内のユニット間 */
  betweenUnits: 1.0,
  /** ブロック間（地区ベルが鳴る区間） */
  betweenBlocks: 3.0,
}

const SIG1 = 'sig1_soft'

const SIGNAL_GAIN = 0.32

function buildUnit(mode: AmpMode): SeqItem[] | null {
  const a = state.amp
  const s = state.settings
  const place = a.origin ? zoneDef(a.origin) : null
  const sig1: SeqItem = { clip: SIG1, caption: '♪ 第1シグナル', gain: SIGNAL_GAIN }
  const items: SeqItem[] = [sig1, { gap: GAP.afterSignal }]
  if (mode === 'detection') {
    items.push({
      clip: 'ja/detection_1',
      caption: JA_TEXT.det1 + (place ? `${place.speech}の、` : '') + JA_TEXT.det3,
    })
    items.push({ gap: GAP.afterTadaima })
    if (place) items.push({ clip: `ja/${place.jaDet}` }, { gap: GAP.afterPlace })
    items.push({ clip: 'ja/detection_3' })
    if (s.english) {
      items.push({ gap: GAP.beforeEnglish }, { clip: 'en/detection_1', caption: '（英語メッセージ）' })
      if (place) items.push({ gap: GAP.enPart }, { clip: `en/detection_2_${place.en}` })
      items.push({ gap: GAP.enPart }, { clip: 'en/detection_3' })
    }
  } else if (mode === 'fire') {
    items.push({
      clip: 'ja/occurrence_1',
      caption: JA_TEXT.occ1 + (place ? ` ${place.speech}で、` : ' ') + JA_TEXT.occ3,
    })
    items.push({ gap: GAP.afterKaji })
    if (place) items.push({ clip: `ja/${place.jaOcc}` }, { gap: GAP.afterPlace })
    items.push({ clip: 'ja/occurrence_3' })
    if (s.english) {
      items.push({ gap: GAP.beforeEnglish }, { clip: 'en/occurrence_1', caption: '（英語メッセージ）' })
      if (place) items.push({ gap: GAP.enPart }, { clip: `en/occurrence_2_${place.en}` })
      items.push({ gap: GAP.enPart }, { clip: 'en/occurrence_3' })
    }
  } else if (mode === 'nonfire') {
    items.push({ clip: 'ja/falsealerm_1', caption: JA_TEXT.nonfire })
    if (s.english) {
      items.push({ gap: GAP.beforeEnglish }, { clip: 'en/falsealerm_1', caption: '（英語メッセージ）' })
    }
  } else {
    return null
  }
  return items
}

/**
 * 放送1ブロック（実機の動画に合わせた構成）
 *  感知器発報・非火災報: ユニット×2
 *  火災: ユニット×2 ＋ 第2シグナル
 */
function buildBlock(mode: AmpMode): SeqItem[] | null {
  const unit = buildUnit(mode)
  if (!unit) return null
  const items = [...unit, { gap: GAP.betweenUnits }, ...buildUnit(mode)!]
  if (mode === 'fire') {
    items.push({ gap: GAP.beforeSignal2 }, { clip: 'sig2', caption: '♪ 第2シグナル', gain: SIGNAL_GAIN })
  }
  return items
}

let programGen = 0
let programStop: (() => void) | null = null

function stopProgram() {
  programGen++
  programStop?.()
  programStop = null
  guidePlayback?.stop()
  guidePlayback = null
  state.amp.playing = false
  state.amp.onAir = false
}

let guidePlayback: Playback | null = null
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function restartProgram() {
  stopProgram()
  const a = state.amp
  if (a.mic) {
    a.caption = '🎤 マイク放送中'
    return
  }
  if (a.mode === 'idle' || a.areas.length === 0 || !engine.a) {
    a.caption = ''
    return
  }
  const gen = programGen
  const eng = engine.a
  a.playing = true
  void (async () => {
    while (gen === programGen) {
      const items = buildBlock(a.mode)
      if (!items) break
      a.onAir = true
      const pb = eng.playSequence('broadcast', items, (c) => {
        if (gen === programGen) a.caption = c
      })
      programStop = pb.stop
      const ok = await pb.done
      if (!ok || gen !== programGen) return
      a.onAir = false
      if (a.mode === 'nonfire') {
        // 非火災報放送は1ブロック（2回）で終了
        a.playing = false
        a.areas = []
        a.caption = '非火災報放送 終了（復旧してください）'
        log('非常放送: 非火災報放送 終了')
        return
      }
      // ブロックの合間: 感知器発報中は操作部の音声ガイド
      if (a.mode === 'detection' && a.guide) {
        a.caption = '（操作部 音声ガイド）'
        guidePlayback = eng.playSequence('panel', [{ clip: 'pi4' }, { gap: 0.4 }, { clip: 'guide' }])
        await guidePlayback.done
        guidePlayback = null
        if (gen !== programGen) return
      }
      await sleep(GAP.betweenBlocks * 1000)
    }
    if (gen === programGen) a.playing = false
  })()
}

// ---------------------------------------------------------------- clock

function tick() {
  state.now = Date.now()
  const a = state.amp
  if (a.mode === 'detection' && a.transferAt && state.now >= a.transferAt) {
    startFire('火災放送移行タイマー満了')
  }
  if (a.mode === 'fire' && state.settings.zoned && !a.allArea && a.allAt && state.now >= a.allAt) {
    a.allArea = true
    log('非常放送: 一定時間経過 → 全区域鳴動')
    recomputeAreas()
  }
}

// ---------------------------------------------------------------- init

export async function start() {
  if (engine.a) return
  const eng = new AudioEngine()
  engine.a = eng
  await eng.ctx.resume()
  await eng.load((done, total) => {
    state.loading.done = done
    state.loading.total = total
  })
  if (eng.missing.length) console.warn('読み込めなかった音声:', eng.missing)

  watch(
    () => [state.settings.volReceiver, state.settings.volPanel, state.settings.volBroadcast],
    ([r, p, b]) => {
      eng.setVolume('receiver', r!)
      eng.setVolume('panel', p!)
      eng.setVolume('broadcast', b!)
    },
    { immediate: true },
  )
  // 区分鳴動の設定変更は即時反映
  watch(
    () => state.settings.zoned,
    () => recomputeAreas(),
  )
  window.setInterval(tick, 250)
  state.ready = true
  log('システム起動')
}

export { ZONES, ZONE_IDS }
