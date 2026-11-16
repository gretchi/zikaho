<script setup lang="ts">
// 放送出力のLEDレベルメーター（実際の放送音声をアナライザで計測）
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { broadcastLevelDb } from '@/sim/store'

/** 各LEDの点灯しきい値（dBFS） */
const STEPS = [-42, -36, -30, -26, -22, -18, -14, -10, -7, -4]
const COLORS = STEPS.map((_, i) => (i >= 9 ? 'red' : i >= 7 ? 'amber' : 'green'))

const lit = ref(0)
const peak = ref(-1)
let level = -Infinity
let peakDb = -Infinity
let peakAt = 0
let last = 0
let raf = 0

function frame(t: number) {
  const dt = last ? (t - last) / 1000 : 0
  last = t
  const db = broadcastLevelDb()
  // 立ち上がりは即時、戻りは 24dB/秒
  level = db > level ? db : Math.max(db, level - 24 * dt)
  if (db >= peakDb || t - peakAt > 1200) {
    peakDb = db
    peakAt = t
  }
  lit.value = STEPS.filter((s) => level >= s).length
  peak.value = STEPS.filter((s) => peakDb >= s).length - 1
  raf = requestAnimationFrame(frame)
}

onMounted(() => (raf = requestAnimationFrame(frame)))
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="meter" role="meter" aria-label="出力レベル" :aria-valuenow="lit" aria-valuemin="0" :aria-valuemax="STEPS.length">
    <span
      v-for="(s, i) in STEPS"
      :key="s"
      class="seg"
      :class="[COLORS[i], { on: i < lit || i === peak }]"
    ></span>
  </div>
</template>

<style scoped>
.meter {
  display: flex;
  gap: 3px;
  align-items: center;
}
.seg {
  width: 9px;
  height: 6px;
  border-radius: 1px;
  background: var(--off);
}
.green {
  --off: #12301a;
  --lit: #48f06e;
}
.amber {
  --off: #3a3010;
  --lit: #ffd02e;
}
.red {
  --off: #3d1212;
  --lit: #ff3a2a;
}
.seg.on {
  background: var(--lit);
  box-shadow: 0 0 5px var(--lit);
}
</style>
