<template>
  <div class="app-trading-box">
    <header
      class="custom-header"
      @mousedown.self="onDrag($event)"
      @dblclick.self="onMax()"
    >
      <h2 class="app-name">
        <i
          class="iconfont"
          :class="appInfo.icon"
          :style="{ color: appInfo.iconColor || 'rgba(255, 255, 255, 0.8)' }"
        ></i>
        <span>{{ appInfo.name }}</span>
      </h2>
      <div class="header-right">
        <span class="balance" v-if="balance !== null">{{ balance.toFixed(4) }} SOL</span>
        <span class="balance loading" v-else>loading...</span>
        <div class="window-controls">
          <span class="wc-btn wc-max" @click="onMax()"></span>
          <span class="wc-btn wc-min" @click="onMin()"></span>
          <span class="wc-btn wc-close" @click="onClose()"></span>
        </div>
      </div>
    </header>

    <div class="trading-body">
      <div class="wallet-bar">
        <span class="label">WALLET</span>
        <span class="addr">{{ censoredWallet }}</span>
      </div>

      <div class="log-header">
        <span class="col col-time">TIME</span>
        <span class="col col-type">TYPE</span>
        <span class="col col-dir">DIR</span>
        <span class="col col-amount">AMOUNT</span>
        <span class="col col-token">TOKEN</span>
      </div>

      <div class="log-list" ref="logRef">
        <div
          v-for="log in tradingLogs"
          :key="log.id"
          :class="['log-row', log.direction === 'IN' || log.direction === 'BUY' ? 'incoming' : 'outgoing']"
        >
          <span class="col col-time">{{ formatTime(log.timestamp) }}</span>
          <span class="col col-type">{{ log.type }}</span>
          <span class="col col-dir">{{ log.direction || '-' }}</span>
          <span class="col col-amount">{{ formatAmount(log.amount) }}</span>
          <span class="col col-token">{{ log.token || 'SOL' }}</span>
        </div>
        <div v-if="tradingLogs.length === 0" class="empty">
          no trading activity yet — wei is still learning
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const SERVER = import.meta.env.DEV ? "http://localhost:3001" : "";

const props = defineProps({
  appInfo: Object,
});

const emit = defineEmits(["onDrag", "onMax", "onClose", "onMin"]);
const onDrag = (e) => emit("onDrag", e);
const onMax = () => emit("onMax");
const onClose = () => emit("onClose");
const onMin = () => emit("onMin");

const tradingLogs = ref([]);
const walletAddress = ref("");
const balance = ref(null);
const logRef = ref(null);

const censoredWallet = computed(() => {
  if (!walletAddress.value) return "...";
  const w = walletAddress.value;
  return w.slice(0, 6) + "xxxxx" + w.slice(-4);
});

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString();
}

function formatAmount(amt) {
  if (amt === null || amt === undefined) return "-";
  return Number(amt).toFixed(4);
}

async function fetchData() {
  try {
    const [statusRes, balanceRes, logsRes] = await Promise.all([
      fetch(`${SERVER}/api/status`),
      fetch(`${SERVER}/api/wallet/balance`),
      fetch(`${SERVER}/api/trading-logs?limit=100`),
    ]);
    const status = await statusRes.json();
    walletAddress.value = status.wallet || "";

    const balData = await balanceRes.json();
    if (balData.balance !== null) balance.value = balData.balance;

    tradingLogs.value = await logsRes.json();
  } catch (err) {
    console.error("Trading log fetch error:", err);
  }
}

let ws = null;
function connectWs() {
  const wsUrl = import.meta.env.DEV
    ? "ws://localhost:3001/ws"
    : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
  ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "activity" && msg.data.type === "wallet") {
      fetchData();
    }
  };

  ws.onclose = () => setTimeout(connectWs, 3000);
  ws.onerror = () => ws.close();
}

onMounted(() => {
  fetchData();
  connectWs();
  setInterval(() => {
    fetch(`${SERVER}/api/wallet/balance`)
      .then((r) => r.json())
      .then((d) => { if (d.balance !== null) balance.value = d.balance; })
      .catch(() => {});
  }, 60000);
});

onBeforeUnmount(() => {
  if (ws) ws.close();
});
</script>

<style lang="scss" scoped>
.app-trading-box {
  @apply w-full h-full text-white;
  background: #0a0a0a;
  font-family: "Courier New", monospace;
  display: flex;
  flex-direction: column;

  .custom-header {
    @include glass-bg-dark(0);
    @apply w-full h-8 absolute top-0 left-0
      flex justify-between items-center px-2 z-10;

    .app-name {
      @apply flex items-center gap-2 h-full text-xs;
    }

    .header-right {
      @apply flex items-center gap-3;
    }

    .balance {
      color: #facc15;
      font-size: 11px;
      &.loading { color: #666; }
    }

    .window-controls {
      @apply flex items-center gap-1;
      .wc-btn {
        @apply w-3 h-3 rounded-full cursor-pointer;
        &.wc-max { background: #61c554; }
        &.wc-min { background: #f4be4f; }
        &.wc-close { background: #ec695e; }
      }
    }
  }

  .trading-body {
    @apply flex flex-col flex-1 mt-8 overflow-hidden;
  }

  .wallet-bar {
    @apply flex items-center gap-2 px-3 py-2;
    border-bottom: 1px solid #1a1a1a;
    background: #0d0d0d;

    .label {
      color: #666;
      font-size: 10px;
      letter-spacing: 2px;
    }
    .addr {
      color: #facc15;
      font-size: 11px;
    }
  }

  .log-header {
    @apply flex px-3 py-1;
    border-bottom: 1px solid #1a1a1a;
    background: #0d0d0d;

    .col {
      color: #555;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  }

  .log-list {
    @apply flex-1 overflow-y-auto px-3;
    scrollbar-width: thin;
    scrollbar-color: #222 transparent;
  }

  .log-row {
    @apply flex py-1;
    border-bottom: 1px solid #111;
    font-size: 11px;

    &.incoming .col-dir { color: #4ade80; }
    &.incoming .col-amount { color: #4ade80; }
    &.outgoing .col-dir { color: #f87171; }
    &.outgoing .col-amount { color: #f87171; }
  }

  .col {
    color: #888;
  }
  .col-time { width: 160px; flex-shrink: 0; color: #555; }
  .col-type { width: 100px; flex-shrink: 0; }
  .col-dir { width: 50px; flex-shrink: 0; font-weight: bold; }
  .col-amount { width: 120px; flex-shrink: 0; }
  .col-token { flex: 1; }

  .empty {
    @apply text-center py-8;
    color: #333;
    font-size: 12px;
  }
}
</style>
