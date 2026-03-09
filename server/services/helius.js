function getApiKey() {
  return process.env.HELIUS_API_KEY;
}
const BASE_URL = "https://api-mainnet.helius-rpc.com/v0";

let walletAddress = process.env.SOLANA_WALLET_ADDRESS;
let lastSignature = null;
let pollInterval = null;
let onTransaction = null;

export function setWalletAddress(address) {
  walletAddress = address;
}

export function setTransactionHandler(handler) {
  onTransaction = handler;
}

// Get SOL balance via RPC
export async function getBalance() {
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
    if (!res.ok) throw new Error(`Helius RPC error: ${res.status}`);
    const data = await res.json();
    if (data.result?.value !== undefined) {
      return data.result.value / 1e9; // lamports to SOL
    }
    return null;
  } catch (err) {
    console.error("Helius balance error:", err.message);
    return null;
  }
}

// Get parsed transaction history
export async function getTransactions(type = null, limit = 10) {
  if (!walletAddress) return [];

  let url = `${BASE_URL}/addresses/${walletAddress}/transactions?api-key=${getApiKey()}&limit=${limit}`;
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

// Parse a transaction into readable info
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

  // SOL transfers
  if (tx.nativeTransfers) {
    for (const t of tx.nativeTransfers) {
      if (t.toUserAccount === walletAddress) {
        info.solTransfers.push({
          direction: "IN",
          amount: t.amount / 1e9,
          from: t.fromUserAccount,
        });
      } else if (t.fromUserAccount === walletAddress) {
        info.solTransfers.push({
          direction: "OUT",
          amount: t.amount / 1e9,
          to: t.toUserAccount,
        });
      }
    }
  }

  // Token transfers
  if (tx.tokenTransfers) {
    for (const t of tx.tokenTransfers) {
      if (t.toUserAccount === walletAddress) {
        info.tokenTransfers.push({
          direction: "BUY",
          amount: t.tokenAmount,
          mint: t.mint,
        });
      } else if (t.fromUserAccount === walletAddress) {
        info.tokenTransfers.push({
          direction: "SELL",
          amount: t.tokenAmount,
          mint: t.mint,
        });
      }
    }
  }

  return info;
}

// Format transaction for display
export function formatTransaction(parsed) {
  let text = `[${parsed.type}]`;

  if (parsed.description) {
    text += ` ${parsed.description}`;
  }

  for (const t of parsed.solTransfers) {
    if (t.direction === "IN") {
      text += ` Received ${t.amount.toFixed(4)} SOL from ${t.from.slice(0, 8)}...`;
    } else {
      text += ` Sent ${t.amount.toFixed(4)} SOL to ${t.to.slice(0, 8)}...`;
    }
  }

  for (const t of parsed.tokenTransfers) {
    text += ` ${t.direction} ${t.amount} of ${t.mint.slice(0, 8)}...`;
  }

  return text;
}

// Start polling for new transactions
export function startPolling(intervalMs = 15000) {
  if (pollInterval) clearInterval(pollInterval);

  console.log(`[Helius] Polling wallet ${walletAddress?.slice(0, 8)}... every ${intervalMs / 1000}s`);

  // Get initial last signature
  getTransactions(null, 1).then((txs) => {
    if (txs.length > 0) {
      lastSignature = txs[0].signature;
    }
  });

  pollInterval = setInterval(async () => {
    if (!walletAddress) return;

    try {
      const txs = await getTransactions(null, 5);
      const newTxs = [];

      for (const tx of txs) {
        if (tx.signature === lastSignature) break;
        newTxs.push(tx);
      }

      if (newTxs.length > 0) {
        lastSignature = newTxs[0].signature;

        for (const tx of newTxs.reverse()) {
          const parsed = parseTransaction(tx);
          if (onTransaction) {
            onTransaction(parsed);
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
