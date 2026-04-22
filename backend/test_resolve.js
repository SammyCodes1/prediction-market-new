const { createWalletClient, http, publicActions } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
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
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

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
    console.log(`AI Response: "${responseText}"`);
    
    if (responseText === '1') return 1;
    if (responseText === '2') return 2;
    return 0;
  } catch (error) {
    console.error('Oracle AI error:', error);
    return 0;
  }
}

async function run() {
  const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
  const client = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http()
  }).extend(publicActions);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiredMarkets = db.prepare('SELECT id, question, description FROM markets WHERE state = 0 AND closes_at < ?').all(nowSeconds);

  console.log(`Found ${expiredMarkets.length} expired markets.`);

  for (const market of expiredMarkets) {
    console.log(`Processing Market #${market.id}: ${market.question}`);
    const outcome = await determineOutcome(market.question, market.description);
    
    if (outcome !== 0) {
      console.log(`Resolving with outcome: ${outcome === 1 ? 'YES' : 'NO'}`);
      try {
        const hash = await client.writeContract({
          address: CONTRACT_ADDRESS,
          abi: abiData.abi,
          functionName: 'resolveMarket',
          args: [BigInt(market.id), BigInt(outcome)],
        });
        console.log(`Transaction Hash: ${hash}`);
        db.prepare('UPDATE markets SET state = 1, resolution = ? WHERE id = ?').run(outcome, market.id);
        console.log(`Market #${market.id} resolved in DB.`);
      } catch (err) {
        console.error(`Contract Error: ${err.message}`);
      }
    } else {
      console.log(`Outcome undetermined for Market #${market.id}`);
    }
  }
}

run().catch(console.error);
