function getApiKey() {
  return process.env.HELIUS_API_KEY;
}
const BASE_URL = "https://api.helius.xyz/v1";

let walletAddress = process.env.SOLANA_WALLET_ADDRESS;
let lastSignature = null;

// Token name cache: mint → { symbol, name }
const tokenCache = new Map();
tokenCache.set("So11111111111111111111111111111111111111111", { symbol: "SOL", name: "Solana" });
tokenCache.set("So11111111111111111111111111111111111111112", { symbol: "SOL", name: "Solana" });

// Resolve mint address to symbol/name using Helius DAS API
export async function resolveToken(mint) {
  if (!mint) return { symbol: "???", name: "" };
  if (tokenCache.has(mint)) return tokenCache.get(mint);

  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${getApiKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAsset",
        params: { id: mint },
      }),
    });
    if (!res.ok) throw new Error(`DAS error: ${res.status}`);
    const data = await res.json();
    const meta = data.result?.content?.metadata;
    const info = {
      symbol: meta?.symbol || mint.slice(0, 6),
      name: meta?.name || "",
    };
    tokenCache.set(mint, info);
    return info;
  } catch (err) {
    console.error(`[Token] Failed to resolve ${mint.slice(0, 8)}:`, err.message);
    const fallback = { symbol: mint.slice(0, 6), name: "" };
    tokenCache.set(mint, fallback);
    return fallback;
  }
}
let pollInterval = null;
let onTransaction = null;

export function setWalletAddress(address) {
  walletAddress = address;
}

export function setTransactionHandler(handler) {
  onTransaction = handler;
}

// Get SOL balance + token balances via Wallet API
export async function getBalance() {
  if (!walletAddress) return null;

  try {
    const res = await fetch(
      `${BASE_URL}/wallet/${walletAddress}/balances?api-key=${getApiKey()}&showNative=true`
    );
    if (!res.ok) throw new Error(`Helius balance error: ${res.status}`);
    const data = await res.json();

    // Find SOL balance
    const sol = data.balances?.find((b) => b.mint === "So11111111111111111111111111111111111111112" || b.symbol === "SOL");
    return sol ? sol.balance : 0;
  } catch (err) {
    console.error("Helius balance error:", err.message);
    // Fallback to RPC
    return await getBalanceRPC();
  }
}

// RPC fallback for balance
async function getBalanceRPC() {
  if (!walletAddress) return null;
  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${getApiKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [walletAddress],
      }),
    });
    if (!res.ok) throw new Error(`RPC error: ${res.status}`);
    const data = await res.json();
    if (data.result?.value !== undefined) {
      return data.result.value / 1e9;
    }
    return null;
  } catch (err) {
    console.error("Helius RPC balance error:", err.message);
    return null;
  }
}

// Get all token balances with USD values
export async function getBalances() {
  if (!walletAddress) return { balances: [], totalUsdValue: 0 };

  try {
    const res = await fetch(
      `${BASE_URL}/wallet/${walletAddress}/balances?api-key=${getApiKey()}&showNative=true&showZeroBalance=false`
    );
    if (!res.ok) throw new Error(`Helius balances error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Helius balances error:", err.message);
    return { balances: [], totalUsdValue: 0 };
  }
}

// Get transfers using Wallet API — clean direction, symbol, human-readable amounts
export async function getTransfers(limit = 50, cursor = null) {
  if (!walletAddress) return { data: [], pagination: {} };

  let url = `${BASE_URL}/wallet/${walletAddress}/transfers?api-key=${getApiKey()}&limit=${limit}`;
  if (cursor) url += `&cursor=${cursor}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Helius transfers error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Helius transfers error:", err.message);
    return { data: [], pagination: {} };
  }
}

// Get transaction history with type filter
export async function getHistory(type = null, limit = 20, before = null) {
  if (!walletAddress) return { data: [], pagination: {} };

  let url = `${BASE_URL}/wallet/${walletAddress}/history?api-key=${getApiKey()}&limit=${limit}`;
  if (type) url += `&type=${type}`;
  if (before) url += `&before=${before}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Helius history error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Helius history error:", err.message);
    return { data: [], pagination: {} };
  }
}

// Legacy: get raw enhanced transactions (fallback)
export async function getTransactions(type = null, limit = 10) {
  if (!walletAddress) return [];

  let url = `https://api-mainnet.helius-rpc.com/v0/addresses/${walletAddress}/transactions?api-key=${getApiKey()}&limit=${limit}`;
  if (type) url += `&type=${type}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Helius API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Helius error:", err.message);
    return [];
  }
}

// Format a transfer from Wallet API for display
export function formatTransfer(t) {
  const symbol = t.symbol || t.mint?.slice(0, 6) || "???";
  const dir = t.direction === "in" ? "Received" : "Sent";
  const counterparty = t.counterparty ? t.counterparty.slice(0, 8) + "..." : "unknown";
  const preposition = t.direction === "in" ? "from" : "to";
  return `${dir} ${t.amount} ${symbol} ${preposition} ${counterparty}`;
}

// Format transaction for display (legacy)
export function formatTransaction(parsed) {
  let text = `[${parsed.type}]`;

  if (parsed.description) {
    text += ` ${parsed.description}`;
  }

  for (const t of parsed.solTransfers) {
    if (t.direction === "IN") {
      text += ` Received ${t.amount.toFixed(4)} SOL from ${t.from?.slice(0, 8)}...`;
    } else {
      text += ` Sent ${t.amount.toFixed(4)} SOL to ${t.to?.slice(0, 8)}...`;
    }
  }

  for (const t of parsed.tokenTransfers) {
    text += ` ${t.direction} ${t.amount} of ${t.mint?.slice(0, 8)}...`;
  }

  return text;
}

// Parse legacy enhanced transaction
export function parseTransaction(tx) {
  const info = {
    type: tx.type,
    signature: tx.signature,
    timestamp: tx.timestamp,
    source: tx.source,
    description: tx.description || "",
    solTransfers: [],
    tokenTransfers: [],
  };

  if (tx.nativeTransfers) {
    for (const t of tx.nativeTransfers) {
      const amount = t.amount / 1e9;
      if (amount < 0.0001) continue;

      if (t.toUserAccount === walletAddress) {
        info.solTransfers.push({ direction: "IN", amount, from: t.fromUserAccount });
      } else if (t.fromUserAccount === walletAddress) {
        info.solTransfers.push({ direction: "OUT", amount, to: t.toUserAccount });
      }
    }
  }

  if (tx.tokenTransfers) {
    for (const t of tx.tokenTransfers) {
      if (!t.tokenAmount || t.tokenAmount === 0) continue;
      if (t.toUserAccount === walletAddress) {
        info.tokenTransfers.push({ direction: "BUY", amount: t.tokenAmount, mint: t.mint });
      } else if (t.fromUserAccount === walletAddress) {
        info.tokenTransfers.push({ direction: "SELL", amount: t.tokenAmount, mint: t.mint });
      }
    }
  }

  return info;
}

const RELEVANT_TYPES = new Set([
  "TRANSFER", "SWAP", "TOKEN_MINT",
  "COMPRESSED_NFT_TRANSFER", "NFT_SALE", "NFT_MINT",
]);

export function isRelevantTransaction(parsed) {
  return RELEVANT_TYPES.has(parsed.type) &&
    (parsed.solTransfers.length > 0 || parsed.tokenTransfers.length > 0);
}

// Start polling for new transfers
export function startPolling(intervalMs = 15000) {
  if (pollInterval) clearInterval(pollInterval);

  console.log(`[Helius] Polling wallet ${walletAddress?.slice(0, 8)}... every ${intervalMs / 1000}s`);

  // Get initial last signature
  getTransfers(1).then((result) => {
    if (result.data?.length > 0) {
      lastSignature = result.data[0].signature;
    }
  });

  pollInterval = setInterval(async () => {
    if (!walletAddress) return;

    try {
      const result = await getTransfers(5);
      const newTxs = [];

      for (const t of (result.data || [])) {
        if (t.signature === lastSignature) break;
        newTxs.push(t);
      }

      if (newTxs.length > 0) {
        lastSignature = newTxs[0].signature;

        for (const t of newTxs.reverse()) {
          // Skip dust (< 0.0001 for SOL)
          const isSol = t.mint === "So11111111111111111111111111111111111111112" || t.symbol === "SOL";
          if (isSol && t.amount < 0.0001) continue;
          if (t.amount === 0) continue;

          if (onTransaction) {
            onTransaction(t);
          }
        }
      }
    } catch (err) {
      console.error("[Helius] Poll error:", err.message);
    }
  }, intervalMs);
}

export function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
