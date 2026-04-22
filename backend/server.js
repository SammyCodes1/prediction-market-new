const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDb, db } = require('./db');
const { indexEvents } = require('./indexer');
const { startKeeper } = require('./keeper');
const { formatUnits } = require('viem');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const USDC_DECIMALS = 6;

app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// Start Indexer with Socket.IO
indexEvents(io).catch(console.error);

// Start Automated Oracle Keeper with Socket.IO
startKeeper(io);

// Helper to format market data for frontend
function formatMarket(m) {
  const yesReserve = BigInt(m.yes_reserve);
  const noReserve = BigInt(m.no_reserve);
  
  // Calculate simple probability
  const total = Number(yesReserve + noReserve);
  const yesPercent = total > 0 ? Math.round((Number(yesReserve) / total) * 100) : 50;
  const noPercent = 100 - yesPercent;

  return {
    id: m.id,
    question: m.question,
    description: m.description,
    category: m.category || 'All',
    yesPercent,
    noPercent,
    volume: parseFloat(formatUnits(BigInt(m.total_volume), USDC_DECIMALS)),
    closesAt: new Date(m.closes_at * 1000).toISOString(),
    state: m.state,
    resolution: m.resolution,
    trending: !!m.trending,
    featured: !!m.featured,
    bettors: m.trader_count || 0,
    creator: { 
      name: m.creator ? `${m.creator.slice(0, 6)}...${m.creator.slice(-4)}` : 'Anonymous', 
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.creator || m.id}`,
      address: m.creator
    }
  };
}

// API Routes

// GET /api/markets - List all markets
app.get('/api/markets', (req, res) => {
  const { category, search, trending } = req.query;
  
  let query = `
    SELECT m.*, (SELECT COUNT(DISTINCT trader) FROM trades WHERE market_id = m.id) as trader_count
    FROM markets m
  `;
  const params = [];

  const conditions = [];
  if (category && category !== 'All') {
    conditions.push('m.category = ?');
    params.push(category);
  }

  if (trending === 'true') {
    conditions.push('m.trending = 1');
  }

  if (search) {
    conditions.push('m.question LIKE ?');
    params.push(`%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const markets = db.prepare(query).all(...params);
  res.json(markets.map(formatMarket));
});

// GET /api/markets/:id - Get market details
app.get('/api/markets/:id', (req, res) => {
  const market = db.prepare(`
    SELECT m.*, (SELECT COUNT(DISTINCT trader) FROM trades WHERE market_id = m.id) as trader_count
    FROM markets m 
    WHERE m.id = ?
  `).get(req.params.id);
  
  if (!market) {
    return res.status(404).json({ error: 'Market not found' });
  }

  const trades = db.prepare('SELECT * FROM trades WHERE market_id = ? ORDER BY timestamp DESC LIMIT 50').all(req.params.id);
  
  res.json({
    ...formatMarket(market),
    trades: trades.map(t => ({
      trader: t.trader,
      side: t.side === 1 ? 'YES' : 'NO',
      amount: formatUnits(BigInt(t.usdc_amount), USDC_DECIMALS),
      timestamp: new Date(t.timestamp * 1000).toISOString()
    }))
  });
});

// GET /api/activity - Get global activity
app.get('/api/activity', (req, res) => {
  const { side, marketId } = req.query;
  
  let query = `
    SELECT t.*, m.question, u.username, u.profile_picture
    FROM trades t 
    JOIN markets m ON t.market_id = m.id
    LEFT JOIN users u ON t.trader = u.address
  `;
  const params = [];
  const conditions = [];

  if (side && side !== 'ALL') {
    conditions.push('t.side = ?');
    params.push(side === 'YES' ? 1 : 2);
  }

  if (marketId) {
    conditions.push('t.market_id = ?');
    params.push(marketId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY t.timestamp DESC LIMIT 50';

  const trades = db.prepare(query).all(...params);

  res.json(trades.map(t => ({
    id: t.id,
    marketId: t.market_id,
    marketQuestion: t.question,
    user: { 
      name: t.username || `${t.trader.slice(0, 6)}...${t.trader.slice(-4)}`, 
      avatar: t.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.trader}` 
    },
    outcome: t.side === 1 ? 'YES' : 'NO',
    amount: parseFloat(formatUnits(BigInt(t.usdc_amount), USDC_DECIMALS)),
    timestamp: t.timestamp
  })));
});

// GET /api/portfolio/:address - Get markets traded by user
app.get('/api/portfolio/:address', (req, res) => {
  const address = req.params.address;
  const marketIds = db.prepare('SELECT DISTINCT market_id FROM trades WHERE trader = ?').all(address);
  
  if (marketIds.length === 0) {
    return res.json([]);
  }

  const placeholders = marketIds.map(() => '?').join(',');
  const markets = db.prepare(`SELECT * FROM markets WHERE id IN (${placeholders})`).all(...marketIds.map(m => m.market_id));
  
  res.json(markets.map(formatMarket));
});

// GET /api/leaderboard - Get top traders by profit
app.get('/api/leaderboard', (req, res) => {
  try {
    const traders = db.prepare(`
      SELECT 
        t.trader as address,
        u.username,
        u.profile_picture,
        SUM(CAST(t.usdc_amount AS REAL)) as total_volume,
        COUNT(*) as total_trades,
        SUM(
          CASE 
            WHEN m.state = 1 AND t.side = m.resolution THEN CAST(t.token_amount AS REAL)
            WHEN m.state = 1 THEN 0
            ELSE 0 
          END
        ) - SUM(
          CASE 
            WHEN m.state = 1 THEN CAST(t.usdc_amount AS REAL)
            ELSE 0
          END
        ) as realized_profit,
        SUM(
          CASE 
            WHEN m.state = 1 AND t.side = m.resolution THEN 1
            ELSE 0
          END
        ) as winning_trades,
        SUM(
          CASE 
            WHEN m.state = 1 THEN 1
            ELSE 0
          END
        ) as resolved_trades
      FROM trades t
      JOIN markets m ON t.market_id = m.id
      LEFT JOIN users u ON t.trader = u.address
      GROUP BY t.trader
      ORDER BY realized_profit DESC, total_volume DESC
      LIMIT 20
    `).all();

    res.json(traders.map((t, idx) => {
      const volume = parseFloat(formatUnits(BigInt(Math.floor(t.total_volume)), USDC_DECIMALS));
      const profit = t.realized_profit / Math.pow(10, USDC_DECIMALS);
      const winRate = t.resolved_trades > 0 
        ? Math.round((t.winning_trades / t.resolved_trades) * 100) 
        : 0;

      return {
        rank: idx + 1,
        name: t.username || `${t.address.slice(0, 6)}...${t.address.slice(-4)}`,
        address: t.address,
        volume: volume,
        profit: parseFloat(profit.toFixed(2)),
        winRate: winRate,
        trades: t.total_trades,
        avatar: t.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.address}`
      };
    }));
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/users/:address - Get user profile
app.get('/api/users/:address', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE address = ?').get(req.params.address);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// POST /api/users - Create or update user profile
app.post('/api/users', (req, res) => {
  const { address, username, profile_picture } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });

  const existing = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (existing) {
    db.prepare('UPDATE users SET username = ?, profile_picture = ? WHERE address = ?')
      .run(username || existing.username, profile_picture || existing.profile_picture, address);
  } else {
    db.prepare('INSERT INTO users (address, username, profile_picture, created_at) VALUES (?, ?, ?, ?)')
      .run(address, username, profile_picture, Math.floor(Date.now() / 1000));
  }
  
  res.json({ success: true, user: db.prepare('SELECT * FROM users WHERE address = ?').get(address) });
});

// DELETE /api/users/:address - Delete user profile
app.delete('/api/users/:address', (req, res) => {
  db.prepare('DELETE FROM users WHERE address = ?').run(req.params.address);
  res.json({ success: true });
});

// GET /api/stats - Get global stats
app.get('/api/stats', (req, res) => {
  const totalVolumeRow = db.prepare('SELECT SUM(CAST(total_volume AS REAL)) as total FROM markets').get();
  const totalVolume = totalVolumeRow ? (totalVolumeRow.total || 0) : 0;
  
  const nowSeconds = Math.floor(Date.now() / 1000);
  const activeMarkets = db.prepare('SELECT COUNT(*) as count FROM markets WHERE state = 0 AND closes_at > ?').get(nowSeconds).count;
  const traders = db.prepare('SELECT COUNT(DISTINCT trader) as count FROM trades').get().count;
  
  // Calculate 24h volume
  const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
  const vol24hRow = db.prepare('SELECT SUM(CAST(usdc_amount AS REAL)) as total FROM trades WHERE timestamp > ?').get(oneDayAgo);
  const volume24h = vol24hRow ? (vol24hRow.total || 0) : 0;
  
  res.json({
    totalVolume: parseFloat(formatUnits(BigInt(Math.floor(totalVolume)), USDC_DECIMALS)),
    activeMarkets,
    traders,
    volume24h: parseFloat(formatUnits(BigInt(Math.floor(volume24h)), USDC_DECIMALS))
  });
});

io.on('connection', (socket) => {
  console.log('Client connected to WebSockets');
});

server.listen(PORT, () => {
  console.log(`Prediction Market API running on port ${PORT}`);
});
