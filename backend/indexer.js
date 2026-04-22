const { createPublicClient, http, parseAbiItem, formatEther } = require('viem');
const { mainnet } = require('viem/chains'); // We'll define a custom chain for Arc
const dotenv = require('dotenv');
const { db } = require('./db');
const abiData = require('./abi.json');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.MARKET_CONTRACT_ADDRESS;
const ABI = abiData.abi;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    public: { http: [RPC_URL] },
    default: { http: [RPC_URL] },
  },
};

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

async function categorizeQuestion(question) {
  try {
    const prompt = `Classify the following prediction market question into exactly one of these categories: Crypto, Tech, Sports, Politics, Entertainment, or All. 
    Question: "${question}"
    Return only the category name.`;
    
    const result = await model.generateContent(prompt);
    const category = result.response.text().trim();
    const validCategories = ['Crypto', 'Tech', 'Sports', 'Politics', 'Entertainment', 'All'];
    return validCategories.includes(category) ? category : 'All';
  } catch (error) {
    console.error('Categorization error:', error);
    return 'All';
  }
}

async function indexEvents(io) {
  console.log('Starting indexer...');

  // Get last indexed block
  const syncState = db.prepare('SELECT last_indexed_block FROM sync_state WHERE id = 1').get();
  let fromBlock = BigInt(syncState.last_indexed_block || process.env.START_BLOCK || 0);
  
  // Current block
  const toBlock = await client.getBlockNumber();
  
  if (fromBlock >= toBlock) {
    console.log('Already synced to latest block:', toBlock.toString());
  } else {
    console.log(`Syncing from ${fromBlock} to ${toBlock}...`);
    
    const CHUNK_SIZE = 10000n;
    for (let currentBlock = fromBlock + 1n; currentBlock <= toBlock; currentBlock += CHUNK_SIZE) {
      let endBlock = currentBlock + CHUNK_SIZE - 1n;
      if (endBlock > toBlock) endBlock = toBlock;

      console.log(`Fetching events from ${currentBlock} to ${endBlock}...`);
      
      const events = await client.getContractEvents({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        fromBlock: currentBlock,
        toBlock: endBlock,
      });

      console.log(`Found ${events.length} events in this chunk.`);

      for (const event of events) {
        await handleEvent(event, io);
      }

      // Update sync state after each chunk
      db.prepare('UPDATE sync_state SET last_indexed_block = ? WHERE id = 1').run(Number(endBlock));
    }
  }

  // Watch for new events
  console.log('Watching for new events...');
  client.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    onLogs: (logs) => {
      for (const log of logs) {
        handleEvent(log, io);
        // Update sync state for each new block seen
        db.prepare('UPDATE sync_state SET last_indexed_block = ? WHERE id = 1').run(Number(log.blockNumber));
      }
    },
  });
}

async function handleEvent(event, io) {
  const { eventName, args, transactionHash, blockNumber } = event;
  console.log(`Processing event: ${eventName} at block ${blockNumber}`);

  const block = await client.getBlock({ blockNumber });
  const timestamp = Number(block.timestamp);

  switch (eventName) {
    case 'MarketCreated': {
      const { marketId, question, closesAt } = args;
      // Fetch more details from contract
      const marketData = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'getMarket',
        args: [marketId],
      });

      // Handle old vs new ABI return counts
      const creator = marketData.length > 8 ? marketData[8] : ""; 
      
      // Auto-categorize
      const category = await categorizeQuestion(marketData[0]);

      db.prepare(`
        INSERT OR REPLACE INTO markets 
        (id, question, description, resolution_method, creator, closes_at, yes_reserve, no_reserve, total_volume, state, resolution, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        marketId.toString(),
        marketData[0], // question
        marketData[1], // description
        "", // resolutionMethod
        creator,
        Number(marketData[2]), // closesAt
        marketData[3].toString(), // yesReserve
        marketData[4].toString(), // noReserve
        marketData[5].toString(), // totalVolume
        marketData[6], // state
        marketData[7], // resolution
        category
      );

      if (io) io.emit('market_created', { id: marketId.toString(), question: marketData[0], category });
      break;
    }

    case 'Trade': {
      const { marketId, trader, side, usdcAmount, tokenAmount } = args;
      
      db.prepare(`
        INSERT INTO trades (id, market_id, trader, side, usdc_amount, token_amount, timestamp, tx_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${transactionHash}-${marketId}`,
        marketId.toString(),
        trader,
        Number(side),
        usdcAmount.toString(),
        tokenAmount.toString(),
        timestamp,
        transactionHash
      );

      // Update market reserves after trade
      const marketData = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'getMarket',
        args: [marketId],
      });

      db.prepare(`
        UPDATE markets 
        SET yes_reserve = ?, no_reserve = ?, total_volume = ?
        WHERE id = ?
      `).run(
        marketData[3].toString(),
        marketData[4].toString(),
        marketData[5].toString(),
        marketId.toString()
      );

      if (io) io.emit('trade', { marketId: marketId.toString(), trader, side: Number(side), usdcAmount: usdcAmount.toString() });
      break;
    }

    case 'MarketResolved': {
      const { marketId, outcome } = args;
      db.prepare('UPDATE markets SET state = 1, resolution = ? WHERE id = ?').run(
        Number(outcome),
        marketId.toString()
      );
      if (io) io.emit('market_resolved', { marketId: marketId.toString(), outcome: Number(outcome) });
      break;
    }

    case 'MarketCancelled': {
      const { marketId } = args;
      db.prepare('UPDATE markets SET state = 2 WHERE id = ?').run(marketId.toString());
      if (io) io.emit('market_cancelled', { marketId: marketId.toString() });
      break;
    }

    case 'PayoutClaimed': {
      const { marketId, claimer, amount } = args;
      db.prepare(`
        INSERT OR REPLACE INTO payouts (id, market_id, claimer, amount, timestamp, tx_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `${transactionHash}-${marketId}`,
        marketId.toString(),
        claimer,
        amount.toString(),
        timestamp,
        transactionHash
      );
      if (io) io.emit('payout_claimed', { marketId: marketId.toString(), claimer, amount: amount.toString() });
      break;
    }
  }
}

module.exports = {
  indexEvents
};
