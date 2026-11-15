<script setup lang="ts">
import { computed } from 'vue'
import { DEVICES, DEVICE_KIND_LABEL } from '@/sim/building'
import { clickDevice, state } from '@/sim/store'

const props = defineProps<{ id: string }>()
const def = computed(() => DEVICES.find((d) => d.id === props.id)!)
const dev = computed(() => state.devices[props.id]!)
/** 発信機の応答ランプ: 受信機が受信した */
const answered = computed(
  () => def.value.kind === 'station' && dev.value.active && state.receiver.zones[def.value.zone].station,
)
const title = computed(() => {
  const d = def.value
  if (d.kind === 'station') return `${d.label}\nクリック: ${dev.value.active ? '押しボタンを戻す' : '押す'}`
  return `${d.label}\nクリック: ${dev.value.active ? '煙・熱を除去' : '作動させる（煙・熱を加える）'}`
})
</script>

<template>
  <button
    class="dev"
    :class="[def.kind, { active: dev.active, latched: dev.latched, answered }]"
    :title="title"
    :aria-label="title"
    :aria-pressed="dev.active"
    @click="clickDevice(id)"
  >
    <svg v-if="def.kind === 'smoke'" viewBox="0 0 48 48" aria-hidden="true">
      <g v-if="dev.active" class="smoke">
        <circle cx="16" cy="40" r="6" />
        <circle cx="26" cy="42" r="7" />
        <circle cx="36" cy="39" r="5" />
      </g>
      <circle cx="24" cy="20" r="16" class="body" />
      <circle cx="24" cy="20" r="10" class="ring" />
      <circle cx="24" cy="20" r="5" class="ring" />
      <circle cx="34" cy="10" r="3" class="led" />
    </svg>
    <svg v-else-if="def.kind === 'heat'" viewBox="0 0 48 48" aria-hidden="true">
      <g v-if="dev.active" class="flame">
        <path d="M24 46 C14 44 14 34 20 30 C20 35 23 36 24 34 C22 30 26 26 28 24 C28 30 34 32 32 40 C31 44 28 46 24 46Z" />
      </g>
      <circle cx="24" cy="20" r="16" class="body" />
      <rect x="15" y="17" width="18" height="6" rx="1.5" class="ring" />
      <circle cx="34" cy="10" r="3" class="led" />
    </svg>
    <svg v-else viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="6" r="4.5" class="lamp" />
      <rect x="8" y="12" width="32" height="32" rx="4" class="box" />
      <circle cx="24" cy="28" r="10" class="btn" />
      <text x="24" y="32" text-anchor="middle" class="push">押</text>
      <circle cx="36" cy="16" r="2.2" class="answer" />
    </svg>
    <span class="cap">{{ DEVICE_KIND_LABEL[def.kind] }}</span>
  </button>
</template>

<style scoped>
.dev {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: none;
  cursor: pointer;
  color: var(--ink-2);
  font: inherit;
}
.dev:hover {
  border-color: var(--line);
  background: var(--hover);
}
.dev:focus-visible {
  outline: 2px solid var(--focus);
}
svg {
  width: 40px;
  height: 40px;
  overflow: visible;
}
.cap {
  font-size: 10px;
  white-space: nowrap;
}
.body {
  fill: #f6f5f0;
  stroke: #8c8a82;
  stroke-width: 1.5;
}
.ring {
  fill: none;
  stroke: #b3b0a6;
  stroke-width: 1.2;
}
.led {
  fill: #5b2a2a;
}
.latched .led {
  fill: #ff2b2b;
  filter: drop-shadow(0 0 4px #ff3b3b);
}
.smoke circle {
  fill: #9aa0a6;
  opacity: 0.75;
  animation: puff 1.6s ease-in-out infinite alternate;
}
.flame path {
  fill: #ff7a1a;
  animation: flick 0.4s ease-in-out infinite alternate;
  transform-origin: 24px 44px;
}
.box {
  fill: #d42020;
  stroke: #8f1010;
}
.lamp {
  fill: #ff3030;
  filter: drop-shadow(0 0 3px #ff4040);
}
.btn {
  fill: #f2f2f2;
  stroke: #7d1010;
  stroke-width: 1.5;
}
.active .btn {
  fill: #c9c9c9;
  transform: translateY(1px);
}
.push {
  font-size: 11px;
  font-weight: 700;
  fill: #b31212;
}
.answer {
  fill: #6d1111;
}
.answered .answer {
  fill: #ffd84a;
  filter: drop-shadow(0 0 3px #ffd84a);
}
@keyframes puff {
  from {
    transform: translateY(0);
    opacity: 0.5;
  }
  to {
    transform: translateY(-3px);
    opacity: 0.85;
  }
}
@keyframes flick {
  from {
    transform: scaleY(0.9);
  }
  to {
    transform: scaleY(1.08);
  }
}
</style>
