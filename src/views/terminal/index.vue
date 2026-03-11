<template>
  <div class="terminal-page">
    <div class="terminal-chrome">
      <div class="terminal-titlebar">
        <div class="terminal-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <span class="terminal-title">wei@terminal ~ $</span>
        <router-link to="/" class="back-link">[ROOM]</router-link>
      </div>

      <div class="terminal-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="terminal-content">
        <!-- WEI LOG -->
        <div v-if="activeTab === 'log'" class="tab-panel">
          <div class="panel-header">
            <span class="label">WALLET</span>
            <span class="wallet-addr">{{ censoredWallet }}</span>
            <span class="balance" v-if="balance !== null">{{ balance.toFixed(4) }} SOL</span>
            <span class="balance loading" v-else>loading...</span>
          </div>
          <div class="log-table-header">
            <span class="col col-type">TYPE</span>
            <span class="col col-dir">DIR</span>
            <span class="col col-amount">AMOUNT</span>
            <span class="col col-token">TOKEN</span>
            <span class="col col-time">TIME</span>
          </div>
          <div class="log-list">
            <div
              v-for="(log, i) in tradingLogs"
              :key="log.signature + i"
              :class="['log-row', log.direction === 'in' ? 'incoming' : 'outgoing']"
            >
              <span :class="['col', 'col-type', log.type === 'SWAP' ? 'swap-type' : '']">{{ log.type || 'TRANSFER' }}</span>
              <span class="col col-dir">{{ log.direction === 'in' ? '+' : '-' }}</span>
              <span class="col col-amount">{{ shortAmount(log.amount) }}</span>
              <span class="col col-token">{{ log.symbol || '???' }}</span>
              <span class="col col-time">{{ formatTime(log.timestamp) }}</span>
            </div>
            <div v-if="tradingLogs.length === 0" class="empty">no trading activity yet</div>
          </div>
        </div>

        <!-- SOUL -->
        <div v-if="activeTab === 'soul'" class="tab-panel">
          <div class="soul-content">
            <pre class="soul-text">{{ soulContent || 'loading soul.md...' }}</pre>
          </div>
        </div>

        <!-- BRAIN -->
        <div v-if="activeTab === 'brain'" class="tab-panel">
          <div class="brain-header">
            <div class="brain-status">
              <span :class="['status-dot', connected ? 'on' : 'off']"></span>
              <span>{{ connected ? 'LIVE' : 'OFFLINE' }}</span>
            </div>
            <div class="brain-wallet" v-if="walletAddress">
              <span class="label">SOL</span>
              <span class="wallet-addr">{{ walletShort }}</span>
              <span class="balance" v-if="balance !== null">{{ balance.toFixed(4) }} SOL</span>
            </div>
          </div>

          <div class="brain-section">
            <div class="section-title">currently learning</div>
            <div class="learning-list">
              <div class="learning-item" v-for="(item, i) in learningTopics" :key="i">$ {{ item }}</div>
            </div>
          </div>

          <div class="brain-section flex-1">
            <div class="section-title">activity feed</div>
            <div class="activity-feed" ref="feedRef">
              <div
                v-for="item in activities"
                :key="item.id"
                :class="['feed-line', `type-${item.type}`]"
              >
                <span class="time">{{ formatActivityTime(item.timestamp) }}</span>
                <span class="tag">{{ item.type }}</span>
                <span class="text">{{ truncate(item.content, 120) }}</span>
              </div>
              <div v-if="activities.length === 0" class="empty">waiting for wei...</div>
            </div>
          </div>

          <div class="brain-section">
            <div class="section-title">x / twitter</div>
            <div class="x-feed">
              <div v-for="item in xActivities" :key="item.id" class="x-item">
                <span :class="['x-type', `type-${item.type}`]">{{ xLabel(item.type) }}</span>
                <span class="x-time">{{ formatActivityTime(item.timestamp) }}</span>
                <span class="x-text">{{ truncate(item.content, 100) }}</span>
              </div>
              <div v-if="xActivities.length === 0" class="empty">no x activity yet</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const SERVER = import.meta.env.DEV ? "http://localhost:3001" : "";

const tabs = [
  { id: "log", label: "WEI LOG" },
  { id: "soul", label: "SOUL.MD" },
  { id: "brain", label: "BRAIN" },
];

const activeTab = ref("log");
const tradingLogs = ref([]);
const walletAddress = ref("");
const balance = ref(null);
const soulContent = ref("");
const activities = ref([]);
const xActivities = ref([]);
const learningTopics = ref([]);
const connected = ref(false);
const feedRef = ref(null);

const censoredWallet = computed(() => {
  if (!walletAddress.value) return "...";
  const w = walletAddress.value;
  return w.slice(0, 6) + "xxxxx" + w.slice(-4);
});

const walletShort = computed(() => {
  if (!walletAddress.value) return "...";
  return walletAddress.value.slice(0, 6) + "..." + walletAddress.value.slice(-4);
});

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString();
}

function formatActivityTime(ts) {
  return new Date(ts).toLocaleTimeString();
}

function shortAmount(amt) {
  if (amt === null || amt === undefined) return "-";
  const n = Number(amt);
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "..." : str;
}

function xLabel(type) {
  const labels = { tweet: "posted", reply: "replied", retweet: "retweeted", quote: "quoted" };
  return labels[type] || type;
}

function addActivity(item) {
  activities.value.push(item);
  if (activities.value.length > 200) {
    activities.value = activities.value.slice(-200);
  }
  if (["tweet", "reply", "retweet", "quote"].includes(item.type)) {
    xActivities.value.unshift(item);
    if (xActivities.value.length > 20) {
      xActivities.value = xActivities.value.slice(0, 20);
    }
  }
  nextTick(() => {
    if (feedRef.value) feedRef.value.scrollTop = feedRef.value.scrollHeight;
  });
}

// Fetch trading logs + status + balance
async function fetchData() {
  try {
    const [statusRes, balanceRes, logsRes] = await Promise.all([
      fetch(`${SERVER}/api/status`),
      fetch(`${SERVER}/api/wallet/balance`),
      fetch(`${SERVER}/api/wallet/transactions?limit=50`),
    ]);
    const status = await statusRes.json();
    walletAddress.value = status.wallet || "";

    const balData = await balanceRes.json();
    if (balData.balance !== null) balance.value = balData.balance;

    tradingLogs.value = await logsRes.json();
  } catch (err) {
    console.error("Terminal fetch error:", err);
  }
}

// Fetch soul.md
async function fetchSoul() {
  try {
    const res = await fetch(`${SERVER}/api/soul`);
    const data = await res.json();
    soulContent.value = data.content || data.soul || "";
  } catch (err) {
    console.error("Soul fetch error:", err);
  }
}

// Fetch learning topics
async function fetchLearning() {
  try {
    const res = await fetch(`${SERVER}/api/learning`);
    const data = await res.json();
    if (data.topics?.length) learningTopics.value = data.topics;
  } catch {}
}

let ws = null;
function connectWs() {
  const wsUrl = import.meta.env.DEV
    ? "ws://localhost:3001/ws"
    : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => { connected.value = true; };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "init") {
      activities.value = [];
      xActivities.value = [];
      const reversed = [...msg.data].reverse();
      reversed.forEach((item) => addActivity(item));
    } else if (msg.type === "activity") {
      addActivity(msg.data);
      if (msg.data.type === "wallet") fetchData();
    } else if (msg.type === "trading-cleared") {
      tradingLogs.value = [];
    } else if (msg.type === "trading-updated") {
      fetchData();
    } else if (msg.type === "soul-updated") {
      fetchSoul();
    }
  };

  ws.onclose = () => {
    connected.value = false;
    setTimeout(connectWs, 3000);
  };
  ws.onerror = () => ws.close();
}

onMounted(() => {
  fetchData();
  fetchSoul();
  fetchLearning();
  connectWs();
  setInterval(() => {
    fetch(`${SERVER}/api/wallet/balance`)
      .then((r) => r.json())
      .then((d) => { if (d.balance !== null) balance.value = d.balance; })
      .catch(() => {});
  }, 60000);
  setInterval(fetchLearning, 120000);
});

onBeforeUnmount(() => {
  if (ws) ws.close();
});
</script>

<style lang="scss" scoped>
.terminal-page {
  @apply fixed w-screen h-screen overflow-hidden;
  background: #0a0a0a;
  font-family: "Courier New", "Lucida Console", monospace;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.terminal-chrome {
  @apply w-full h-full flex flex-col;
  max-width: 1200px;
  max-height: 900px;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  background: #0d0d0d;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.8);
}

.terminal-titlebar {
  @apply flex items-center px-4 py-2;
  background: #1a1a1a;
  border-bottom: 1px solid #333;

  .terminal-dots {
    @apply flex gap-2 mr-4;
    .dot {
      width: 12px; height: 12px;
      border-radius: 50%;
      &.red { background: #ec695e; }
      &.yellow { background: #f4be4f; }
      &.green { background: #61c554; }
    }
  }

  .terminal-title {
    color: #666;
    font-size: 13px;
    flex: 1;
  }

  .back-link {
    color: #555;
    font-size: 12px;
    text-decoration: none;
    transition: color 0.2s;
    &:hover { color: #facc15; }
  }
}

.terminal-tabs {
  @apply flex;
  background: #111;
  border-bottom: 1px solid #222;

  .tab-btn {
    @apply px-6 py-2 cursor-pointer;
    background: none;
    border: none;
    color: #555;
    font-family: inherit;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;

    &:hover { color: #999; }

    &.active {
      color: #facc15;
      border-bottom-color: #facc15;
      background: rgba(250, 204, 21, 0.03);
    }
  }
}

.terminal-content {
  @apply flex-1 overflow-hidden;
}

.tab-panel {
  @apply flex flex-col h-full;
}

// --- WEI LOG TAB ---
.panel-header {
  @apply flex items-center gap-3 px-4 py-2;
  background: #0d0d0d;
  border-bottom: 1px solid #1a1a1a;

  .label {
    color: #555;
    font-size: 10px;
    letter-spacing: 2px;
  }
  .wallet-addr {
    color: #facc15;
    font-size: 12px;
  }
  .balance {
    color: #4ade80;
    font-size: 11px;
    margin-left: auto;
    &.loading { color: #555; }
  }
}

.log-table-header {
  @apply flex px-4 py-1;
  background: #0d0d0d;
  border-bottom: 1px solid #1a1a1a;

  .col {
    color: #444;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
}

.log-list {
  @apply flex-1 overflow-y-auto px-4;
  scrollbar-width: thin;
  scrollbar-color: #222 transparent;
}

.log-row {
  @apply flex py-1;
  border-bottom: 1px solid #111;
  font-size: 12px;

  &.incoming .col-dir { color: #4ade80; }
  &.incoming .col-amount { color: #4ade80; }
  &.outgoing .col-dir { color: #f87171; }
  &.outgoing .col-amount { color: #f87171; }
}

.col { color: #777; }
.col-type { width: 80px; flex-shrink: 0; text-transform: uppercase; font-size: 10px; }
.swap-type { color: #c084fc !important; }
.col-dir { width: 25px; flex-shrink: 0; font-weight: bold; }
.col-amount { width: 100px; flex-shrink: 0; }
.col-token { flex: 1; }
.col-time { width: 160px; flex-shrink: 0; color: #444; text-align: right; }

// --- SOUL TAB ---
.soul-content {
  @apply flex-1 overflow-y-auto p-4;
  scrollbar-width: thin;
  scrollbar-color: #222 transparent;
}

.soul-text {
  color: #888;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

// --- BRAIN TAB ---
.brain-header {
  @apply flex justify-between items-center px-4 py-2;
  background: #0d0d0d;
  border-bottom: 1px solid #1a1a1a;

  .brain-status {
    @apply flex items-center gap-2;
    color: #666;
    font-size: 11px;
    letter-spacing: 2px;

    .status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      &.on { background: #4ade80; }
      &.off { background: #f87171; }
    }
  }

  .brain-wallet {
    @apply flex items-center gap-2;
    .label { color: #555; font-size: 10px; }
    .wallet-addr { color: #facc15; font-size: 11px; }
    .balance { color: #4ade80; font-size: 11px; }
  }
}

.brain-section {
  @apply px-4 py-3;
  border-bottom: 1px solid #1a1a1a;

  &.flex-1 {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

.section-title {
  color: #555;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 6px;
}

.learning-item {
  color: #c084fc;
  font-size: 12px;
  margin-bottom: 2px;
}

.activity-feed {
  @apply flex-1 overflow-y-auto;
  scrollbar-width: thin;
  scrollbar-color: #222 transparent;
}

.feed-line {
  @apply flex gap-2 py-0.5;
  font-size: 12px;

  &.type-thinking .text { color: #c084fc; }
  &.type-tweet .text { color: #60a5fa; }
  &.type-reply .text { color: #22d3ee; }
  &.type-wallet .text { color: #facc15; }
  &.type-system .text { color: #444; }

  .time { color: #333; font-size: 11px; flex-shrink: 0; }
  .tag { color: #555; font-size: 10px; text-transform: uppercase; font-weight: bold; flex-shrink: 0; width: 60px; text-align: right; }
  .text { color: #777; }
}

.x-feed {
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #222 transparent;
}

.x-item {
  @apply flex gap-2 py-1;
  border-bottom: 1px solid #111;
  font-size: 11px;

  .x-type {
    font-size: 10px;
    text-transform: uppercase;
    flex-shrink: 0;
    width: 70px;
    &.type-tweet { color: #60a5fa; }
    &.type-reply { color: #22d3ee; }
    &.type-retweet { color: #34d399; }
    &.type-quote { color: #f472b6; }
  }
  .x-time { color: #333; font-size: 10px; flex-shrink: 0; }
  .x-text { color: #777; }
}

.empty {
  @apply text-center py-8;
  color: #333;
  font-size: 12px;
}
</style>
