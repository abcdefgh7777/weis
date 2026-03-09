import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

export function regenerateWallet() {
  const keypair = Keypair.generate();
  const privateKey = bs58.encode(keypair.secretKey);
  const walletAddress = keypair.publicKey.toBase58();

  console.log(`[Wallet] Generated new wallet: ${walletAddress}`);

  // Update .env file if it exists
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    envContent = envContent.replace(/SOLANA_PRIVATE_KEY=.*/, `SOLANA_PRIVATE_KEY=${privateKey}`);
    envContent = envContent.replace(/SOLANA_WALLET_ADDRESS=.*/, `SOLANA_WALLET_ADDRESS=${walletAddress}`);
    fs.writeFileSync(envPath, envContent);
  }

  process.env.SOLANA_PRIVATE_KEY = privateKey;
  process.env.SOLANA_WALLET_ADDRESS = walletAddress;

  return { privateKey, walletAddress };
}

export function getOrCreateWallet() {
  let privateKey = process.env.SOLANA_PRIVATE_KEY;
  let walletAddress = process.env.SOLANA_WALLET_ADDRESS;

  if (privateKey && walletAddress) {
    console.log(`[Wallet] Using existing wallet: ${walletAddress}`);
    return { privateKey, walletAddress };
  }

  // Generate new wallet
  const keypair = Keypair.generate();
  privateKey = bs58.encode(keypair.secretKey);
  walletAddress = keypair.publicKey.toBase58();

  console.log(`[Wallet] Generated new wallet: ${walletAddress}`);
  console.log(`[Wallet] SAVE THIS PRIVATE KEY — it won't be shown again`);

  // Update .env file
  let envContent = fs.readFileSync(envPath, "utf-8");
  envContent = envContent.replace(
    "SOLANA_PRIVATE_KEY=",
    `SOLANA_PRIVATE_KEY=${privateKey}`
  );
  envContent = envContent.replace(
    "SOLANA_WALLET_ADDRESS=",
    `SOLANA_WALLET_ADDRESS=${walletAddress}`
  );
  fs.writeFileSync(envPath, envContent);

  // Also set in process.env for current session
  process.env.SOLANA_PRIVATE_KEY = privateKey;
  process.env.SOLANA_WALLET_ADDRESS = walletAddress;

  return { privateKey, walletAddress };
}
