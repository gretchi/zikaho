<script setup lang="ts">
// 受信機のレバー式スイッチ（上: 定位 / 下: 操作）
defineProps<{ label: string; on: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    class="tsw"
    :class="{ on }"
    role="switch"
    :aria-checked="on"
    :title="`${label.replace(/\n/g, '')}（${on ? '操作中' : '定位'}）`"
    :aria-label="label.replace(/\n/g, '')"
    @click="$emit('toggle')"
  >
    <span class="slot"><span class="lever"></span></span>
    <span class="lbl">{{ label }}</span>
  </button>
</template>

<style scoped>
.tsw {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  padding: 2px;
  min-width: 56px;
}
.tsw:focus-visible {
  outline: 2px solid var(--focus);
  border-radius: 6px;
}
.slot {
  position: relative;
  width: 18px;
  height: 40px;
  border-radius: 9px;
  background: #2a2a28;
  box-shadow: inset 0 2px 4px #000a;
}
.lever {
  position: absolute;
  left: 2px;
  top: 3px;
  width: 14px;
  height: 18px;
  border-radius: 7px;
  background: linear-gradient(#f4f4f0, #b8b8b2);
  transition: top 0.12s;
}
.on .lever {
  top: 19px;
  background: linear-gradient(#ffe27a, #d4a514);
}
.lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--plate-ink);
  line-height: 1.2;
  text-align: center;
  white-space: pre-line;
}
</style>
