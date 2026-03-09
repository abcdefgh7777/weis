import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use Railway persistent volume if available, otherwise local data folder
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const LOG_FILE = path.join(DATA_DIR, "activity.json");
const SOUL_FILE = path.join(DATA_DIR, "soul.md");

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let activities = [];
const MAX_ACTIVITIES = 1000;

// Load existing log
export function loadLog() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      activities = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
    }
  } catch (err) {
    activities = [];
  }
}

// Save log to disk
function saveLog() {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(activities, null, 2));
  } catch (err) {
    console.error("[ActivityLog] Save error:", err.message);
  }
}

// Add activity entry
export function addActivity(type, content, meta = {}) {
  const entry = {
    id: Date.now() + Math.random().toString(36).slice(2, 6),
    type, // "thinking", "tweet", "reply", "retweet", "quote", "wallet", "system"
    content,
    meta,
    timestamp: new Date().toISOString(),
  };

  activities.unshift(entry);

  // Trim old entries
  if (activities.length > MAX_ACTIVITIES) {
    activities = activities.slice(0, MAX_ACTIVITIES);
  }

  saveLog();
  return entry;
}

// Clear all activities
export function clearActivities() {
  activities = [];
  saveLog();
}

// Get all activities
export function getActivities(limit = 50, offset = 0) {
  return activities.slice(offset, offset + limit);
}

// Get activities by type
export function getActivitiesByType(type, limit = 50) {
  return activities.filter((a) => a.type === type).slice(0, limit);
}

// Soul.md — persist to data volume
export function getSoul() {
  // Try persistent volume first, fall back to local
  if (fs.existsSync(SOUL_FILE)) {
    return fs.readFileSync(SOUL_FILE, "utf-8");
  }
  // Copy from local soul.md on first run
  const localSoul = path.join(__dirname, "..", "soul.md");
  if (fs.existsSync(localSoul)) {
    const content = fs.readFileSync(localSoul, "utf-8");
    fs.writeFileSync(SOUL_FILE, content);
    return content;
  }
  return "";
}

export function saveSoul(content) {
  fs.writeFileSync(SOUL_FILE, content);
}

// Memory.md — Wei's persistent memory across conversations
const MEMORY_FILE = path.join(DATA_DIR, "memory.md");

export function getMemory() {
  if (fs.existsSync(MEMORY_FILE)) {
    return fs.readFileSync(MEMORY_FILE, "utf-8");
  }
  // Init with empty memory
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
  fs.writeFileSync(MEMORY_FILE, initial);
  return initial;
}

export function saveMemory(content) {
  fs.writeFileSync(MEMORY_FILE, content);
}

export function appendMemory(entry) {
  let memory = getMemory();
  // Add timestamped entry at the end
  const timestamp = new Date().toISOString().split("T")[0];
  memory += `\n- [${timestamp}] ${entry}`;
  // Keep memory file manageable
  const lines = memory.split("\n");
  if (lines.length > 200) {
    memory = lines.slice(0, 10).join("\n") + "\n...(older memories trimmed)...\n" + lines.slice(-150).join("\n");
  }
  fs.writeFileSync(MEMORY_FILE, memory);
  return memory;
}
