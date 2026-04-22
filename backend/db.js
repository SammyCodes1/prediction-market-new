const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'prediction_market.db');
const db = new Database(dbPath);

// Initialize tables
function initDb() {
  // Markets table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      description TEXT,
      resolution_method TEXT,
      creator TEXT,
      closes_at INTEGER,
      yes_reserve TEXT,
      no_reserve TEXT,
      total_volume TEXT,
      liquidity TEXT,
      state INTEGER DEFAULT 0, -- 0: Active, 1: Resolved, 2: Cancelled
      resolution INTEGER DEFAULT 0, -- 0: Unresolved, 1: Yes, 2: No
      category TEXT DEFAULT 'All',
      trending BOOLEAN DEFAULT 0,
      featured BOOLEAN DEFAULT 0
    )
  `).run();

  // Trades table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      market_id TEXT NOT NULL,
      trader TEXT NOT NULL,
      side INTEGER NOT NULL, -- 1: Yes, 2: No
      usdc_amount TEXT NOT NULL,
      token_amount TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      FOREIGN KEY(market_id) REFERENCES markets(id)
    )
  `).run();

  // Sync state table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_indexed_block INTEGER NOT NULL
    )
  `).run();

  // Payouts table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      market_id TEXT NOT NULL,
      claimer TEXT NOT NULL,
      amount TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      FOREIGN KEY(market_id) REFERENCES markets(id)
    )
  `).run();

  // Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      address TEXT PRIMARY KEY,
      username TEXT,
      profile_picture TEXT,
      created_at INTEGER
    )
  `).run();

  // Insert initial sync state if not exists
  const row = db.prepare('SELECT last_indexed_block FROM sync_state WHERE id = 1').get();
  if (!row) {
    db.prepare('INSERT INTO sync_state (id, last_indexed_block) VALUES (1, 0)').run();
  }
}

module.exports = {
  db,
  initDb
};
