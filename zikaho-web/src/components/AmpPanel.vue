<script setup lang="ts">
import { computed } from 'vue'
import PanelLamp from './PanelLamp.vue'
import { ZONES, zoneDef } from '@/sim/building'
import { ampButton, state, toggleManualArea } from '@/sim/store'

const a = state.amp

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const modeText = computed(() => {
  switch (a.mode) {
    case 'detection':
      return '感知器発報放送'
    case 'fire':
      return '火災放送'
    case 'nonfire':
      return a.playing ? '非火災報放送' : '非火災報 終了'
    default:
      return a.mic ? 'マイク放送' : '待機'
  }
})
const transferLeft = computed(() => (a.transferAt ? a.transferAt - state.now : null))
const allLeft = computed(() =>
  a.allAt && state.settings.zoned && !a.allArea && (a.mode === 'detection' || a.mode === 'fire')
    ? a.allAt - state.now
    : null,
)
const allSelected = computed(() => a.manual.length === ZONES.length)
</script>

<template>
  <section class="pane amp-pane" aria-label="非常放送設備">
    <h2 class="pane-title">非常放送設備</h2>
    <div class="rack">
      <div class="plate">
        <span class="model">非常用放送設備 操作部</span>
        <span class="sub">自動火災報知設備連動</span>
      </div>

      <div class="lamps">
        <PanelLamp label="電源" color="green" :on="true" />
        <PanelLamp label="非常起動" :on="a.mode !== 'idle'" />
        <PanelLamp label="感知器発報" color="orange" :on="a.mode === 'detection'" blink />
        <PanelLamp label="火災" :on="a.mode === 'fire'" />
        <PanelLamp label="非火災" color="green" :on="a.mode === 'nonfire'" />
        <PanelLamp label="全区域" color="amber" :on="a.allArea || !state.settings.zoned" />
        <PanelLamp label="マイク" color="amber" :on="a.mic" />
      </div>

      <div class="lcd" aria-live="polite">
        <div class="row">
          <strong>{{ modeText }}</strong>
          <span v-if="a.origin">発報: {{ zoneDef(a.origin).label }}</span>
        </div>
        <div v-if="transferLeft !== null" class="row">
          火災放送移行まで <strong>{{ mmss(transferLeft) }}</strong>
        </div>
        <div v-if="allLeft !== null" class="row">
          全区域鳴動まで <strong>{{ mmss(allLeft) }}</strong>
        </div>
        <div class="caption">{{ a.caption || '　' }}</div>
      </div>

      <div class="areas" role="group" aria-label="放送区域">
        <div class="area-head">
          <span>区域</span><span>発報</span><span>鳴動</span><span>選択</span>
        </div>
        <div v-for="z in ZONES" :key="z.id" class="area">
          <span class="name">{{ z.label }}</span>
          <span
            class="led orange"
            :class="{ on: a.sources.includes(z.id), first: a.origin === z.id }"
            :title="`${z.label} 発報${a.origin === z.id ? '（先着）' : ''}`"
          ></span>
          <span
            class="led red"
            :class="{ on: a.areas.includes(z.id), anim: a.areas.includes(z.id) && (a.playing || a.mic) }"
            :title="`${z.label} 鳴動`"
          ></span>
          <button
            class="sel"
            :class="{ on: a.manual.includes(z.id) }"
            :aria-pressed="a.manual.includes(z.id)"
            @click="toggleManualArea(z.id)"
          >
            {{ z.label }}
          </button>
        </div>
      </div>

      <div class="buttons">
        <button class="big fire" @click="ampButton('fire')">
          火災<small>音声警報 火災</small>
        </button>
        <button class="big nonfire" @click="ampButton('nonfire')">
          非火災<small>音声警報 非火災</small>
        </button>
        <button class="btn" :class="{ on: allSelected }" @click="ampButton('all')">一斉</button>
        <button class="btn" :class="{ on: a.mic }" :aria-pressed="a.mic" @click="ampButton('mic')">
          マイク
        </button>
        <button class="btn" :disabled="!a.guide" @click="ampButton('guideStop')">音声ガイド停止</button>
        <button class="btn reset" @click="ampButton('reset')">復旧</button>
      </div>
    </div>

    <div class="help">
      <h3>動作の流れ</h3>
      <ol>
        <li>感知器が作動すると、非常放送設備は<b>感知器発報放送</b>（女声）を、出火階と直上階、階段・EVに流します。操作部では音声ガイドが流れます。</li>
        <li>現場を確認して火災なら<b>火災</b>、誤報なら<b>非火災</b>を押します。</li>
        <li>操作しなくても、発信機の押下・別回線の発報・火災放送移行タイマーの満了で<b>火災放送</b>（男声＋第2シグナル）に切り替わります。</li>
        <li>区分鳴動中は、一定時間が経過するか新たな火災信号を受けると全区域鳴動になります。</li>
        <li>受信機で<b>火災復旧</b>、放送設備で<b>復旧</b>を押すと待機状態に戻ります。</li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.amp-pane {
  background: var(--bg-right);
}
.rack {
  --plate-ink: #d8dde3;
  background: linear-gradient(#3b4148, #2b3036);
  border: 3px solid #1b1e22;
  border-radius: 10px;
  padding: 14px;
  color: var(--plate-ink);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
}
.plate {
  display: flex;
  align-items: baseline;
  gap: 10px;
  border-bottom: 1px solid #555c64;
  padding-bottom: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.model {
  font-weight: 800;
  letter-spacing: 0.06em;
}
.sub {
  font-size: 12px;
  color: #9aa3ad;
}
.lamps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.lcd {
  margin: 12px 0;
  padding: 8px 10px;
  border-radius: 4px;
  background: #0f2a17;
  color: #7cff9a;
  font-family: ui-monospace, monospace;
  font-size: 13px;
  border: 2px solid #0a1a0e;
  box-shadow: inset 0 0 12px #000c;
  min-height: 96px;
}
.lcd .row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.lcd .caption {
  margin-top: 6px;
  color: #d4ffe0;
  line-height: 1.5;
  font-family: inherit;
}
.areas {
  display: grid;
  gap: 4px;
  margin-bottom: 12px;
}
.area-head,
.area {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px 38px minmax(0, 1.2fr);
  align-items: center;
  gap: 6px;
}
.area-head {
  font-size: 11px;
  color: #9aa3ad;
}
.area .name {
  font-size: 13px;
}
.led {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  justify-self: center;
  background: var(--off);
  border: 1px solid #111;
}
.led.red {
  --off: #4a1d1d;
  --lit: #ff2a1f;
}
.led.orange {
  --off: #4a2e13;
  --lit: #ff8c1a;
}
.led.on {
  background: var(--lit);
  box-shadow: 0 0 8px var(--lit);
}
.led.orange.on.first {
  animation: blink 0.9s steps(1) infinite;
}
.sel {
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid #111;
  background: linear-gradient(#5a626b, #444b53);
  color: #e6e9ed;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.sel.on {
  background: linear-gradient(#ffd75a, #d9a91c);
  color: #222;
}
.buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.big,
.btn {
  border-radius: 6px;
  border: 2px solid #111;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  box-shadow: 0 3px 0 #111;
}
.big:active,
.btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #111;
}
.big {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 6px;
  font-size: 20px;
  color: #fff;
}
.big small {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.9;
}
.fire {
  background: linear-gradient(#e53d32, #a81810);
}
.nonfire {
  background: linear-gradient(#2fb257, #17773a);
}
.btn {
  padding: 8px 6px;
  background: linear-gradient(#69727c, #4c535b);
  color: #f1f3f5;
}
.btn.on {
  background: linear-gradient(#ffd75a, #d9a91c);
  color: #222;
}
.btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.btn.reset {
  background: linear-gradient(#e6e9ec, #b5bcc3);
  color: #222;
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
