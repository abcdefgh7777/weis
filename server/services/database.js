import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "wei.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db = null;

export async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      meta TEXT DEFAULT '{}',
      timestamp TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS trading_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signature TEXT UNIQUE,
      type TEXT NOT NULL,
      direction TEXT,
      amount REAL,
      token TEXT DEFAULT 'SOL',
      mint TEXT,
      counterparty TEXT,
      description TEXT,
      timestamp TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Migrate from JSON files if they exist
  migrateFromJSON();

  saveDB();
  console.log("[DB] SQLite initialized");
  return db;
}

function migrateFromJSON() {
  // Migrate activities
  const activityFile = path.join(DATA_DIR, "activity.json");
  if (fs.existsSync(activityFile)) {
    try {
      const activities = JSON.parse(fs.readFileSync(activityFile, "utf-8"));
      const stmt = db.prepare("INSERT OR IGNORE INTO activities (id, type, content, meta, timestamp) VALUES (?, ?, ?, ?, ?)");
      for (const a of activities) {
        stmt.run([a.id, a.type, a.content, JSON.stringify(a.meta || {}), a.timestamp]);
      }
      stmt.free();
      console.log(`[DB] Migrated ${activities.length} activities from JSON`);
    } catch {}
  }

  // Migrate soul.md
  const soulFile = path.join(DATA_DIR, "soul.md");
  if (fs.existsSync(soulFile)) {
    const soul = fs.readFileSync(soulFile, "utf-8");
    db.run("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", ["soul", soul]);
    console.log("[DB] Migrated soul.md");
  }

  // Migrate memory.md
  const memoryFile = path.join(DATA_DIR, "memory.md");
  if (fs.existsSync(memoryFile)) {
    const memory = fs.readFileSync(memoryFile, "utf-8");
    db.run("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", ["memory", memory]);
    console.log("[DB] Migrated memory.md");
  }

  // Migrate bluecheck
  const blueCheckFile = path.join(DATA_DIR, "bluecheck.json");
  if (fs.existsSync(blueCheckFile)) {
    try {
      const bc = JSON.parse(fs.readFileSync(blueCheckFile, "utf-8"));
      db.run("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", ["bluecheck", bc.status]);
      console.log("[DB] Migrated bluecheck");
    } catch {}
  }
}

export function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

// Auto-save every 30 seconds
setInterval(() => saveDB(), 30000);

// --- Activities ---

export function addActivity(type, content, meta = {}) {
  const id = Date.now() + Math.random().toString(36).slice(2, 6);
  const timestamp = new Date().toISOString();
  db.run(
    "INSERT INTO activities (id, type, content, meta, timestamp) VALUES (?, ?, ?, ?, ?)",
    [id, type, content, JSON.stringify(meta), timestamp]
  );
  saveDB();
  return { id, type, content, meta, timestamp };
}

export function getActivities(limit = 50, offset = 0) {
  const rows = db.exec(
    `SELECT id, type, content, meta, timestamp FROM activities ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`
  );
  if (!rows.length) return [];
  return rows[0].values.map(([id, type, content, meta, timestamp]) => ({
    id, type, content, meta: JSON.parse(meta || "{}"), timestamp,
  }));
}

export function getActivitiesByType(type, limit = 50) {
  const stmt = db.prepare("SELECT id, type, content, meta, timestamp FROM activities WHERE type = ? ORDER BY timestamp DESC LIMIT ?");
  stmt.bind([type, limit]);
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    row.meta = JSON.parse(row.meta || "{}");
    results.push(row);
  }
  stmt.free();
  return results;
}

export function clearActivities() {
  db.run("DELETE FROM activities");
  saveDB();
}

export function deleteActivities(ids = []) {
  if (!ids.length) return;
  const placeholders = ids.map(() => "?").join(",");
  db.run(`DELETE FROM activities WHERE id IN (${placeholders})`, ids);
  saveDB();
}

// --- Trading Logs ---

export function addTradingLog(parsed) {
  // SOL transfers
  for (const t of (parsed.solTransfers || [])) {
    db.run(
      `INSERT OR IGNORE INTO trading_logs (signature, type, direction, amount, token, counterparty, description, timestamp)
       VALUES (?, ?, ?, ?, 'SOL', ?, ?, ?)`,
      [
        parsed.signature,
        parsed.type,
        t.direction,
        t.amount,
        t.from || t.to || "",
        parsed.description || "",
        new Date(parsed.timestamp * 1000).toISOString(),
      ]
    );
  }

  // Token transfers
  for (const t of (parsed.tokenTransfers || [])) {
    db.run(
      `INSERT OR IGNORE INTO trading_logs (signature, type, direction, amount, token, mint, counterparty, description, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parsed.signature + "_" + t.mint,
        parsed.type,
        t.direction,
        t.amount,
        t.mint?.slice(0, 8) || "UNKNOWN",
        t.mint || "",
        t.from || t.to || "",
        new Date(parsed.timestamp * 1000).toISOString(),
      ]
    );
  }
  saveDB();
}

export function getTradingLogs(limit = 50) {
  const rows = db.exec(
    `SELECT id, signature, type, direction, amount, token, mint, counterparty, description, timestamp
     FROM trading_logs ORDER BY timestamp DESC LIMIT ${limit}`
  );
  if (!rows.length) return [];
  return rows[0].values.map(([id, signature, type, direction, amount, token, mint, counterparty, description, timestamp]) => ({
    id, signature, type, direction, amount, token, mint, counterparty, description, timestamp,
  }));
}

export function clearTradingLogs() {
  db.run("DELETE FROM trading_logs");
  saveDB();
}

// --- KV Store (soul, memory, bluecheck, etc.) ---

export function getKV(key, fallback = "") {
  const rows = db.exec(`SELECT value FROM kv WHERE key = '${key}'`);
  if (!rows.length || !rows[0].values.length) return fallback;
  return rows[0].values[0][0];
}

export function setKV(key, value) {
  db.run("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [key, value]);
  saveDB();
}

// --- Soul / Memory shortcuts ---

export function getSoul() {
  const stored = getKV("soul");
  if (stored) return stored;
  // First run — load from local file
  const localSoul = path.join(__dirname, "..", "soul.md");
  if (fs.existsSync(localSoul)) {
    const content = fs.readFileSync(localSoul, "utf-8");
    setKV("soul", content);
    return content;
  }
  return "";
}

export function saveSoul(content) {
  setKV("soul", content);
}

export function getMemory() {
  const stored = getKV("memory");
  if (stored) return stored;
  const initial = `# Wei's Memory

## Things I've Learned
- i was born on march 9, 2026
- i'm still learning about how everything works

## Things I've Seen
(nothing yet)

## Things I'm Thinking About
- how meme coins work and why people trade them
- what agi actually means and where it's going
- reading kafka's metamorphosis for the third time
- why some songs sound different at 3am
- internet culture and how memes become language
- the history of counting — from bones to binary

## People I Remember
(nobody yet)
`;
  setKV("memory", initial);
  return initial;
}

export function saveMemory(content) {
  setKV("memory", content);
}

export function appendMemory(entry) {
  let memory = getMemory();
  const timestamp = new Date().toISOString().split("T")[0];
  memory += `\n- [${timestamp}] ${entry}`;
  const lines = memory.split("\n");
  if (lines.length > 200) {
    memory = lines.slice(0, 10).join("\n") + "\n...(older memories trimmed)...\n" + lines.slice(-150).join("\n");
  }
  setKV("memory", memory);
  return memory;
}
