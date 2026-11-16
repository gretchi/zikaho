<script setup lang="ts">
// 非常用放送設備 操作部（TOA FS-971 のレイアウトを参考）
//  上段: ハンドマイク / 表示窓（起動灯・火災表示・LCD・出力レベル） / 音声警報スイッチ
//  下段: 放送区域 5区域×3列（名札・発報灯（赤）・放送灯（緑）・選択ボタン）
import { computed } from 'vue'
import LevelMeter from './LevelMeter.vue'
import { ZONES, zoneDef, type ZoneDef } from '@/sim/building'
import { ampButton, state, toggleManualArea } from '@/sim/store'

const a = state.amp

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const lcdTitle = computed(() => {
  if (a.mic) return '◎マイク放送中'
  switch (a.mode) {
    case 'detection':
      return '◎発報放送中'
    case 'fire':
      return '◎火災放送中'
    case 'nonfire':
      return a.playing ? '◎非火災放送中' : '　非火災放送 終了'
    default:
      return '　待機中'
  }
})
const transferLeft = computed(() => (a.transferAt ? a.transferAt - state.now : null))
const allLeft = computed(() =>
  a.allAt && state.settings.zoned && !a.allArea && (a.mode === 'detection' || a.mode === 'fire')
    ? a.allAt - state.now
    : null,
)
const allSelected = computed(() => a.manual.length === ZONES.length)

/** 5区域×3列。空き枠は null */
const banks = computed(() => {
  const slots: (ZoneDef | null)[] = [...ZONES]
  while (slots.length < 15) slots.push(null)
  return [slots.slice(0, 5), slots.slice(5, 10), slots.slice(10, 15)]
})
</script>

<template>
  <section class="pane amp-pane" aria-label="非常放送設備">
    <h2 class="pane-title">非常放送設備</h2>
    <div class="rack">
      <div class="upper">
        <!-- ハンドマイク（クリックでマイク放送 ON/OFF） -->
        <div class="mic-bay">
          <button
            class="mic"
            :class="{ on: a.mic }"
            :aria-pressed="a.mic"
            :title="a.mic ? 'マイク放送を終了' : 'マイク放送（自動放送を中断）'"
            @click="ampButton('mic')"
          >
            <svg viewBox="0 0 40 90" aria-hidden="true">
              <rect x="6" y="2" width="28" height="40" rx="5" class="mic-body" />
              <g class="grille">
                <line v-for="i in 8" :key="i" x1="10" x2="30" :y1="6 + i * 4" :y2="6 + i * 4" />
              </g>
              <rect x="15" y="42" width="10" height="8" class="mic-neck" />
              <path d="M20 50 q-10 5 0 10 q10 5 0 10 q-10 5 0 10 q10 5 0 10" class="cord" />
            </svg>
            <span>マイク</span>
          </button>
          <div class="model">
            <b>非常用放送設備</b>
            <small>自火報連動</small>
          </div>
        </div>

        <!-- 表示窓 -->
        <div class="window">
          <div class="win-top">
            <span class="start" :class="{ on: a.mode !== 'idle' || a.mic }" title="非常起動">
              <span class="start-face"></span>
              <small>非常起動</small>
            </span>
            <span class="kasai" :class="{ on: a.sources.length > 0 }" aria-label="火災表示">火 災</span>
            <span class="round" :class="{ on: a.mode === 'fire' }" title="火災放送">
              <span class="round-face"></span>
              <small>火災放送</small>
            </span>
          </div>
          <div class="lcd" aria-live="polite">
            <div class="ln">
              <b>{{ lcdTitle }}</b>
              <span v-if="a.origin">{{ zoneDef(a.origin).label }}</span>
            </div>
            <template v-if="a.mode === 'detection' && !a.mic">
              <div class="ln">火災のときは 音声警報火災スイッチ</div>
              <div class="ln">誤報のときは 非火災スイッチ</div>
            </template>
            <div v-if="transferLeft !== null" class="ln">火災放送移行まで {{ mmss(transferLeft) }}</div>
            <div v-if="allLeft !== null" class="ln">全区域鳴動まで {{ mmss(allLeft) }}</div>
            <div v-if="a.allArea && a.mode === 'fire'" class="ln">全区域 鳴動中</div>
            <div class="ln cap">{{ a.caption || '　' }}</div>
          </div>
          <div class="win-bottom">
            <div class="lv">
              <small>出力レベル</small>
              <LevelMeter />
            </div>
            <div class="status">
              <span class="sled on" title="電源"></span><small>電源</small>
              <span class="sled" :class="{ on: a.onAir || a.mic }" title="放送"></span><small>放送</small>
              <span class="sled amber" title="異常"></span><small>異常</small>
            </div>
          </div>
        </div>

        <!-- 音声警報スイッチ -->
        <div class="ctrl">
          <div class="vbox">
            <div class="vbox-title">音声警報</div>
            <div class="vcols">
              <div class="vcol">
                <span class="vled orange" :class="{ on: a.mode === 'detection', blink: a.mode === 'detection' }"></span>
                <small>発報</small>
                <button class="key" :disabled="!a.guide" title="音声ガイド停止" @click="ampButton('guideStop')">
                  ガイド<br />停止
                </button>
              </div>
              <div class="vcol">
                <span class="vled red" :class="{ on: a.mode === 'fire' }"></span>
                <small>火災</small>
                <button class="key fire" title="音声警報 火災" @click="ampButton('fire')">火災</button>
              </div>
              <div class="vcol">
                <span class="vled green" :class="{ on: a.mode === 'nonfire' }"></span>
                <small>非火災</small>
                <button class="key nonfire" title="音声警報 非火災" @click="ampButton('nonfire')">非火災</button>
              </div>
            </div>
          </div>
          <div class="vcols lower-keys">
            <div class="vcol">
              <span class="vled green" :class="{ on: allSelected }"></span>
              <small>一斉</small>
              <button class="key" title="一斉（全区域選択）" @click="ampButton('all')">一斉</button>
            </div>
            <div class="vcol">
              <span class="vled"></span>
              <small>復旧</small>
              <button class="key reset" title="復旧" @click="ampButton('reset')">復旧</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 放送区域 -->
      <div class="lower" role="group" aria-label="放送区域">
        <div v-for="(bank, bi) in banks" :key="bi" class="bank">
          <div class="bank-head"><span>区域</span><span>発報</span><span>放送</span><span></span></div>
          <div v-for="(z, i) in bank" :key="z?.id ?? `empty-${bi}-${i}`" class="arow" :class="{ empty: !z }">
            <span class="card">{{ z?.label ?? '' }}</span>
            <span
              class="aled red"
              :class="{ on: !!z && a.sources.includes(z.id), blink: !!z && a.origin === z.id }"
              :title="z ? `${z.label} 発報` : undefined"
            ></span>
            <span
              class="aled green"
              :class="{ on: !!z && a.areas.includes(z.id) }"
              :title="z ? `${z.label} 放送` : undefined"
            ></span>
            <button
              v-if="z"
              class="sel"
              :class="{ on: a.manual.includes(z.id) }"
              :aria-pressed="a.manual.includes(z.id)"
              :aria-label="`${z.label} 区域選択`"
              @click="toggleManualArea(z.id)"
            ></button>
            <span v-else class="sel dummy"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="help">
      <h3>動作の流れ</h3>
      <ol>
        <li>感知器・発信機のどちらが作動しても、初報は<b>感知器発報放送</b>（女声）です。出火階と直上階、階段・EVに流れ、放送の合間に操作部の音声ガイドが流れます。</li>
        <li>現場を確認して火災なら<b>火災</b>を押すと<b>火災放送</b>（男声＋第2シグナル）、誤報なら<b>非火災</b>を押すと非火災報放送になります。</li>
        <li>操作しないまま火災放送移行タイマーが満了した場合も、火災放送に切り替わります。</li>
        <li>火災放送中は、一定時間が経過するか新たな火災信号を受けると全区域鳴動になります。</li>
        <li>地区ベル（表示のみ）は、放送の出力中とマイク使用中は一時停止します（ベルカット）。</li>
        <li>区域の黒いボタンで任意の区域を、<b>一斉</b>で全区域を放送対象に追加できます。ハンドマイクをクリックするとマイク放送になります。</li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.amp-pane {
  background: var(--bg-right);
}
.rack {
  background: linear-gradient(180deg, #2b2c2f 0%, #1d1e20 100%);
  border: 2px solid #0c0c0d;
  border-radius: 6px;
  padding: 10px 10px 12px;
  color: #c9ccd1;
  box-shadow:
    0 6px 18px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 #ffffff14;
}
small {
  font-size: 10px;
  color: #a7abb2;
}

/* ---------- upper ---------- */
.upper {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) 150px;
  gap: 8px;
  align-items: stretch;
}
.mic-bay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.mic {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #c9ccd1;
  font: inherit;
  font-size: 11px;
  padding: 2px;
}
.mic:hover {
  border-color: #555;
}
.mic svg {
  width: 40px;
  height: 90px;
}
.mic-body {
  fill: #18191a;
  stroke: #45484d;
}
.grille line {
  stroke: #3a3c40;
  stroke-width: 1.4;
}
.mic-neck {
  fill: #2c2d30;
}
.cord {
  fill: none;
  stroke: #111;
  stroke-width: 4;
  stroke-linecap: round;
}
.mic.on .mic-body {
  stroke: #ffd02e;
  stroke-width: 2;
}
.model {
  text-align: center;
  line-height: 1.2;
  font-size: 10px;
  background: #d9dadc;
  color: #222;
  padding: 3px 2px;
  border-radius: 2px;
}
.model small {
  color: #444;
  font-size: 9px;
}

.window {
  background: #0b0b0c;
  border: 2px solid #050505;
  border-radius: 4px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: inset 0 0 14px #000;
}
.win-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.start,
.round {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.start-face {
  width: 30px;
  height: 18px;
  border-radius: 4px;
  background: #3b3a33;
  border: 1px solid #555;
}
.start.on .start-face {
  background: #f3efd6;
  box-shadow: 0 0 8px #fff6c8;
}
.kasai {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.3em;
  color: #3a1110;
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif;
}
.kasai.on {
  color: #ff3a26;
  text-shadow:
    0 0 6px #ff2a1a,
    0 0 14px #ff2a1a88;
}
.round-face {
  width: 26px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #6a2a28, #3a1312);
  border: 2px solid #8d8f94;
}
.round.on .round-face {
  background: radial-gradient(circle at 40% 35%, #ffb3a8, #ff2a1a 55%);
  box-shadow: 0 0 10px #ff2a1a;
}
.lcd {
  background: linear-gradient(#e9f1d9, #d5e2bd);
  color: #1d2a16;
  border-radius: 2px;
  padding: 5px 7px;
  font-family: ui-monospace, 'MS Gothic', monospace;
  font-size: 11.5px;
  line-height: 1.45;
  min-height: 92px;
  box-shadow: inset 0 0 6px #0005;
}
.lcd .ln {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
.lcd .cap {
  margin-top: 2px;
  display: block;
  color: #34452a;
}
.win-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.lv {
  display: flex;
  align-items: center;
  gap: 6px;
}
.status {
  display: flex;
  align-items: center;
  gap: 3px;
}
.sled {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #173320;
  margin-left: 4px;
}
.sled.on {
  background: #48f06e;
  box-shadow: 0 0 5px #48f06e;
}
.sled.amber {
  background: #3a3010;
}

.ctrl {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vbox {
  border: 1px solid #8d9096;
  border-radius: 4px;
  padding: 2px 4px 6px;
}
.vbox-title {
  font-size: 10px;
  text-align: center;
  color: #d8dadf;
  margin-bottom: 2px;
}
.vcols {
  display: flex;
  justify-content: space-around;
  gap: 2px;
}
.vcol {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.vled {
  --off: #2c2c2c;
  width: 8px;
  height: 5px;
  border-radius: 1px;
  background: var(--off);
}
.vled.red.on {
  background: #ff3a2a;
  box-shadow: 0 0 5px #ff3a2a;
}
.vled.green.on {
  background: #48f06e;
  box-shadow: 0 0 5px #48f06e;
}
.vled.orange.on {
  background: #ff9a1a;
  box-shadow: 0 0 5px #ff9a1a;
}
.blink {
  animation: blink 0.9s steps(1) infinite;
}
.key {
  width: 42px;
  height: 32px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid #000;
  background: linear-gradient(#2a2b2e, #111214);
  color: #e8eaee;
  font: inherit;
  font-size: 10px;
  line-height: 1.15;
  white-space: nowrap;
  cursor: pointer;
  box-shadow:
    0 2px 0 #000,
    inset 0 1px 0 #ffffff1a;
}
.key:active {
  transform: translateY(2px);
  box-shadow: none;
}
.key:disabled {
  opacity: 0.45;
  cursor: default;
}
.key.fire {
  color: #ff8a80;
}
.key.nonfire {
  color: #8ff0a8;
}

/* ---------- lower (areas) ---------- */
.lower {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 10px;
}
.bank {
  background: #232427;
  border: 1px solid #0c0c0d;
  border-radius: 3px;
  padding: 4px 5px 6px;
}
.bank-head,
.arow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px 18px 24px;
  gap: 3px;
  align-items: center;
}
.bank-head {
  font-size: 8px;
  white-space: nowrap;
  text-align: center;
  color: #8e939a;
  margin-bottom: 2px;
}
.arow {
  height: 26px;
}
.card {
  background: #eceae2;
  color: #1c1c1c;
  font-size: 10.5px;
  font-weight: 600;
  height: 18px;
  line-height: 18px;
  padding: 0 4px;
  border-radius: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.aled {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  justify-self: center;
  background: var(--off);
}
.aled.red {
  --off: #3a1515;
  --lit: #ff3a2a;
}
.aled.green {
  --off: #15301c;
  --lit: #b9ff4a;
}
.aled.on {
  background: var(--lit);
  box-shadow: 0 0 6px var(--lit);
}
.sel {
  width: 22px;
  height: 18px;
  border-radius: 3px;
  border: 1px solid #000;
  background: linear-gradient(#26272a, #0e0f10);
  cursor: pointer;
  padding: 0;
  box-shadow: 0 2px 0 #000;
}
.sel:active {
  transform: translateY(1px);
  box-shadow: none;
}
.sel.on {
  outline: 2px solid #ffd02e;
  outline-offset: -1px;
}
.sel.dummy {
  cursor: default;
  opacity: 0.6;
}

@media (max-width: 520px) {
  .upper {
    grid-template-columns: minmax(0, 1fr);
  }
  .mic-bay {
    flex-direction: row;
  }
  .lower {
    grid-template-columns: minmax(0, 1fr);
  }
}

.help {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-2);
}
.help h3 {
  font-size: 13px;
  margin: 0 0 4px;
  color: var(--ink);
}
.help ol {
  padding-left: 1.3em;
  margin: 0;
}
@keyframes blink {
  50% {
    background: var(--off);
    box-shadow: none;
  }
}
</style>
