<script setup lang="ts">
import { ref } from 'vue'
import AmpPanel from './components/AmpPanel.vue'
import BuildingPane from './components/BuildingPane.vue'
import ReceiverPanel from './components/ReceiverPanel.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import { start, state } from './sim/store'

const showSettings = ref(false)
const starting = ref(false)

async function onStart() {
  starting.value = true
  await start()
}
</script>

<template>
  <header class="app-header">
    <h1>P型受信機 シミュレーター</h1>
    <span class="sub">自動火災報知設備＋非常放送設備</span>
    <button class="gear" @click="showSettings = true">⚙ 設定</button>
  </header>

  <main class="panes">
    <BuildingPane />
    <ReceiverPanel />
    <AmpPanel />
  </main>

  <div v-if="!state.ready" class="overlay">
    <div class="card">
      <h2>P型受信機 シミュレーター</h2>
      <p>左の建物で感知器や発信機を作動させ、中央の受信機と右の非常放送設備を操作します。</p>
      <p>音が鳴ります。音量に注意してください。</p>
      <section class="notice" aria-label="ご利用にあたって">
        <h3>ご利用にあたって</h3>
        <ul>
          <li>
            学習・趣味を目的とした非公式のシミュレーターです。実在のメーカー・製品とは関係ありません。動作や放送内容は、実際の設備や法令の基準と異なる場合があります。
          </li>
          <li>
            <strong>悪用は禁止です。</strong>本シミュレーターの音声を実際の建物・公共の場所・放送設備で流すこと、いたずらや他人を驚かせる目的で使うこと、本物の非常放送と誤認されるおそれのある使い方をしないでください。
          </li>
          <li>
            本シミュレーターの利用によって生じたいかなる損害・トラブルについても、作成者は一切の責任を負いません。
          </li>
          <li>実際の設備の点検や操作は、有資格者の指示と各設備の取扱説明書に従ってください。</li>
        </ul>
      </section>
      <button class="start" :disabled="starting" @click="onStart">
        {{ starting ? `音声を読み込み中… ${state.loading.done}/${state.loading.total}` : '同意して開始する' }}
      </button>
    </div>
  </div>

  <SettingsDialog v-if="showSettings" @close="showSettings = false" />
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}
h1 {
  font-size: 18px;
  margin: 0;
}
.sub {
  font-size: 12px;
  color: var(--ink-2);
}
.gear {
  margin-left: auto;
  font: inherit;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--hover);
  color: var(--ink);
  cursor: pointer;
}
.panes {
  display: grid;
  grid-template-columns: minmax(330px, 1fr) minmax(400px, 1.15fr) minmax(340px, 1fr);
  height: calc(100vh - 49px);
}
@media (max-width: 1150px) {
  .panes {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
  }
}
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 12, 16, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 30;
}
.card {
  background: var(--paper);
  color: var(--ink);
  border-radius: 12px;
  padding: 24px;
  max-width: 520px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  line-height: 1.6;
}
.card h2 {
  margin: 0 0 8px;
}
.notice {
  margin: 12px 0;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-left: 4px solid var(--alarm);
  border-radius: 6px;
  font-size: 13px;
  color: var(--ink-2);
}
.notice h3 {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--ink);
}
.notice ul {
  margin: 0;
  padding-left: 1.2em;
}
.notice li + li {
  margin-top: 4px;
}
.notice strong {
  color: var(--alarm);
}
.start {
  margin-top: 8px;
  font: inherit;
  font-weight: 700;
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: var(--alarm);
  color: #fff;
  cursor: pointer;
}
.start:disabled {
  opacity: 0.7;
  cursor: progress;
}
</style>
