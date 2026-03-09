<template>
  <!-- Password Gate -->
  <div v-if="!authenticated" class="login-container">
    <div class="login-box">
      <h1>Wei Admin</h1>
      <div class="input-group">
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          @keydown.enter="login"
          autofocus
        />
        <button @click="login" class="btn">Enter</button>
      </div>
      <p v-if="loginError" class="login-error">wrong password</p>
    </div>
  </div>

  <div v-else class="admin-container">
    <header class="admin-header">
      <h1>Wei Control Panel</h1>
      <div class="status-bar">
        <span :class="['status-dot', agentRunning ? 'active' : 'inactive']"></span>
        <span>{{ agentRunning ? "RUNNING" : "STOPPED" }}</span>
        <span class="divider">|</span>
        <span>X: {{ twitterConnected ? "Connected" : "Not configured" }}</span>
        <span class="divider">|</span>
        <span :class="['bluecheck-status', blueCheck]">{{ blueCheckLabel }}</span>
        <span class="divider">|</span>
        <span class="wallet-addr" @click="copyWallet">{{ walletShort }}</span>
      </div>
    </header>

    <div class="admin-grid">
      <!-- Controls -->
      <section class="panel controls-panel">
        <h2>Agent Controls</h2>
        <div class="btn-group">
          <button @click="startAgent" :disabled="agentRunning" class="btn btn-start">
            Start Agent
          </button>
          <button @click="stopAgent" :disabled="!agentRunning" class="btn btn-stop">
            Stop Agent
          </button>
        </div>

        <h2>Blue Check</h2>
        <div class="btn-group">
          <button
            v-for="opt in blueCheckOptions"
            :key="opt.value"
            @click="setBlueCheck(opt.value)"
            :class="['btn', blueCheck === opt.value ? 'btn-active' : '']"
          >{{ opt.label }}</button>
        </div>

        <h2>Manual Actions</h2>
        <div class="input-group">
          <input v-model="tweetText" placeholder="Write a tweet as Wei..." @keydown.enter="sendTweet" />
          <button @click="sendTweet" class="btn">Tweet</button>
        </div>
        <div class="input-group">
          <input v-model="thinkPrompt" placeholder="Make Wei think about..." @keydown.enter="sendThink" />
          <button @click="sendThink" class="btn">Think</button>
        </div>

        <h2>Force Post</h2>
        <p class="hint">Give Wei a topic — she'll generate and post in her style</p>
        <div class="input-group">
          <input v-model="forcePostTopic" placeholder="Topic: agi, her birth, memecoins..." @keydown.enter="sendForcePost" />
          <button @click="sendForcePost" class="btn btn-force" :disabled="forcePostLoading">
            {{ forcePostLoading ? 'Posting...' : 'Short Post' }}
          </button>
          <button @click="sendForcePostLong" class="btn btn-long" :disabled="forcePostLoading">
            {{ forcePostLoading ? 'Posting...' : 'Long Post' }}
          </button>
        </div>
        <div class="preset-topics">
          <button v-for="t in presetTopics" :key="t" @click="forcePostPreset(t)" class="btn btn-small btn-preset">{{ t }}</button>
        </div>
        <p v-if="lastForcePost" class="force-result">{{ lastForcePost }}</p>
      </section>

      <!-- Force X Actions -->
      <section class="panel force-x-panel">
        <h2>Force X Actions</h2>
        <p class="hint">Paste a tweet ID or URL — wei will reply / retweet / quote it</p>
        <div class="input-group">
          <input v-model="forceTweetInput" placeholder="Tweet ID or URL (https://x.com/.../status/123)" />
        </div>
        <div class="input-group">
          <input v-model="forceReplyText" placeholder="Reply text (leave empty for auto-generate)" @keydown.enter="doForceReply" />
        </div>
        <div class="btn-group">
          <button @click="doForceReply" class="btn btn-force" :disabled="forceXLoading">Reply</button>
          <button @click="doForceRetweet" class="btn" :disabled="forceXLoading">Retweet</button>
          <button @click="doForceQuote" class="btn btn-force" :disabled="forceXLoading">Quote</button>
        </div>
        <p v-if="forceXResult" class="force-result">{{ forceXResult }}</p>
      </section>

      <!-- Test Reply (simulate tweets) -->
      <section class="panel test-panel">
        <h2>Test Wei Replies</h2>
        <div class="test-chat">
          <div class="chat-messages" ref="chatRef">
            <div
              v-for="(msg, i) in chatMessages"
              :key="i"
              :class="['chat-msg', msg.role]"
            >
              <span class="chat-label">{{ msg.role === 'user' ? 'You' : 'Wei' }}</span>
              <span class="chat-text">{{ msg.text }}</span>
            </div>
            <div v-if="chatLoading" class="chat-msg system">
              <span class="chat-label">Wei</span>
              <span class="chat-text typing">thinking...</span>
            </div>
          </div>
          <div class="test-inputs">
            <div class="input-group">
              <input v-model="testAuthor" placeholder="@username" style="width:100px;flex:none;" />
              <input v-model="testTweet" placeholder="Simulate a tweet..." @keydown.enter="sendTestReply" />
              <button @click="sendTestReply" class="btn">Test Reply</button>
            </div>
            <div class="input-group">
              <input v-model="chatMessage" placeholder="Chat with Wei directly..." @keydown.enter="sendChat" />
              <button @click="sendChat" class="btn">Chat</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Soul Editor -->
      <section class="panel soul-panel">
        <h2>
          Soul.md
          <button @click="saveSoul" class="btn btn-small">Save</button>
        </h2>
        <textarea v-model="soulContent" class="soul-editor"></textarea>
      </section>

      <!-- Memory Editor -->
      <section class="panel memory-panel">
        <h2>
          Memory.md
          <button @click="saveMemory" class="btn btn-small">Save</button>
          <button @click="fetchMemory" class="btn btn-small" style="margin-left:4px;">Refresh</button>
        </h2>
        <p class="hint">Wei's persistent memory — she remembers things across conversations</p>
        <textarea v-model="memoryContent" class="soul-editor"></textarea>
      </section>

      <!-- Activity Feed -->
      <section class="panel activity-panel">
        <h2>
          Live Activity Feed
          <span class="feed-actions">
            <button v-if="selectedActivities.size > 0" @click="deleteSelected" class="btn btn-small btn-stop">
              Delete ({{ selectedActivities.size }})
            </button>
            <button @click="clearActivities" class="btn btn-small btn-stop">Clear All</button>
          </span>
        </h2>
        <div class="activity-feed" ref="feedRef">
          <div
            v-for="item in activities"
            :key="item.id"
            :class="['activity-item', `type-${item.type}`, { selected: selectedActivities.has(item.id) }]"
          >
            <input
              type="checkbox"
              class="activity-check"
              :checked="selectedActivities.has(item.id)"
              @change="toggleActivity(item.id)"
            />
            <span class="activity-time">{{ formatTime(item.timestamp) }}</span>
            <span class="activity-type">{{ item.type }}</span>
            <span class="activity-content">{{ item.content }}</span>
          </div>
          <div v-if="activities.length === 0" class="empty">No activity yet</div>
        </div>
      </section>

      <!-- Wallet -->
      <section class="panel wallet-panel">
        <h2>Wallet</h2>
        <div class="wallet-info">
          <p class="wallet-label">Address</p>
          <p class="wallet-full">{{ walletAddress }}</p>
          <p class="wallet-label">Private Key
            <button @click="showPvk = !showPvk" class="btn btn-small">{{ showPvk ? 'Hide' : 'Show' }}</button>
          </p>
          <p v-if="showPvk" class="wallet-full pvk">{{ walletPvk }}</p>
        </div>
        <h3 class="tx-title">Transactions</h3>
        <div class="tx-list">
          <div v-for="tx in transactions" :key="tx.signature" class="tx-item">
            <span class="tx-type">{{ tx.type }}</span>
            <div v-for="t in tx.solTransfers" :key="t.from || t.to" class="tx-detail">
              {{ t.direction }} {{ t.amount.toFixed(4) }} SOL
            </div>
            <div v-for="t in tx.tokenTransfers" :key="t.mint" class="tx-detail">
              {{ t.direction }} {{ t.amount }} {{ t.mint.slice(0, 8) }}...
            </div>
          </div>
          <div v-if="transactions.length === 0" class="empty">No transactions</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
const SERVER = import.meta.env.DEV ? "http://localhost:3001" : "";
const WS_URL = import.meta.env.DEV
  ? "ws://localhost:3001/ws"
  : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;

const ADMIN_PASSWORD = "adminx123";

// Helper for authenticated fetch
function adminFetch(url, opts = {}) {
  opts.headers = { ...opts.headers, "x-admin-key": ADMIN_PASSWORD };
  return fetch(url, opts);
}
const authenticated = ref(false);
const password = ref("");
const loginError = ref(false);

function login() {
  if (password.value === ADMIN_PASSWORD) {
    authenticated.value = true;
    sessionStorage.setItem("wei-admin", "1");
    loginError.value = false;
  } else {
    loginError.value = true;
  }
}

// Check if already logged in this session
if (sessionStorage.getItem("wei-admin") === "1") {
  authenticated.value = true;
}

const agentRunning = ref(false);
const twitterConnected = ref(false);
const walletAddress = ref("");
const walletPvk = ref("");
const showPvk = ref(false);
const activities = ref([]);
const transactions = ref([]);
const tweetText = ref("");
const thinkPrompt = ref("");
const soulContent = ref("");
const memoryContent = ref("");

// Force post
const forcePostTopic = ref("");
const forcePostLoading = ref(false);
const lastForcePost = ref("");
const presetTopics = [
  "wonder how she was born",
  "learning about agi",
  "memecoins are weird",
  "research update",
  "late night thought",
  "something she noticed online",
  "what she's been reading",
];
const feedRef = ref(null);
const chatRef = ref(null);

// Force X actions
const forceTweetInput = ref("");
const forceReplyText = ref("");
const forceXLoading = ref(false);
const forceXResult = ref("");

function extractTweetId(input) {
  if (!input) return null;
  // If it's a URL like https://x.com/user/status/12345 or https://twitter.com/user/status/12345
  const match = input.match(/status\/(\d+)/);
  if (match) return match[1];
  // If it's just a number
  if (/^\d+$/.test(input.trim())) return input.trim();
  return null;
}

async function doForceReply() {
  const tweetId = extractTweetId(forceTweetInput.value);
  if (!tweetId) { forceXResult.value = "invalid tweet ID or URL"; return; }
  forceXLoading.value = true;
  forceXResult.value = "";
  try {
    const res = await adminFetch(`${SERVER}/api/force-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tweetId, text: forceReplyText.value || undefined }),
    });
    const data = await res.json();
    forceXResult.value = data.reply ? `replied: ${data.reply}` : "sent";
    forceReplyText.value = "";
  } catch { forceXResult.value = "error"; }
  forceXLoading.value = false;
}

async function doForceRetweet() {
  const tweetId = extractTweetId(forceTweetInput.value);
  if (!tweetId) { forceXResult.value = "invalid tweet ID or URL"; return; }
  forceXLoading.value = true;
  forceXResult.value = "";
  try {
    await adminFetch(`${SERVER}/api/force-retweet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tweetId }),
    });
    forceXResult.value = `retweeted ${tweetId}`;
  } catch { forceXResult.value = "error"; }
  forceXLoading.value = false;
}

async function doForceQuote() {
  const tweetId = extractTweetId(forceTweetInput.value);
  if (!tweetId) { forceXResult.value = "invalid tweet ID or URL"; return; }
  forceXLoading.value = true;
  forceXResult.value = "";
  try {
    const res = await adminFetch(`${SERVER}/api/force-quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tweetId, text: forceReplyText.value || undefined }),
    });
    const data = await res.json();
    forceXResult.value = data.quote ? `quoted: ${data.quote}` : "sent";
    forceReplyText.value = "";
  } catch { forceXResult.value = "error"; }
  forceXLoading.value = false;
}

// Test reply state
const testAuthor = ref("someone");
const testTweet = ref("");
const chatMessage = ref("");
const chatMessages = ref([]);
const chatLoading = ref(false);

// Blue check
const blueCheck = ref("under_review");
const blueCheckOptions = [
  { value: "under_review", label: "Under Review" },
  { value: "verified", label: "Verified" },
  { value: "not_applied", label: "Not Applied" },
];
const blueCheckLabel = computed(() => {
  const opt = blueCheckOptions.find((o) => o.value === blueCheck.value);
  return opt ? `✓ ${opt.label}` : "";
});
async function setBlueCheck(status) {
  try {
    await adminFetch(`${SERVER}/api/bluecheck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    blueCheck.value = status;
  } catch {}
}

const walletShort = computed(() => {
  if (!walletAddress.value) return "...";
  return walletAddress.value.slice(0, 6) + "..." + walletAddress.value.slice(-4);
});

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

function copyWallet() {
  navigator.clipboard.writeText(walletAddress.value);
}

// API calls
async function fetchStatus() {
  try {
    const res = await adminFetch(`${SERVER}/api/status`);
    const data = await res.json();
    agentRunning.value = data.agentRunning;
    twitterConnected.value = data.twitterConnected;
    walletAddress.value = data.wallet;
    if (data.blueCheck) blueCheck.value = data.blueCheck;
  } catch (err) {
    console.error("Status fetch error:", err);
  }
}

const selectedActivities = ref(new Set());

function toggleActivity(id) {
  const s = new Set(selectedActivities.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selectedActivities.value = s;
}

async function deleteSelected() {
  const ids = [...selectedActivities.value];
  if (!ids.length) return;
  try {
    await adminFetch(`${SERVER}/api/activities/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    activities.value = activities.value.filter((a) => !selectedActivities.value.has(a.id));
    selectedActivities.value = new Set();
  } catch {}
}

async function clearActivities() {
  try {
    await adminFetch(`${SERVER}/api/activities/clear`, { method: "POST" });
    activities.value = [];
    selectedActivities.value = new Set();
  } catch {}
}

async function fetchActivities() {
  try {
    const res = await adminFetch(`${SERVER}/api/activities?limit=100`);
    activities.value = await res.json();
  } catch (err) {
    console.error("Activities fetch error:", err);
  }
}

async function fetchWallet() {
  try {
    const res = await adminFetch(`${SERVER}/api/wallet`);
    const data = await res.json();
    walletPvk.value = data.privateKey;
  } catch (err) {
    console.error("Wallet fetch error:", err);
  }
}

async function fetchTransactions() {
  try {
    const res = await adminFetch(`${SERVER}/api/wallet/transactions`);
    transactions.value = await res.json();
  } catch (err) {
    console.error("Transactions fetch error:", err);
  }
}

async function fetchSoul() {
  try {
    const res = await adminFetch(`${SERVER}/api/soul`);
    const data = await res.json();
    soulContent.value = data.soul;
  } catch (err) {
    console.error("Soul fetch error:", err);
  }
}

async function startAgent() {
  await adminFetch(`${SERVER}/api/agent/start`, { method: "POST" });
  agentRunning.value = true;
}

async function stopAgent() {
  await adminFetch(`${SERVER}/api/agent/stop`, { method: "POST" });
  agentRunning.value = false;
}

async function sendTweet() {
  if (!tweetText.value.trim()) return;
  await adminFetch(`${SERVER}/api/tweet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: tweetText.value }),
  });
  tweetText.value = "";
}

async function sendThink() {
  if (!thinkPrompt.value.trim()) return;
  await adminFetch(`${SERVER}/api/think`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: thinkPrompt.value }),
  });
  thinkPrompt.value = "";
}

// Test reply — simulate a tweet
async function sendTestReply() {
  if (!testTweet.value.trim()) return;
  const tweet = testTweet.value;
  const author = testAuthor.value || "someone";
  testTweet.value = "";

  chatMessages.value.push({ role: "user", text: `@${author}: ${tweet}` });
  chatLoading.value = true;
  scrollChat();

  try {
    const res = await adminFetch(`${SERVER}/api/test-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, text: tweet }),
    });
    const data = await res.json();

    if (data.thought) {
      chatMessages.value.push({ role: "system", text: `💭 ${data.thought}` });
    }
    if (data.shouldReply && data.reply) {
      chatMessages.value.push({ role: "wei", text: data.reply });
    } else if (!data.shouldReply) {
      chatMessages.value.push({ role: "system", text: "(wei chose not to reply)" });
    }
  } catch (err) {
    chatMessages.value.push({ role: "system", text: "(error connecting to server)" });
  }

  chatLoading.value = false;
  scrollChat();
}

// Chat with Wei directly
async function sendChat() {
  if (!chatMessage.value.trim()) return;
  const msg = chatMessage.value;
  chatMessage.value = "";

  chatMessages.value.push({ role: "user", text: msg });
  chatLoading.value = true;
  scrollChat();

  try {
    const res = await adminFetch(`${SERVER}/api/test-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    const data = await res.json();
    chatMessages.value.push({ role: "wei", text: data.response });
  } catch (err) {
    chatMessages.value.push({ role: "system", text: "(error connecting to server)" });
  }

  chatLoading.value = false;
  scrollChat();
}

function scrollChat() {
  nextTick(() => {
    if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight;
  });
}

async function saveSoul() {
  await adminFetch(`${SERVER}/api/soul`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ soul: soulContent.value }),
  });
}

// Force post
async function sendForcePost(long = false) {
  if (!forcePostTopic.value.trim() || forcePostLoading.value) return;
  forcePostLoading.value = true;
  lastForcePost.value = "";
  try {
    const res = await adminFetch(`${SERVER}/api/force-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: forcePostTopic.value, long }),
    });
    const data = await res.json();
    lastForcePost.value = data.post;
    forcePostTopic.value = "";
  } catch (err) {
    lastForcePost.value = "(error)";
  }
  forcePostLoading.value = false;
}

function sendForcePostLong() {
  sendForcePost(true);
}

function forcePostPreset(topic) {
  forcePostTopic.value = topic;
  sendForcePost();
}

// Memory
async function fetchMemory() {
  try {
    const res = await adminFetch(`${SERVER}/api/memory`);
    const data = await res.json();
    memoryContent.value = data.memory;
  } catch (err) {
    console.error("Memory fetch error:", err);
  }
}

async function saveMemory() {
  await adminFetch(`${SERVER}/api/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memory: memoryContent.value }),
  });
}

// WebSocket for real-time updates
let ws = null;
function connectWs() {
  ws = new WebSocket(WS_URL);
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "init") {
      activities.value = msg.data;
    } else if (msg.type === "activity") {
      activities.value.unshift(msg.data);
      if (activities.value.length > 200) {
        activities.value = activities.value.slice(0, 200);
      }
    }
  };
  ws.onclose = () => {
    setTimeout(connectWs, 3000);
  };
  ws.onerror = () => ws.close();
}

onMounted(() => {
  fetchStatus();
  fetchActivities();
  fetchTransactions();
  fetchWallet();
  fetchSoul();
  fetchMemory();
  connectWs();
});

onBeforeUnmount(() => {
  if (ws) ws.close();
});
</script>

<style lang="scss" scoped>
.admin-container {
  @apply min-h-screen bg-gray-950 text-white p-6;
  font-family: "Noto Sans SC", monospace, sans-serif;
}

.admin-header {
  @apply mb-6;
  h1 { @apply text-2xl font-bold; }
}

.status-bar {
  @apply flex items-center gap-2 mt-2 text-sm text-gray-400;
}
.status-dot {
  @apply w-2 h-2 rounded-full;
  &.active { @apply bg-green-500; }
  &.inactive { @apply bg-red-500; }
}
.divider { @apply text-gray-600; }
.wallet-addr { @apply cursor-pointer hover:text-white; }

.admin-grid {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-4;
}

.panel {
  @apply bg-gray-900 rounded-lg p-4 border border-gray-800;
  h2 {
    @apply text-lg font-semibold mb-3 flex items-center justify-between;
  }
}

.btn {
  @apply px-4 py-2 bg-gray-700 rounded text-sm hover:bg-gray-600 transition-colors
    disabled:opacity-40 disabled:cursor-not-allowed;
}
.btn-start { @apply bg-green-800 hover:bg-green-700; }
.btn-stop { @apply bg-red-800 hover:bg-red-700; }
.btn-active { @apply bg-blue-700 hover:bg-blue-600 ring-1 ring-blue-400; }
.btn-small { @apply px-2 py-1 text-xs; }

.bluecheck-status {
  @apply text-xs;
  &.verified { @apply text-blue-400; }
  &.under_review { @apply text-yellow-500; }
  &.not_applied { @apply text-gray-500; }
}

.btn-group {
  @apply flex gap-2 mb-4;
}

.input-group {
  @apply flex gap-2 mb-2;
  input {
    @apply flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm
      text-white outline-none focus:border-gray-500;
  }
}

.soul-editor {
  @apply w-full h-64 bg-gray-800 border border-gray-700 rounded p-3 text-sm
    text-gray-300 outline-none resize-y font-mono;
}

.activity-feed {
  @apply max-h-96 overflow-y-auto space-y-1;
}
.feed-actions {
  @apply flex gap-1;
}
.activity-item {
  @apply flex gap-2 text-sm py-1 px-2 rounded items-center;
  &.selected { @apply bg-red-950 bg-opacity-40; }
  &.type-thinking { @apply bg-purple-950 bg-opacity-30; }
  &.type-tweet { @apply bg-blue-950 bg-opacity-30; }
  &.type-reply { @apply bg-cyan-950 bg-opacity-30; }
  &.type-wallet { @apply bg-yellow-950 bg-opacity-30; }
  &.type-system { @apply bg-gray-800 bg-opacity-30; }
}
.activity-check {
  @apply w-3 h-3 shrink-0 cursor-pointer accent-red-500;
}
.activity-time { @apply text-gray-500 shrink-0; }
.activity-type {
  @apply text-gray-400 uppercase text-xs font-bold shrink-0
    w-16 text-right;
}
.activity-content { @apply text-gray-200; }

.wallet-full {
  @apply text-xs text-gray-500 mb-3 break-all;
}
.tx-list { @apply space-y-2 max-h-64 overflow-y-auto; }
.tx-item {
  @apply bg-gray-800 rounded p-2 text-sm;
}
.tx-type { @apply text-yellow-500 font-bold text-xs; }
.tx-detail { @apply text-gray-300 text-xs mt-1; }

.empty { @apply text-gray-600 text-sm text-center py-4; }

.login-container {
  @apply min-h-screen bg-gray-950 flex items-center justify-center;
}
.login-box {
  @apply bg-gray-900 border border-gray-800 rounded-lg p-8 w-80;
  h1 { @apply text-xl font-bold text-white mb-4 text-center; }
  .input-group {
    @apply flex gap-2;
    input {
      @apply flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm
        text-white outline-none focus:border-gray-500;
    }
  }
}
.login-error {
  @apply text-red-500 text-sm mt-2 text-center;
}

.wallet-info {
  @apply mb-3;
}
.wallet-label {
  @apply text-xs text-gray-500 mb-1 flex items-center gap-2;
}
.pvk {
  @apply text-red-400 bg-red-950 bg-opacity-30 p-2 rounded;
}
.tx-title {
  @apply text-sm font-semibold text-gray-400 mb-2;
}

.test-panel {
  @apply lg:col-span-2;
}
.test-chat {
  @apply flex flex-col;
}
.chat-messages {
  @apply bg-gray-800 rounded p-3 mb-3 max-h-80 overflow-y-auto space-y-2;
  min-height: 200px;
}
.chat-msg {
  @apply text-sm py-1;
  &.user .chat-text { @apply text-blue-300; }
  &.wei .chat-text { @apply text-purple-300; }
  &.system .chat-text { @apply text-gray-500 italic; }
}
.chat-label {
  @apply text-gray-500 text-xs font-bold uppercase mr-2;
}
.chat-text {
  @apply text-gray-200;
}
.typing {
  @apply animate-pulse text-gray-500;
}
.test-inputs {
  @apply space-y-2;
}

.hint {
  @apply text-xs text-gray-500 mb-2;
}

.btn-force { @apply bg-purple-800 hover:bg-purple-700; }
.btn-long { @apply bg-indigo-800 hover:bg-indigo-700; }

.preset-topics {
  @apply flex flex-wrap gap-1 mt-2;
}
.btn-preset {
  @apply bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white;
}

.force-result {
  @apply text-sm text-purple-300 mt-2 p-2 bg-purple-950 bg-opacity-30 rounded;
}

.force-x-panel {
  @apply lg:col-span-2;
}

.memory-panel {
  .hint {
    @apply mb-2;
  }
}
</style>
