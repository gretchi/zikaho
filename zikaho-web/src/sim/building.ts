// 建物・警戒区域・放送区域の定義

export type ZoneId = '1F' | '2F' | '3F' | '4F' | '5F' | 'ST' | 'EV'

export interface ZoneDef {
  id: ZoneId
  /** 受信機の回線番号 */
  line: number
  /** 受信機の地区表示窓の表記 */
  label: string
  kind: 'floor' | 'shaft'
  floor?: number
  /** 読み上げ用（字幕） */
  speech: string
  /** voice/ja の階名ファイル（拡張子なし） */
  jaDet: string
  jaOcc: string
  /** voice/en の階名ファイル部分 */
  en: string
}

export const ZONES: ZoneDef[] = [
  { id: '1F', line: 1, label: '1階', kind: 'floor', floor: 1, speech: '１階', jaDet: 'detection_2_1kai_no', jaOcc: 'occurrence_2_1kai_de', en: 'first_floor' },
  { id: '2F', line: 2, label: '2階', kind: 'floor', floor: 2, speech: '２階', jaDet: 'detection_2_2kai_no', jaOcc: 'occurrence_2_2kai_de', en: 'second_floor' },
  { id: '3F', line: 3, label: '3階', kind: 'floor', floor: 3, speech: '３階', jaDet: 'detection_2_3gai_no', jaOcc: 'occurrence_2_3gai_de', en: 'third_floor' },
  { id: '4F', line: 4, label: '4階', kind: 'floor', floor: 4, speech: '４階', jaDet: 'detection_2_4kai_no', jaOcc: 'occurrence_2_4kai_de', en: 'fourth_floor' },
  { id: '5F', line: 5, label: '5階', kind: 'floor', floor: 5, speech: '５階', jaDet: 'detection_2_5kai_no', jaOcc: 'occurrence_2_5kai_de', en: 'fifth_floor' },
  { id: 'ST', line: 6, label: '階段', kind: 'shaft', speech: '階段', jaDet: 'detection_2_kaidan_no', jaOcc: 'occurrence_2_kaidan_de', en: 'stairwall' },
  { id: 'EV', line: 7, label: 'EV機械室', kind: 'shaft', speech: 'エレベーター', jaDet: 'detection_2_elevator_no', jaOcc: 'occurrence_2_elevator_de', en: 'elevator' },
]

export const ZONE_IDS = ZONES.map((z) => z.id)
/** 受信機の回線数（8〜10は予備） */
export const RECEIVER_LINES = 10
export const TOP_FLOOR = 5

export function zoneDef(id: ZoneId): ZoneDef {
  return ZONES.find((z) => z.id === id)!
}

export function zoneByLine(line: number): ZoneDef | undefined {
  return ZONES.find((z) => z.line === line)
}

export type DeviceKind = 'smoke' | 'heat' | 'station'

export interface DeviceDef {
  id: string
  zone: ZoneId
  kind: DeviceKind
  label: string
}

export const DEVICE_KIND_LABEL: Record<DeviceKind, string> = {
  smoke: '煙感知器',
  heat: '熱感知器',
  station: '発信機',
}

export const DEVICES: DeviceDef[] = [
  ...ZONES.filter((z) => z.kind === 'floor').flatMap((z): DeviceDef[] => [
    { id: `${z.id}-smoke`, zone: z.id, kind: 'smoke', label: `${z.label} 廊下 煙感知器` },
    { id: `${z.id}-heat`, zone: z.id, kind: 'heat', label: `${z.label} 給湯室 熱感知器（差動式）` },
    { id: `${z.id}-station`, zone: z.id, kind: 'station', label: `${z.label} 発信機（P型1級）` },
  ]),
  { id: 'ST-smoke', zone: 'ST', kind: 'smoke', label: '階段 最上部 煙感知器' },
  { id: 'EV-smoke', zone: 'EV', kind: 'smoke', label: 'EV機械室 煙感知器（昇降路警戒）' },
]

/**
 * 自動火災報知設備連動時の鳴動区域（区分鳴動）
 * - 出火階が2階以上: 出火階と直上階
 * - 出火階が1階: 1階・2階・地階（本建物は地階なし）
 * - 居室の感知器作動時は、その階に通じる階段・EV昇降路も鳴動
 * - たて穴部分（階段・EV）の感知器: 当該部分のみ
 */
export function zonedAreas(sources: ZoneId[]): ZoneId[] {
  const set = new Set<ZoneId>()
  for (const id of sources) {
    const z = zoneDef(id)
    if (z.kind === 'shaft' || z.floor === undefined) {
      set.add(id)
      continue
    }
    set.add(id)
    const upper = ZONES.find((x) => x.floor === z.floor! + 1)
    if (upper) set.add(upper.id)
    set.add('ST')
    set.add('EV')
  }
  return ZONE_IDS.filter((id) => set.has(id))
}
