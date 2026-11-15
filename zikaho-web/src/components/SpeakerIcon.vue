<script setup lang="ts">
defineProps<{ on: boolean; label?: string }>()
</script>

<template>
  <span class="spk" :class="{ on }" :title="label ? `${label} スピーカー${on ? '（放送中）' : ''}` : undefined">
    <svg viewBox="0 0 32 24" aria-hidden="true">
      <path d="M3 9 H9 L16 3 V21 L9 15 H3 Z" class="cone" />
      <path d="M20 8 Q23 12 20 16" class="wave w1" />
      <path d="M23 5 Q28 12 23 19" class="wave w2" />
    </svg>
  </span>
</template>

<style scoped>
.spk {
  display: inline-block;
  width: 28px;
  height: 21px;
}
svg {
  width: 100%;
  height: 100%;
}
.cone {
  fill: var(--ink-3);
}
.on .cone {
  fill: var(--alarm);
}
.wave {
  fill: none;
  stroke: var(--alarm);
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0;
}
.on .w1 {
  animation: blink 0.8s infinite;
}
.on .w2 {
  animation: blink 0.8s 0.2s infinite;
}
@keyframes blink {
  0%,
  100% {
    opacity: 0.15;
  }
  50% {
    opacity: 1;
  }
}
</style>
