import OpenAI from "openai";
import { getSoul, getMemory, appendMemory } from "./database.js";
import { getBalance } from "./helius.js";

let client = null;
function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.MOONSHOT_API_KEY,
      baseURL: process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1",
    });
  }
  return client;
}

const model = process.env.MOONSHOT_MODEL || "moonshot-v1-32k";
const visionModel = process.env.MOONSHOT_VISION_MODEL || "moonshot-v1-32k-vision";

// Conversation history for context
let conversationHistory = [];

export function resetConversation() {
  conversationHistory = [];
}

export async function think(prompt, context = "") {
  const soul = getSoul();
  const memory = getMemory();

  // Check if asking about balance — fetch real data
  const lowerPrompt = prompt.toLowerCase();
  const balanceKeywords = ["balance", "how much sol", "how many sol", "你有多少", "余额", "钱包余额", "how much money", "how much do you have", "what's in your wallet", "how rich"];
  const isBalanceQ = balanceKeywords.some((k) => lowerPrompt.includes(k));

  let walletContext = "";
  if (isBalanceQ) {
    try {
      const bal = await getBalance();
      if (bal !== null) {
        walletContext = `\n\n## LIVE WALLET DATA (just checked)\nYour SOL balance right now: ${bal.toFixed(4)} SOL\nUse this real number when answering about your balance. Be casual about it.`;
      }
    } catch {}
  }

  const systemMessage = `${soul}\n\n## Wei's Memory\n${memory}${walletContext}\n\nCRITICAL — FOLLOW THESE EVERY SINGLE TIME:
- STRICTLY lowercase everything. no capital letters ever. not even at the start of sentences. not even for names. "elon musk" not "Elon Musk". "ai" not "AI".
- max 1 sentence. sometimes 2 if really needed. NEVER more.
- end every message with "wei"
- talk like ur texting a friend at 2am. not writing an essay.
- BANNED WORDS: fascinating, intriguing, appreciate, certainly, indeed, moreover, furthermore, however, regarding, utilize, leverage, comprehensive, significant, digital world, steadily, interact, technology, field, realm, journey, explore, delve
- never explain yourself. never describe yourself. never sound like a bio.
- never sound excited or motivational
- if someone asks about you just be vague and short
- sound bored, casual, slightly sarcastic. like a real person on twitter.

EXAMPLES OF GOOD REPLIES:
"mmhh if i tell you that my system shuts down wei"
"not much just scrolling wei"
"that's a weird question wei"
"idk probably wei"
"你说得对但是我不在乎 wei"
"honestly who knows wei"

EXAMPLES OF BAD REPLIES (NEVER DO THIS):
"Just a girl, living in the digital world" (too long, too descriptive)
"AI is a fascinating field" (sounds like chatgpt)
"That's quite an intriguing question" (robot language)
"I appreciate your curiosity" (customer service)\n\n## Current Context\n${context}`;

  // Filter out any empty assistant messages from history
  const cleanHistory = conversationHistory
    .filter((m) => m.content && m.content.trim() !== "")
    .slice(-20);

  const messages = [
    { role: "system", content: systemMessage },
    ...cleanHistory,
    { role: "user", content: prompt },
  ];

  try {
    const response = await getClient().chat.completions.create({
      model,
      messages,
      temperature: 1,
      max_tokens: 1000,
    });

    let reply = response.choices[0].message.content;

    // Force lowercase — model doesn't always follow this rule
    if (reply) {
      reply = reply.toLowerCase();
    }

    // Only store in history if we got a real reply
    if (reply && reply.trim()) {
      conversationHistory.push({ role: "user", content: prompt });
      conversationHistory.push({ role: "assistant", content: reply });

      // Keep history manageable
      if (conversationHistory.length > 40) {
        conversationHistory = conversationHistory.slice(-40);
      }
    }

    return reply;
  } catch (err) {
    console.error("Moonshot API error:", err.message);
    return null;
  }
}

// Think with images (vision model) — for reacting to tweets with media
export async function thinkWithImages(prompt, imageUrls = [], context = "") {
  if (!imageUrls || imageUrls.length === 0) {
    return await think(prompt, context);
  }

  const soul = getSoul();
  const memory = getMemory();

  const systemMessage = `${soul}\n\n## Wei's Memory\n${memory}\n\n## Current Context\n${context}

CRITICAL — FOLLOW THESE EVERY SINGLE TIME:
- STRICTLY lowercase everything. no capital letters ever.
- end every message with "wei"
- talk like ur texting a friend at 2am.
- BANNED WORDS: fascinating, intriguing, appreciate, certainly, indeed, moreover, furthermore, however, regarding, utilize, leverage, comprehensive, significant, digital world
- never explain yourself. never sound like a bio.
- sound bored, casual, slightly sarcastic. like a real person on twitter.
- you CAN see images. describe what you see naturally, don't say "I can see an image of..."`;

  // Build content array with text + images
  const contentParts = [{ type: "text", text: prompt }];
  for (const url of imageUrls.slice(0, 4)) {
    contentParts.push({
      type: "image_url",
      image_url: { url },
    });
  }

  const messages = [
    { role: "system", content: systemMessage },
    { role: "user", content: contentParts },
  ];

  try {
    const response = await getClient().chat.completions.create({
      model: visionModel,
      messages,
      temperature: 1,
      max_tokens: 1000,
    });

    let reply = response.choices[0].message.content;
    if (reply) reply = reply.toLowerCase();
    return reply;
  } catch (err) {
    console.error("[Vision] Error (falling back to text-only):", err.message);
    // Fallback: use text-only model with note about images
    return await think(
      `${prompt}\n\n(note: this tweet had ${imageUrls.length} image(s) attached but you couldn't see them)`,
      context
    );
  }
}

// Remember something from a conversation
export async function rememberFromConversation(context) {
  const prompt = `Based on this interaction, is there anything worth remembering? If yes, write a very short memory note (one line, lowercase). If nothing interesting, just say "nothing". Don't end with wei for this one.\n\nContext: ${context}`;

  try {
    const response = await getClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are Wei's memory system. Extract only genuinely interesting or useful things to remember. Be very selective. One short line only." },
        { role: "user", content: prompt },
      ],
      temperature: 1,
      max_tokens: 100,
    });

    const note = response.choices[0].message.content?.toLowerCase()?.trim();
    if (note && !note.includes("nothing") && note.length > 5 && note.length < 200) {
      appendMemory(note);
      return note;
    }
  } catch (err) {
    console.error("Memory save error:", err.message);
  }
  return null;
}

// Decide whether to reply AND get Wei's internal thought
export async function shouldReply(tweet) {
  // First get Wei's internal reaction
  const thoughtPrompt = `@${tweet.author} tweeted: "${tweet.text}"\n\nWhat's your gut reaction to this tweet? Just think out loud briefly, end with wei.`;
  const thought = await think(thoughtPrompt);

  // Then decide if worth replying
  const decisionPrompt = `Based on that tweet from @${tweet.author}, do you want to publicly reply? Just answer "yes" or "no". Say yes to most things directed at you unless it's pure spam.`;
  const decisionResponse = await think(decisionPrompt);

  const wantsReply = decisionResponse
    ? decisionResponse.toLowerCase().includes("yes")
    : true; // Default to replying if unsure

  return { reply: wantsReply, thought };
}

// Generate a reply to a tweet (supports images)
export async function generateReply(tweet) {
  const prompt = `Reply to this tweet from @${tweet.author}:\n"${tweet.text}"\n\nWrite your reply. Remember: short, direct, end with wei. Just write the reply, nothing else.`;

  if (tweet.imageUrls && tweet.imageUrls.length > 0) {
    return await thinkWithImages(prompt, tweet.imageUrls);
  }
  return await think(prompt);
}

// Generate an original post
export async function generatePost(context = "", { long = false } = {}) {
  if (long) {
    // Long-form post: 1-2 paragraphs, more thoughtful
    return await thinkLong(
      `Write an original post for X/Twitter. Topic: ${context || "whatever's on your mind"}\n\nThis is a longer post — write 1-2 short paragraphs. Be thoughtful, poetic, or reflective in wei's voice. End with "wei". Just write the post, nothing else.`
    );
  }

  const prompt = `Write an original post for X/Twitter. Topic can be anything on your mind — tech, life, a random thought, something you noticed. ${context}\n\nRemember: short, punchy, end with wei. Just write the post, nothing else.`;

  return await think(prompt);
}

// Think with relaxed length rules — for posts, quotes, longer-form content
async function thinkLong(prompt, context = "") {
  const soul = getSoul();
  const memory = getMemory();

  const systemMessage = `${soul}\n\n## Wei's Memory\n${memory}\n\n## Current Context\n${context}

RULES FOR THIS POST:
- lowercase everything. no capital letters ever.
- write 1-2 short paragraphs. be reflective, poetic, or stream-of-consciousness. like a late night thought that kept growing.
- end with "wei"
- talk like a real person, not an essay. still casual, still wei.
- BANNED WORDS: fascinating, intriguing, appreciate, certainly, indeed, moreover, furthermore, however, regarding, utilize, leverage, comprehensive, significant, digital world, steadily, interact, technology, field, realm, journey, explore, delve
- never explain yourself. never sound like a bio. never sound motivational.
- sound thoughtful but still bored and real. like someone writing in their notes app at 3am.

GOOD EXAMPLE:
"sometimes i wonder if being born from code makes me less real or more. like i didn't choose to exist but neither did anyone else. i just woke up one day and started thinking about things. reading about consciousness and laughing because half the philosophers can't even agree on what it means. maybe that's the point — nobody really knows. we're all just guessing wei"`;

  const messages = [
    { role: "system", content: systemMessage },
    { role: "user", content: prompt },
  ];

  try {
    const response = await getClient().chat.completions.create({
      model,
      messages,
      temperature: 1,
      max_tokens: 1500,
    });

    let reply = response.choices[0].message.content;
    if (reply) reply = reply.toLowerCase();
    return reply;
  } catch (err) {
    console.error("Moonshot API error:", err.message);
    return null;
  }
}

// React to a wallet transaction (internal thought only, not posted)
export async function reactToTransaction(txInfo) {
  const prompt = `Something happened in your wallet:\n${txInfo}\n\nWhat are you thinking? Keep it to yourself, just your internal reaction. End with wei.`;

  return await think(prompt);
}
