<script setup lang="ts">
import { state } from '@/sim/store'

defineEmits<{ close: [] }>()
const s = state.settings

function clampTimers() {
  s.transferSec = Math.min(600, Math.max(5, Math.round(s.transferSec || 0)))
  s.allAreaSec = Math.min(600, Math.max(s.transferSec, Math.round(s.allAreaSec || 0)))
}
</script>

<template>
  <div class="backdrop" @click.self="$emit('close')">
    <div class="dlg" role="dialog" aria-modal="true" aria-label="設定">
      <h2>設定</h2>
      <fieldset>
        <legend>非常放送設備</legend>
        <label>
          火災放送移行タイマー（秒）
          <input v-model.number="s.transferSec" type="number" min="5" max="600" @change="clampTimers" />
          <small>基準: 3分以内（全館スプリンクラー設置時は5分以内）</small>
        </label>
        <label>
          全区域鳴動までの時間（秒・移行タイマーを含む）
          <input v-model.number="s.allAreaSec" type="number" min="5" max="600" @change="clampTimers" />
          <small>基準: 概ね2〜5分、最大10分以内</small>
        </label>
        <label class="chk"><input v-model="s.zoned" type="checkbox" />区分鳴動（オフで常に全館一斉）</label>
        <label class="chk"><input v-model="s.english" type="checkbox" />英語メッセージを付加</label>
        <label>
          第1シグナル
          <select v-model="s.sig1">
            <option value="sig1_strong">アタック強め</option>
            <option value="sig1_soft">アタック弱め</option>
          </select>
        </label>
        <p class="note">タイマーの変更は、次に起動したときから反映されます。</p>
      </fieldset>
      <fieldset>
        <legend>受信機</legend>
        <label class="chk"><input v-model="s.bell" type="checkbox" />地区ベルを併設（放送設備がある建物では通常なし）</label>
      </fieldset>
      <fieldset>
        <legend>音量</legend>
        <label>受信機（主音響・地区ベル）<input v-model.number="s.volReceiver" type="range" min="0" max="1" step="0.05" /></label>
        <label>操作部（音声ガイド・操作音）<input v-model.number="s.volPanel" type="range" min="0" max="1" step="0.05" /></label>
        <label>放送（モニタ）<input v-model.number="s.volBroadcast" type="range" min="0" max="1" step="0.05" /></label>
      </fieldset>
      <button class="close" @click="$emit('close')">閉じる</button>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  padding: 16px;
}
.dlg {
  background: var(--paper);
  color: var(--ink);
  border-radius: 10px;
  padding: 18px 20px;
  width: min(520px, 100%);
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}
h2 {
  margin: 0 0 10px;
  font-size: 18px;
}
fieldset {
  border: 1px solid var(--line);
  border-radius: 8px;
  margin: 0 0 12px;
  padding: 8px 12px 12px;
  display: grid;
  gap: 10px;
}
legend {
  font-weight: 700;
  padding: 0 4px;
}
label {
  display: grid;
  gap: 3px;
  font-size: 14px;
}
label.chk {
  display: flex;
  align-items: center;
  gap: 6px;
}
small,
.note {
  font-size: 12px;
  color: var(--ink-2);
  margin: 0;
}
input[type='number'],
select {
  font: inherit;
  padding: 4px 6px;
  max-width: 160px;
}
.close {
  font: inherit;
  padding: 8px 18px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--hover);
  color: var(--ink);
  cursor: pointer;
}
</style>
