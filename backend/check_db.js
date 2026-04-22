const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, 'prediction_market.db');
const db = new Database(dbPath);
const markets = db.prepare('SELECT * FROM markets').all();
console.log(JSON.stringify(markets, null, 2));
