<script setup lang="ts">
import { computed } from 'vue'
import DeviceIcon from './DeviceIcon.vue'
import SpeakerIcon from './SpeakerIcon.vue'
import { ZONES, type ZoneId } from '@/sim/building'
import { anyFire, setAcPower, setBroken, state } from '@/sim/store'

const floors = computed(() => ZONES.filter((z) => z.kind === 'floor').reverse())

function speaking(id: ZoneId): boolean {
  const a = state.amp
  return a.areas.includes(id) && (a.playing || a.mic)
}
const bellOn = computed(
  () => state.settings.bell && anyFire() && !state.receiver.sw.areaStop && !state.amp.mic,
)
</script>

<template>
  <section class="pane building" aria-label="建物（感知器・発信機）">
    <h2 class="pane-title">建物</h2>
    <p class="hint">アイコンをクリックすると感知器が作動します。もう一度クリックすると煙・熱を除去します。感知器の作動灯は受信機で復旧するまで点灯したままです。</p>

    <div class="grid">
      <!-- 屋上・EV機械室 -->
      <div class="flabel roof">R</div>
      <div class="room roof-room">屋上</div>
      <div class="shaft-top"></div>
      <div class="ev-machine">
        <span class="tag">EV機械室</span>
        <DeviceIcon id="EV-smoke" />
      </div>

      <template v-for="(f, i) in floors" :key="f.id">
        <div class="flabel" :style="{ gridRow: i + 2 }">{{ f.label }}</div>
        <div class="room" :class="{ fire: state.receiver.zones[f.id].fire }" :style="{ gridRow: i + 2 }">
          <div class="devices">
            <DeviceIcon :id="`${f.id}-smoke`" />
            <DeviceIcon :id="`${f.id}-heat`" />
            <DeviceIcon :id="`${f.id}-station`" />
          </div>
          <div class="outputs">
            <SpeakerIcon :on="speaking(f.id)" :label="f.label" />
            <span v-if="state.settings.bell" class="bell" :class="{ on: bellOn }" title="地区ベル">🔔</span>
          </div>
        </div>
      </template>

      <div class="stair" :class="{ fire: state.receiver.zones.ST.fire }">
        <span class="tag">階段</span>
        <DeviceIcon id="ST-smoke" />
        <div class="steps" aria-hidden="true"></div>
        <SpeakerIcon :on="speaking('ST')" label="階段" />
      </div>
      <div class="ev" :class="{ fire: state.receiver.zones.EV.fire }">
        <span class="tag">EV</span>
        <div class="car" aria-hidden="true"></div>
        <SpeakerIcon :on="speaking('EV')" label="EVかご内" />
      </div>
      <div class="ground"></div>
    </div>

    <details class="faults">
      <summary>障害の模擬</summary>
      <label class="chk">
        <input
          type="checkbox"
          :checked="!state.receiver.acPower"
          @change="setAcPower(!($event.target as HTMLInputElement).checked)"
        />
        停電（予備電源で運転）
      </label>
      <div class="breaks">
        <span>回線断線:</span>
        <label v-for="z in ZONES" :key="z.id" class="chk">
          <input
            type="checkbox"
            :checked="state.receiver.zones[z.id].broken"
            @change="setBroken(z.id, ($event.target as HTMLInputElement).checked)"
          />
          {{ z.label }}
        </label>
      </div>
      <p class="hint">断線した回線の感知器は受信機に信号が届きません。受信機の導通試験で確認できます。</p>
    </details>
  </section>
</template>

<style scoped>
.building {
  background: var(--bg-left);
}
.hint {
  font-size: 12px;
  color: var(--ink-2);
  margin: 0 0 10px;
  line-height: 1.5;
}
.grid {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 64px 64px;
  grid-template-rows: auto repeat(5, auto) 8px;
  gap: 0;
  border: 2px solid var(--wall);
  border-radius: 4px;
  background: var(--paper);
}
.flabel {
  grid-column: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  border-bottom: 1px solid var(--line);
  border-right: 1px solid var(--line);
  color: var(--ink-2);
}
.room {
  grid-column: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--line);
  min-height: 66px;
  transition: background 0.3s;
}
.room.fire,
.stair.fire,
.ev.fire {
  background: var(--fire-bg);
}
.roof-room {
  grid-row: 1;
  min-height: 0;
  color: var(--ink-3);
  font-size: 12px;
}
.roof {
  grid-row: 1;
}
.devices {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.outputs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.bell {
  font-size: 14px;
  opacity: 0.35;
}
.bell.on {
  opacity: 1;
  animation: shake 0.12s infinite alternate;
}
.shaft-top {
  grid-row: 1;
  grid-column: 3;
  border-left: 2px solid var(--wall);
  border-bottom: 1px solid var(--line);
}
.ev-machine {
  grid-row: 1;
  grid-column: 4;
  border-left: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px 0;
}
.stair,
.ev {
  grid-row: 2 / span 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border-left: 2px solid var(--wall);
}
.stair {
  grid-column: 3;
}
.ev {
  grid-column: 4;
  border-left: 1px solid var(--line);
  background: repeating-linear-gradient(90deg, transparent 0 10px, var(--rail) 10px 11px);
}
.tag {
  font-size: 11px;
  color: var(--ink-2);
  font-weight: 600;
}
.steps {
  flex: 1;
  width: 40px;
  background: repeating-linear-gradient(
    -35deg,
    transparent 0 8px,
    var(--line) 8px 10px
  );
  min-height: 60px;
  border-radius: 3px;
}
.car {
  width: 34px;
  height: 46px;
  border: 2px solid var(--ink-3);
  background: var(--paper);
  border-radius: 2px;
  margin-top: auto;
}
.ground {
  grid-row: 7;
  grid-column: 1 / -1;
  background: repeating-linear-gradient(45deg, var(--wall) 0 3px, transparent 3px 7px);
}
.faults {
  margin-top: 12px;
  font-size: 13px;
}
.faults summary {
  cursor: pointer;
  font-weight: 600;
}
.breaks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 6px 0;
}
.chk {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
@keyframes shake {
  from {
    transform: rotate(-12deg);
  }
  to {
    transform: rotate(12deg);
  }
}
</style>
