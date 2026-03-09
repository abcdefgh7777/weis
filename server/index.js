import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
const __server_dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__server_dirname, ".env") });
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";

import { getOrCreateWallet } from "./services/wallet.js";
import * as moonshot from "./services/moonshot.js";
import * as helius from "./services/helius.js";
import * as twitter from "./services/twitter.js";
import * as db from "./services/database.js";

const __dirname = __server_dirname;

// --- Serve built frontend in production ---
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  console.log("[Server] Serving frontend from dist/");
}

// --- Init ---
await db.initDB();
const wallet = getOrCreateWallet();
twitter.initTwitter();

// --- Express ---
const app = express();
app.use(cors());
app.use(express.json());

// --- Admin auth middleware ---
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminx123";

function requireAdmin(req, res, next) {
  const auth = req.headers["x-admin-key"] || req.query.admin_key;
  if (auth === ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: "unauthorized" });
}

const server = http.createServer(app);

// --- WebSocket for real-time updates to frontend monitor ---
const wss = new WebSocketServer({ server, path: "/ws" });
const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  const recent = db.getActivities(30);
  ws.send(JSON.stringify({ type: "init", data: recent }));
  ws.on("close", () => clients.delete(ws));
});

function broadcast(event) {
  const msg = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// Helper: log + broadcast
function logAndBroadcast(type, content, meta = {}) {
  const entry = db.addActivity(type, content, meta);
  broadcast({ type: "activity", data: entry });
  return entry;
}

// --- Agent State ---
let agentRunning = false;
let agentInterval = null;
let mentionCheckInterval = null;
let lastMentionId = null;

// --- Helius: wallet monitoring (starts when agent starts) ---
helius.setWalletAddress(wallet.walletAddress);
helius.setTransactionHandler(async (parsed) => {
  const txText = helius.formatTransaction(parsed);
  logAndBroadcast("wallet", txText, { signature: parsed.signature });

  // Store in trading logs DB
  db.addTradingLog(parsed);

  // Wei reacts to the transaction
  const reaction = await moonshot.reactToTransaction(txText);
  if (reaction) {
    logAndBroadcast("thinking", reaction, { trigger: "wallet" });

    if (twitter.isActive() && Math.random() > 0.5) {
      const result = await twitter.postTweet(reaction);
      const postedId = result?.data?.id || "";
      logAndBroadcast("tweet", reaction, { tweetId: postedId });
    }
  }
});

// --- Agent Loop ---
async function agentTick() {
  if (!agentRunning) return;

  try {
    if (Math.random() < 0.2) {
      logAndBroadcast("system", "wei is thinking...");
      const post = await moonshot.generatePost();
      if (post) {
        logAndBroadcast("thinking", post);

        if (twitter.isActive()) {
          const result = await twitter.postTweet(post);
          const postedId = result?.data?.id || "";
          logAndBroadcast("tweet", post, { tweetId: postedId });
        }
      }
    }
  } catch (err) {
    console.error("[Agent] Tick error:", err.message);
  }
}

async function checkMentions() {
  if (!agentRunning || !twitter.isActive()) return;

  try {
    const mentions = await twitter.getMentions(lastMentionId);
    if (mentions.length === 0) return;

    lastMentionId = mentions[0].id;

    for (const mention of mentions) {
      logAndBroadcast("system", `Mention from @${mention.author_id}: ${mention.text}`);

      const decision = await moonshot.shouldReply({
        author: mention.author_id,
        text: mention.text,
      });

      if (decision.thought) {
        logAndBroadcast("thinking", decision.thought);
      }

      if (decision.reply) {
        const reply = await moonshot.generateReply({
          author: mention.author_id,
          text: mention.text,
        });

        if (reply) {
          const result = await twitter.replyToTweet(mention.id, reply);
          const replyId = result?.data?.id || "";
          logAndBroadcast("reply", reply, { tweetId: replyId, inReplyTo: mention.id });
        }
      }
    }
  } catch (err) {
    console.error("[Agent] Mentions error:", err.message);
  }
}

function startAgent() {
  if (agentRunning) return;
  agentRunning = true;

  agentInterval = setInterval(agentTick, 5 * 60 * 1000);
  mentionCheckInterval = setInterval(checkMentions, 2 * 60 * 1000);
  helius.startPolling(15000);

  logAndBroadcast("system", "wei agent started wei");
  console.log("[Agent] Started");
}

function stopAgent() {
  agentRunning = false;
  if (agentInterval) clearInterval(agentInterval);
  if (mentionCheckInterval) clearInterval(mentionCheckInterval);
  helius.stopPolling();

  logAndBroadcast("system", "wei agent stopped");
  console.log("[Agent] Stopped");
}

// --- API Routes ---

// Blue check status
let blueCheckStatus = db.getKV("bluecheck", "under_review");

app.get("/api/status", (req, res) => {
  res.json({
    agentRunning,
    wallet: wallet.walletAddress,
    twitterConnected: twitter.isActive(),
    blueCheck: blueCheckStatus,
  });
});

app.post("/api/bluecheck", requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!["under_review", "verified", "not_applied"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }
  blueCheckStatus = status;
  db.setKV("bluecheck", status);
  res.json({ ok: true, status: blueCheckStatus });
});

// Activity log
app.get("/api/activities", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  res.json(db.getActivities(limit, offset));
});

// Start/stop agent
app.post("/api/agent/start", requireAdmin, (req, res) => {
  startAgent();
  res.json({ ok: true, status: "running" });
});

app.post("/api/agent/stop", requireAdmin, (req, res) => {
  stopAgent();
  res.json({ ok: true, status: "stopped" });
});

// Manual tweet
app.post("/api/tweet", requireAdmin, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });

  if (twitter.isActive()) {
    const result = await twitter.postTweet(text);
    const postedId = result?.data?.id || "";
    logAndBroadcast("tweet", text, { tweetId: postedId });
  }
  logAndBroadcast("thinking", text);
  res.json({ ok: true });
});

// Manual think
app.post("/api/think", requireAdmin, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  const response = await moonshot.think(prompt);
  if (response) {
    logAndBroadcast("thinking", response, { prompt });
  }
  res.json({ response: response || "(no response)" });
});

// Test reply
app.post("/api/test-reply", requireAdmin, async (req, res) => {
  const { author, text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });

  const username = author || "someone";
  logAndBroadcast("system", `tweet from @${username}: ${text}`);

  const decision = await moonshot.shouldReply({ author: username, text });
  if (decision.thought) {
    logAndBroadcast("thinking", decision.thought);
  }

  let reply = null;
  if (decision.reply) {
    reply = await moonshot.generateReply({ author: username, text });
    logAndBroadcast("reply", reply, { to: username });
  }

  res.json({ shouldReply: decision.reply, reply, thought: decision.thought });
});

// Chat with Wei
app.post("/api/test-chat", requireAdmin, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  logAndBroadcast("system", `someone said: ${message}`);
  const response = await moonshot.think(message);
  if (response) {
    logAndBroadcast("thinking", response);
    moonshot.rememberFromConversation(`someone said: "${message}" — wei replied: "${response}"`);
  }
  res.json({ response: response || "(no response)" });
});

// Wallet info
app.get("/api/wallet", requireAdmin, (req, res) => {
  res.json({
    address: wallet.walletAddress,
    privateKey: wallet.privateKey,
  });
});

// Wallet balance
app.get("/api/wallet/balance", async (req, res) => {
  const balance = await helius.getBalance();
  res.json({ balance });
});

// Wallet transactions (from Helius API)
app.get("/api/wallet/transactions", async (req, res) => {
  const txs = await helius.getTransactions(null, 20);
  const parsed = txs.map((tx) => helius.parseTransaction(tx));
  res.json(parsed);
});

// Trading logs (from DB — persistent)
// Also syncs from Helius if DB is empty
app.get("/api/trading-logs", async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  let logs = db.getTradingLogs(limit);

  // If no logs in DB, fetch from Helius and store them
  if (logs.length === 0) {
    try {
      const txs = await helius.getTransactions(null, 50);
      for (const tx of txs) {
        const parsed = helius.parseTransaction(tx);
        if (parsed.solTransfers.length > 0 || parsed.tokenTransfers.length > 0) {
          db.addTradingLog(parsed);
        }
      }
      logs = db.getTradingLogs(limit);
    } catch (err) {
      console.error("[Trading] Sync error:", err.message);
    }
  }

  res.json(logs);
});

// Clear activity log
app.post("/api/activities/clear", requireAdmin, (req, res) => {
  db.clearActivities();
  broadcast({ type: "init", data: [] });
  res.json({ ok: true });
});

// Delete specific activities
app.post("/api/activities/delete", requireAdmin, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids array required" });
  }
  db.deleteActivities(ids);
  // Broadcast updated list so all clients (Brain, Screen) refresh
  const updated = db.getActivities(30);
  broadcast({ type: "init", data: updated });
  res.json({ ok: true, deleted: ids.length });
});

// Force reply to a tweet
app.post("/api/force-reply", requireAdmin, async (req, res) => {
  const { tweetId, text } = req.body;
  if (!tweetId) return res.status(400).json({ error: "tweetId required" });

  let replyText = text;
  if (!replyText) {
    // Fetch the actual tweet so Wei can read it (+ see images)
    const tweet = await twitter.getTweet(tweetId);
    if (tweet) {
      logAndBroadcast("system", `reading tweet from @${tweet.author}...`);
      replyText = await moonshot.generateReply(tweet);
    } else {
      replyText = await moonshot.generateReply({ author: "someone", text: `(couldn't fetch tweet ${tweetId})` });
    }
  }

  if (replyText && twitter.isActive()) {
    const result = await twitter.replyToTweet(tweetId, replyText);
    const replyId = result?.data?.id || "";
    logAndBroadcast("reply", replyText, { tweetId: replyId, inReplyTo: tweetId });
  }
  res.json({ ok: true, reply: replyText });
});

// Force retweet
app.post("/api/force-retweet", requireAdmin, async (req, res) => {
  const { tweetId } = req.body;
  if (!tweetId) return res.status(400).json({ error: "tweetId required" });

  if (twitter.isActive()) {
    await twitter.retweet(tweetId);
    logAndBroadcast("retweet", `retweeted`, { tweetId });
  }
  res.json({ ok: true });
});

// Force quote tweet
app.post("/api/force-quote", requireAdmin, async (req, res) => {
  const { tweetId, text } = req.body;
  if (!tweetId) return res.status(400).json({ error: "tweetId required" });

  // Fetch the actual tweet so Wei can read it (+ see images)
  const tweet = await twitter.getTweet(tweetId);
  const tweetAuthor = tweet?.author || "";

  let quoteText = text;
  if (!quoteText) {
    if (tweet) {
      logAndBroadcast("system", `reading tweet from @${tweet.author}...`);
      const prompt = `Quote this tweet from @${tweet.author}:\n"${tweet.text}"\n\nWrite your quote tweet. Be thoughtful, add your perspective. End with wei.`;
      if (tweet.imageUrls.length > 0) {
        quoteText = await moonshot.thinkWithImages(prompt, tweet.imageUrls);
      } else {
        quoteText = await moonshot.generatePost(`quote tweet from @${tweet.author}: "${tweet.text}"`, { long: true });
      }
    } else {
      quoteText = await moonshot.generatePost(`quote a tweet (couldn't read it)`, { long: true });
    }
  }

  if (quoteText && twitter.isActive()) {
    const result = await twitter.quoteTweet(tweetId, quoteText, tweetAuthor);
    const quoteId = result?.data?.id || "";
    logAndBroadcast("quote", quoteText, { tweetId: quoteId, quotedTweet: tweetId });
  }
  res.json({ ok: true, quote: quoteText });
});

// Force post
app.post("/api/force-post", requireAdmin, async (req, res) => {
  const { topic, long } = req.body;
  if (!topic) return res.status(400).json({ error: "topic required" });

  logAndBroadcast("system", `wei is thinking...`);
  const post = await moonshot.generatePost(topic, { long: !!long });
  if (post) {
    logAndBroadcast("thinking", post);

    if (twitter.isActive()) {
      const result = await twitter.postTweet(post);
      const postedId = result?.data?.id || "";
      logAndBroadcast("tweet", post, { tweetId: postedId });
    }

    await moonshot.rememberFromConversation(`wei posted about: ${topic} — she said: ${post}`);
  }
  res.json({ ok: true, post: post || "(no response)" });
});

// Soul.md
app.get("/api/soul", (req, res) => {
  res.json({ soul: db.getSoul() });
});

app.post("/api/soul", requireAdmin, (req, res) => {
  const { soul } = req.body;
  if (!soul) return res.status(400).json({ error: "soul required" });
  db.saveSoul(soul);
  res.json({ ok: true });
});

// Memory.md
app.get("/api/memory", (req, res) => {
  res.json({ memory: db.getMemory() });
});

app.post("/api/memory", requireAdmin, (req, res) => {
  const { memory } = req.body;
  if (!memory) return res.status(400).json({ error: "memory required" });
  db.saveMemory(memory);
  res.json({ ok: true });
});

// Learning topics
app.get("/api/learning", (req, res) => {
  const memory = db.getMemory();
  const topics = extractLearningTopics(memory);
  res.json({ topics });
});

function extractLearningTopics(memory) {
  const lines = memory.split("\n");
  const topics = [];
  let inThinking = false;

  for (const line of lines) {
    if (line.includes("Things I'm Thinking About")) {
      inThinking = true;
      continue;
    }
    if (line.startsWith("##")) {
      inThinking = false;
      continue;
    }

    const trimmed = line.replace(/^[-▸•*]\s*/, "").replace(/^\[.*?\]\s*/, "").trim();
    if (!trimmed || trimmed === "(nothing yet)" || trimmed === "(nobody yet)") continue;

    if (inThinking && trimmed.length > 3) {
      topics.push(trimmed);
    }
  }

  const recentLines = lines.filter(l => l.match(/^\- \[\d{4}-/));
  for (const rl of recentLines.slice(-4)) {
    const cleaned = rl.replace(/^-\s*\[\d{4}-\d{2}-\d{2}\]\s*/, "").trim();
    if (cleaned.length > 3 && !topics.includes(cleaned)) {
      topics.push(cleaned);
    }
  }

  return topics.slice(0, 8);
}

// --- Serve frontend (production) ---
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// --- Start Server ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Wei Server] Running on http://localhost:${PORT}`);
  console.log(`[Wallet] ${wallet.walletAddress}`);
  console.log(`[Twitter] ${twitter.isActive() ? "Connected" : "Not configured"}`);
});
