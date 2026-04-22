const { createWalletClient, http, publicActions } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { mainnet } = require('viem/chains'); // We'll define a custom chain for Arc
const { db } = require('./db');
const abiData = require('./abi.json');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.arc.network';
const CONTRACT_ADDRESS = process.env.MARKET_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Arc Testnet chain definition
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
};

async function startKeeper(io) {
  console.log('--- Oracle Keeper Started ---');
  
  if (!PRIVATE_KEY || PRIVATE_KEY === 'your_private_key_here_to_auto_resolve_markets') {
    console.warn('WARNING: OWNER_PRIVATE_KEY not set. Automated resolution will be disabled.');
    return;
  }

  // Set up account and client
  const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
  const client = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http()
  }).extend(publicActions);

  // Run check periodically
  setInterval(async () => {
    try {
      await checkAndResolveMarkets(client, io);
    } catch (error) {
      console.error('Keeper Error:', error.message);
    }
  }, 30000); // Check every 30 seconds
}

async function checkAndResolveMarkets(client, io) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  
  // Find expired and active markets
  const expiredMarkets = db.prepare(`
    SELECT id, question, description, closes_at 
    FROM markets 
    WHERE state = 0 AND closes_at < ?
  `).all(nowSeconds);

  if (expiredMarkets.length > 0) {
    console.log(`Found ${expiredMarkets.length} expired markets to resolve.`);
    
    for (const market of expiredMarkets) {
      console.log(`Resolving Market #${market.id}: ${market.question}`);
      
      const outcome = await determineOutcome(market.question, market.description);
      console.log(`Determined Outcome: ${outcome === 1 ? 'YES' : 'NO'}`);

      if (outcome === 0) {
        console.log(`Keeper could not determine outcome for Market #${market.id}. Skipping for now.`);
        continue;
      }

      try {
        const hash = await client.writeContract({
          address: CONTRACT_ADDRESS,
          abi: abiData.abi,
          functionName: 'resolveMarket',
          args: [BigInt(market.id), BigInt(outcome)],
        });
        console.log(`Resolution Transaction Sent: ${hash}`);
        
        // Update local DB state
        db.prepare('UPDATE markets SET state = 1, resolution = ? WHERE id = ?').run(outcome, market.id);
        
        if (io) io.emit('market_resolved', { marketId: market.id, outcome });
        
      } catch (err) {
        console.error(`Failed to resolve market #${market.id}:`, err.shortMessage || err.message);
      }
    }
  }
}

/**
 * determineOutcome: Uses Gemini AI to determine the truth.
 */
async function determineOutcome(question, description) {
  console.log(`[AI Oracle] Researching: "${question}"`);
  
  try {
    const prompt = `You are a prediction market oracle. Determine the outcome of the following market based on real-world facts as of today (${new Date().toDateString()}).
    
    Market Question: "${question}"
    Market Description: "${description}"
    
    Instructions:
    1. Research the outcome. 
    2. If the answer is clearly YES, respond with "1".
    3. If the answer is clearly NO, respond with "2".
    4. If it's too early to tell or the outcome is ambiguous, respond with "0".
    
    Respond only with the digit 0, 1, or 2.`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    if (responseText === '1') return 1;
    if (responseText === '2') return 2;
    return 0;
  } catch (error) {
    console.error('Oracle AI error:', error);
    return 0;
  }
}

module.exports = { startKeeper };
