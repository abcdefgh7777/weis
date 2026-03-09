import { TwitterApi } from "twitter-api-v2";

let client = null;
let isEnabled = false;

export function initTwitter() {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } =
    process.env;

  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    console.warn("[Twitter] API keys not configured — X features disabled");
    return false;
  }

  client = new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_TOKEN_SECRET,
  });

  isEnabled = true;
  console.log("[Twitter] Connected");
  return true;
}

export function isActive() {
  return isEnabled && client !== null;
}

// Post a tweet
export async function postTweet(text) {
  if (!isActive()) return null;
  try {
    const result = await client.v2.tweet(text);
    console.log("[Twitter] Posted:", text);
    return result;
  } catch (err) {
    console.error("[Twitter] Post error:", err.message);
    return null;
  }
}

// Reply to a tweet
export async function replyToTweet(tweetId, text) {
  if (!isActive()) return null;
  try {
    const result = await client.v2.reply(text, tweetId);
    console.log("[Twitter] Replied to", tweetId);
    return result;
  } catch (err) {
    console.error("[Twitter] Reply error:", err.message);
    return null;
  }
}

// Retweet
export async function retweet(tweetId) {
  if (!isActive()) return null;
  try {
    const me = await client.v2.me();
    const result = await client.v2.retweet(me.data.id, tweetId);
    console.log("[Twitter] Retweeted:", tweetId);
    return result;
  } catch (err) {
    console.error("[Twitter] Retweet error:", err.message);
    return null;
  }
}

// Quote tweet — try official method, fall back to URL if restricted
export async function quoteTweet(tweetId, text, authorUsername = "") {
  if (!isActive()) return null;
  try {
    const result = await client.v2.tweet({ text, quote_tweet_id: tweetId });
    console.log("[Twitter] Quoted:", tweetId);
    return result;
  } catch (err) {
    console.log("[Twitter] Quote official failed:", err.data?.detail || err.message);
    // Fallback: post with URL (works even if quote is restricted)
    try {
      const tweetUrl = `https://x.com/${authorUsername || "i"}/status/${tweetId}`;
      const result = await client.v2.tweet(`${text}\n\n${tweetUrl}`);
      console.log("[Twitter] Quoted (URL fallback):", tweetId);
      return result;
    } catch (err2) {
      console.error("[Twitter] Quote error:", err2.message);
      return null;
    }
  }
}

// Fetch a single tweet by ID (with media)
export async function getTweet(tweetId) {
  if (!isActive()) return null;
  try {
    const result = await client.v2.singleTweet(tweetId, {
      expansions: ["attachments.media_keys", "author_id"],
      "media.fields": ["url", "preview_image_url", "type"],
      "tweet.fields": ["text", "author_id", "created_at"],
      "user.fields": ["username", "name"],
    });

    const tweet = result.data;
    const includes = result.includes || {};

    // Get author username
    const author = includes.users?.[0];
    const username = author?.username || "unknown";

    // Get media URLs
    const mediaItems = includes.media || [];
    const imageUrls = mediaItems
      .filter((m) => m.type === "photo")
      .map((m) => m.url || m.preview_image_url)
      .filter(Boolean);

    return {
      id: tweet.id,
      text: tweet.text,
      author: username,
      imageUrls,
    };
  } catch (err) {
    console.error("[Twitter] Get tweet error:", err.message);
    return null;
  }
}

// Get mentions
export async function getMentions(sinceId = null) {
  if (!isActive()) return [];
  try {
    const me = await client.v2.me();
    const params = {
      max_results: 10,
      "tweet.fields": ["created_at", "author_id", "text"],
    };
    if (sinceId) params.since_id = sinceId;

    const result = await client.v2.userMentionTimeline(me.data.id, params);
    return result.data?.data || [];
  } catch (err) {
    console.error("[Twitter] Mentions error:", err.message);
    return [];
  }
}

// Get home timeline
export async function getTimeline(count = 20) {
  if (!isActive()) return [];
  try {
    const me = await client.v2.me();
    const result = await client.v2.userTimeline(me.data.id, {
      max_results: count,
      "tweet.fields": ["created_at", "author_id", "text"],
    });
    return result.data?.data || [];
  } catch (err) {
    console.error("[Twitter] Timeline error:", err.message);
    return [];
  }
}
