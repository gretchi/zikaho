<script setup lang="ts">
import { computed } from 'vue'
import PanelLamp from './PanelLamp.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import { RECEIVER_LINES, zoneByLine } from '@/sim/building'
import {
  anyFire,
  continuityOk,
  fireRestore,
  selectLine,
  state,
  switchCaution,
  toggleSwitch,
} from '@/sim/store'

const r = state.receiver
const lines = Array.from({ length: RECEIVER_LINES }, (_, i) => i + 1)

function zoneOf(line: number) {
  const z = zoneByLine(line)
  return z ? r.zones[z.id] : null
}

const anyStation = computed(() => Object.values(r.zones).some((z) => z.station))
const voltage = computed(() => {
  if (r.batteryTest) return 26.2
  return r.acPower ? 24.0 : 25.4
})
// 電圧計の針: 0〜40V を -60°〜+60°
const needle = computed(() => -60 + (voltage.value / 40) * 120)

const switches = [
  { key: 'mainStop', label: '主音響\n停止' },
  { key: 'areaStop', label: '地区音響\n停止' },
  { key: 'transferStop', label: '移報\n停止' },
  { key: 'fireTest', label: '火災\n試験' },
  { key: 'contTest', label: '導通\n試験' },
  { key: 'autoRestore', label: '試験\n復旧' },
] as const
</script>

<template>
  <section class="pane receiver-pane" aria-label="受信機">
    <h2 class="pane-title">受信機</h2>
    <div class="cabinet">
      <div class="plate">
        <span class="model">P型1級受信機</span>
        <span class="sub">{{ RECEIVER_LINES }}回線</span>
      </div>

      <div class="top">
        <PanelLamp label="火災" :on="anyFire()" big />
        <div class="lamps">
          <PanelLamp label="交流電源" color="green" :on="r.acPower" />
          <PanelLamp label="予備電源" color="amber" :on="!r.acPower" />
          <PanelLamp label="発信機" :on="anyStation" />
          <PanelLamp label="スイッチ注意" color="amber" :on="switchCaution()" blink />
          <PanelLamp label="導通" color="green" :on="continuityOk()" />
        </div>
        <div class="meter" :aria-label="`電圧計 ${voltage.toFixed(1)}V`">
          <svg viewBox="0 0 100 62" aria-hidden="true">
            <path d="M10 55 A45 45 0 0 1 90 55" class="arc" />
            <path d="M68 22 A45 45 0 0 1 81 33" class="ok" />
            <g v-for="v in [0, 10, 20, 30, 40]" :key="v" :transform="`rotate(${-60 + v * 3} 50 55)`">
              <line x1="50" y1="12" x2="50" y2="18" class="tick" />
              <text x="50" y="25" text-anchor="middle" class="num">{{ v }}</text>
            </g>
            <line x1="50" y1="55" x2="50" y2="14" class="needle" :transform="`rotate(${needle} 50 55)`" />
            <circle cx="50" cy="55" r="3" class="hub" />
          </svg>
          <span class="lbl">電圧計 V</span>
        </div>
      </div>

      <div class="windows" role="list" aria-label="地区表示">
        <div
          v-for="line in lines"
          :key="line"
          role="listitem"
          class="win"
          :class="{
            fire: zoneOf(line)?.fire,
            spare: !zoneByLine(line),
            sel: (r.sw.fireTest || r.sw.contTest) && r.line === line,
          }"
        >
          <span class="no">{{ line }}</span>
          <span class="name">{{ zoneByLine(line)?.label ?? '予備' }}</span>
          <span v-if="zoneOf(line)?.station" class="st">発信機</span>
          <span v-if="zoneOf(line)?.test" class="st">試験</span>
        </div>
      </div>

      <div class="controls">
        <div class="switches">
          <ToggleSwitch
            v-for="s in switches"
            :key="s.key"
            :label="s.label"
            :on="r.sw[s.key]"
            @toggle="toggleSwitch(s.key)"
          />
        </div>
        <div class="rotary" aria-label="回線選択">
          <span class="lbl">回線選択</span>
          <div class="rot">
            <button class="rbtn" aria-label="前の回線" @click="selectLine(-1)">◀</button>
            <span class="rnum">{{ r.line }}</span>
            <button class="rbtn" aria-label="次の回線" @click="selectLine(1)">▶</button>
          </div>
        </div>
        <div class="pushes">
          <button class="push restore" @click="fireRestore()">火災復旧</button>
          <button
            class="push"
            :class="{ held: r.batteryTest }"
            @pointerdown="r.batteryTest = true"
            @pointerup="r.batteryTest = false"
            @pointerleave="r.batteryTest = false"
            @keydown.space.prevent="r.batteryTest = true"
            @keyup.space="r.batteryTest = false"
          >
            予備電源試験
          </button>
        </div>
      </div>
    </div>

    <div class="log">
      <h3>履歴</h3>
      <ol>
        <li v-for="(e, i) in r.log" :key="i" :class="e.kind">
          <time>{{ e.time }}</time> {{ e.text }}
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.receiver-pane {
  background: var(--bg-center);
}
.cabinet {
  --plate-ink: #2c2c28;
  background: linear-gradient(#e9e6dc, #d9d5c8);
  border: 3px solid #a9a495;
  border-radius: 10px;
  padding: 14px;
  box-shadow:
    0 6px 18px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 #fff8;
  color: var(--plate-ink);
}
.plate {
  display: flex;
  align-items: baseline;
  gap: 10px;
  border-bottom: 1px solid #b7b2a3;
  padding-bottom: 6px;
  margin-bottom: 12px;
}
.model {
  font-weight: 800;
  letter-spacing: 0.1em;
}
.sub {
  font-size: 12px;
  color: #6b675c;
}
.top {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.lamps {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}
.meter {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f8f6ef;
  border: 2px solid #8c887b;
  border-radius: 6px;
  padding: 2px 4px;
}
.meter svg {
  width: 96px;
  height: 60px;
}
.arc {
  fill: none;
  stroke: #333;
  stroke-width: 1;
}
.ok {
  fill: none;
  stroke: #2fa84a;
  stroke-width: 4;
}
.tick {
  stroke: #333;
}
.num {
  font-size: 7px;
  fill: #333;
}
.needle {
  stroke: #c41414;
  stroke-width: 1.5;
  transition: transform 0.5s cubic-bezier(0.3, 1.6, 0.6, 1);
}
.hub {
  fill: #333;
}
.meter .lbl,
.rotary .lbl {
  font-size: 11px;
  font-weight: 600;
}
.windows {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  margin: 16px 0;
  padding: 8px;
  background: #3a3934;
  border-radius: 6px;
}
.win {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  border-radius: 3px;
  background: #5c2b26;
  color: #d9b9b3;
  border: 2px solid #22211e;
  transition: background 0.15s;
}
.win .no {
  font-size: 10px;
  opacity: 0.8;
}
.win .name {
  font-weight: 700;
  font-size: 13px;
}
.win .st {
  font-size: 9px;
  font-weight: 700;
}
.win.fire {
  background: #ff3324;
  color: #fff;
  box-shadow: 0 0 14px #ff3a2a;
}
.win.spare {
  background: #4a4842;
  color: #8e8b80;
}
.win.sel {
  border-color: #ffd23f;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
}
.switches {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.rotary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.rot {
  display: flex;
  align-items: center;
  gap: 4px;
}
.rnum {
  display: inline-flex;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  background: radial-gradient(#4a4a46, #1e1e1c);
  color: #fff;
  font-weight: 800;
  font-size: 18px;
  border: 2px solid #777;
}
.rbtn {
  border: 1px solid #8c887b;
  background: #f4f2ea;
  border-radius: 4px;
  width: 26px;
  height: 26px;
  cursor: pointer;
  color: #333;
}
.pushes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.push {
  padding: 10px 14px;
  border-radius: 6px;
  border: 2px solid #6d6a60;
  background: linear-gradient(#fdfcf7, #d3cfc2);
  font-weight: 700;
  cursor: pointer;
  color: #2c2c28;
  box-shadow: 0 2px 0 #6d6a60;
}
.push:active,
.push.held {
  transform: translateY(2px);
  box-shadow: none;
}
.push.restore {
  background: linear-gradient(#fff1f0, #f0c9c4);
}
.log {
  margin-top: 14px;
  font-size: 12px;
}
.log h3 {
  font-size: 13px;
  margin: 0 0 4px;
}
.log ol {
  list-style: none;
  margin: 0;
  padding: 6px 8px;
  max-height: 180px;
  overflow: auto;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 6px;
  font-family: ui-monospace, monospace;
}
.log li.fire {
  color: var(--alarm);
  font-weight: 700;
}
.log li.op {
  color: var(--ink-2);
}
.log time {
  color: var(--ink-3);
}
</style>
