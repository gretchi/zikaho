<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    on: boolean
    color?: 'red' | 'green' | 'amber' | 'orange'
    blink?: boolean
    big?: boolean
  }>(),
  { color: 'red', blink: false, big: false },
)
</script>

<template>
  <div class="lamp" :class="[color, { on, blink: on && blink, big }]" role="status" :aria-label="`${label}${on ? ' 点灯' : ' 消灯'}`">
    <span class="bulb"></span>
    <span class="lbl">{{ label }}</span>
  </div>
</template>

<style scoped>
.lamp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 52px;
}
.bulb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #3b3b38;
  box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.35);
  background: var(--off);
}
.big .bulb {
  width: 54px;
  height: 34px;
  border-radius: 6px;
}
.lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--plate-ink);
  white-space: nowrap;
}
.red {
  --off: #5a2222;
  --lit: #ff2a1f;
}
.green {
  --off: #1f3d26;
  --lit: #33e05a;
}
.amber {
  --off: #4d4019;
  --lit: #ffcc29;
}
.orange {
  --off: #4f2f14;
  --lit: #ff8c1a;
}
.on .bulb {
  background: radial-gradient(circle at 40% 35%, #fff8 0 15%, var(--lit) 45%);
  box-shadow: 0 0 12px var(--lit);
}
.blink .bulb {
  animation: blink 0.9s steps(1) infinite;
}
@keyframes blink {
  50% {
    background: var(--off);
    box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.35);
  }
}
</style>
