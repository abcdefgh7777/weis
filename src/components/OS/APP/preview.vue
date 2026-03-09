<template>
  <div class="app-preview-box">
    <header
      class="custom-header"
      @mousedown.self="onDrag($event)"
      @dblclick.self="onMax()"
    >
      <h2 class="app-name">
        <i
          class="iconfont"
          :class="appInfo.icon"
          :style="{
            color: appInfo.iconColor || 'rgba(255, 255, 255, 0.8)',
          }"
        ></i>
        <span>{{ appInfo.name }}</span>
      </h2>
      <div class="header-right">
        <div class="status-indicator">
          <span :class="['dot', connected ? 'on' : 'off']"></span>
          <span>{{ connected ? 'live' : 'offline' }}</span>
        </div>
        <div class="window-controls">
          <span class="wc-btn wc-max" @click="onMax()"></span>
          <span class="wc-btn wc-min" @click="onMin()"></span>
          <span class="wc-btn wc-close" @click="onClose()"></span>
        </div>
      </div>
    </header>

    <!-- Top bar: wallet + status -->
    <div class="top-bar">
      <div class="wallet-info">
        <span class="label">SOL</span>
        <span class="wallet-addr">{{ walletShort }}</span>
        <span class="balance" v-if="balance !== null">{{ balance.toFixed(4) }} SOL</span>
      </div>
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>LEARNING</span>
      </div>
    </div>

    <div class="main-content">
      <!-- Left column -->
      <div class="left-col">
        <!-- Learning -->
        <div class="section learning-section">
          <div class="section-title">currently learning</div>
          <div class="learning-list">
            <div class="learning-item" v-for="(item, i) in learningTopics" :key="i">▸ {{ item }}</div>
          </div>
        </div>

        <!-- Activity feed -->
        <div class="section feed-section">
          <div class="section-title">activity</div>
          <div class="feed" ref="feedRef">
            <div
              v-for="item in activities"
              :key="item.id"
              :class="['line', `type-${item.type}`]"
            >
              <span class="time">{{ formatTime(item.timestamp) }}</span>
              <span class="tag">{{ item.type }}</span>
              <span class="text">{{ truncate(item.content, 100) }}</span>
            </div>
            <div v-if="activities.length === 0" class="empty">waiting for wei...</div>
          </div>
        </div>
      </div>

      <!-- Right column: X activity -->
      <div class="right-col">
        <div class="section-title">x / twitter activity</div>
        <div class="x-feed">
          <div v-for="item in xActivities" :key="item.id" class="x-item">
            <div class="x-top">
              <span :class="['x-type', `type-${item.type}`]">{{ xLabel(item.type) }}</span>
              <span class="x-time">{{ formatTime(item.timestamp) }}</span>
            </div>
            <div class="x-content">{{ truncate(item.content, 140) }}</div>
            <a :href="xLink(item)" target="_blank" class="x-link">view on x ↗</a>
          </div>
          <div v-if="xActivities.length === 0" class="empty">waiting for activity...</div>
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

const activities = ref([]);
const xActivities = ref([]);
const connected = ref(false);
const feedRef = ref(null);
const walletAddress = ref("");
const balance = ref(null);

const learningTopics = ref([]);

const walletShort = computed(() => {
  if (!walletAddress.value) return "...";
  return walletAddress.value.slice(0, 6) + "..." + walletAddress.value.slice(-4);
});

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString();
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "..." : str;
}

function xLabel(type) {
  const labels = { tweet: "posted", reply: "replied", retweet: "retweeted", quote: "quoted" };
  return labels[type] || type;
}

function xLink(item) {
  const tweetId = item.meta?.tweetId || "";
  return tweetId ? `https://x.com/weicli0x/status/${tweetId}` : "https://x.com/weicli0x";
}

function scrollFeed() {
  nextTick(() => {
    if (feedRef.value) {
      feedRef.value.scrollTop = feedRef.value.scrollHeight;
    }
  });
}

function addActivity(item) {
  activities.value.push(item);
  if (activities.value.length > 200) {
    activities.value = activities.value.slice(-200);
  }

  // X activities go to right column too
  if (["tweet", "reply", "retweet", "quote"].includes(item.type)) {
    xActivities.value.unshift(item);
    if (xActivities.value.length > 20) {
      xActivities.value = xActivities.value.slice(0, 20);
    }
  }

  scrollFeed();
}

// Fetch wallet + balance
async function fetchStatus() {
  try {
    const [statusRes, balanceRes] = await Promise.all([
      fetch(`${SERVER}/api/status`),
      fetch(`${SERVER}/api/wallet/balance`),
    ]);
    const data = await statusRes.json();
    walletAddress.value = data.wallet || "";
    const balData = await balanceRes.json();
    if (balData.balance !== null) balance.value = balData.balance;
  } catch {}
}

// Fetch learning topics from memory
async function fetchLearning() {
  try {
    const res = await fetch(`${SERVER}/api/learning`);
    const data = await res.json();
    if (data.topics?.length) {
      learningTopics.value = data.topics;
    }
  } catch {}
}

let ws = null;
function connectWs() {
  const wsUrl = import.meta.env.DEV
    ? "ws://localhost:3001/ws"
    : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    connected.value = true;
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "init") {
      // Reset — reflects any deletions from admin
      activities.value = [];
      xActivities.value = [];
      const reversed = [...msg.data].reverse();
      reversed.forEach((item) => addActivity(item));
    } else if (msg.type === "activity") {
      addActivity(msg.data);
    }
  };

  ws.onclose = () => {
    connected.value = false;
    setTimeout(connectWs, 3000);
  };
  ws.onerror = () => ws.close();
}

onMounted(() => {
  fetchStatus();
  fetchLearning();
  connectWs();
  // Refresh learning topics every 2 minutes
  setInterval(fetchLearning, 120000);
});

onBeforeUnmount(() => {
  if (ws) ws.close();
});
</script>

<style lang="scss" scoped>
.app-preview-box {
  @apply w-full h-full bg-black text-white;
  font-family: "Courier New", monospace;
  display: flex;
  flex-direction: column;

  .custom-header {
    @include glass-bg-dark(0);
    @apply w-full h-8 absolute top-0 left-0
      flex justify-between items-center px-2 z-10;

    .app-name {
      @apply flex items-center gap-2 h-full text-base leading-8;
    }

    .header-right {
      @apply flex items-center gap-3;
    }

    .status-indicator {
      @apply flex items-center gap-1 text-xs text-gray-500;

      .dot {
        @apply w-1.5 h-1.5 rounded-full;
        &.on { @apply bg-green-500; }
        &.off { @apply bg-red-500; }
      }
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

  .top-bar {
    @apply flex justify-between items-center px-5 py-2 mt-8;
    border-bottom: 1px solid #1a1a1a;
    background: #0d0d0d;
    flex-shrink: 0;

    .wallet-info {
      @apply flex items-center gap-2;
      .label { color: #666; font-size: 11px; }
      .wallet-addr { color: #facc15; font-size: 12px; }
      .balance { color: #4ade80; font-size: 11px; }
    }

    .status-badge {
      @apply flex items-center gap-1;
      color: #facc15;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;

      .status-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: #facc15;
        display: inline-block;
      }
    }
  }

  .main-content {
    @apply flex flex-1 overflow-hidden;
  }

  .left-col {
    @apply flex-1 flex flex-col overflow-hidden;
    border-right: 1px solid #1a1a1a;
  }

  .right-col {
    width: 340px;
    @apply flex flex-col overflow-hidden p-3;
  }

  .section-title {
    color: #666;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 8px;
  }

  .learning-section {
    @apply px-5 py-3;
    border-bottom: 1px solid #1a1a1a;
    flex-shrink: 0;
  }

  .learning-item {
    color: #c084fc;
    font-size: 12px;
    margin-bottom: 3px;
  }

  .feed-section {
    @apply flex-1 flex flex-col overflow-hidden px-5 pt-3;
  }

  .feed {
    @apply flex-1 overflow-y-auto;
    scrollbar-width: thin;
    scrollbar-color: #222 transparent;
  }

  .line {
    @apply flex gap-2 py-0.5;
    font-size: 12px;

    &.type-thinking .text { color: #c084fc; }
    &.type-tweet .text { color: #60a5fa; }
    &.type-reply .text { color: #22d3ee; }
    &.type-wallet .text { color: #facc15; }
    &.type-system .text { color: #555; }
  }

  .time { @apply text-gray-700 shrink-0; font-size: 11px; }
  .tag { @apply text-gray-600 uppercase font-bold shrink-0 w-14 text-right; font-size: 10px; }
  .text { color: #888; }

  .x-feed {
    @apply flex-1 overflow-y-auto;
    scrollbar-width: thin;
    scrollbar-color: #222 transparent;
  }

  .x-item {
    border-bottom: 1px solid #1a1a1a;
    padding-bottom: 8px;
    margin-bottom: 8px;
  }

  .x-top {
    @apply flex justify-between mb-1;
  }

  .x-type {
    font-size: 10px;
    text-transform: uppercase;
    &.type-tweet { color: #60a5fa; }
    &.type-reply { color: #22d3ee; }
    &.type-retweet { color: #34d399; }
    &.type-quote { color: #f472b6; }
  }

  .x-time { color: #333; font-size: 10px; }

  .x-content {
    color: #999;
    font-size: 12px;
    line-height: 1.4;
  }

  .x-link {
    color: #444;
    font-size: 10px;
    text-decoration: none;
    margin-top: 3px;
    display: inline-block;

    &:hover { color: #666; }
  }

  .empty {
    @apply text-gray-700 text-center py-6;
    font-size: 12px;
  }
}
</style>
