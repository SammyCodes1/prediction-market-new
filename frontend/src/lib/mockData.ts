import { Market, Bet, Position, Trader, Category } from './types';

const generateOddsHistory = (baseYes: number) => {
  const history = [];
  let currentYes = baseYes;
  for (let i = 0; i < 30; i++) {
    const change = (Math.random() - 0.5) * 5;
    currentYes = Math.max(5, Math.min(95, currentYes + change));
    history.push({
      time: `${i}d ago`,
      yes: Math.round(currentYes),
      no: Math.round(100 - currentYes),
    });
  }
  return history.reverse();
};

export const markets: any[] = [
  {
    id: "1",
    question: "Will Bitcoin exceed $150,000 by end of 2025?",
    category: "Crypto",
    yesPercent: 68,
    noPercent: 32,
    volume: 284750,
    liquidity: 48200,
    bettors: 1243,
    closesAt: "2025-12-31",
    trending: true,
    featured: true,
    creator: {
      name: "SatoshiWatcher",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=satoshi",
    address: "0x0000000000000000000000000000000000000000",
  },
    oddsHistory: generateOddsHistory(68),
    description: "This market resolves to YES if Bitcoin (BTC) reaches a price of $150,000.01 or higher on any major exchange (Binance, Coinbase, or Kraken) at any point before Jan 1, 2026, 00:00 UTC.",
    resolutionMethod: "Price data from CoinGecko API"
  },
  {
    id: "2",
    question: "Will SpaceX land humans on Mars by 2029?",
    category: "Tech",
    yesPercent: 15,
    noPercent: 85,
    volume: 120500,
    liquidity: 25000,
    bettors: 842,
    closesAt: "2029-12-31",
    creator: {
      name: "MarsBound",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mars",
    address: "0x0000000000000000000000000000000000000000"
    },
    oddsHistory: generateOddsHistory(15),
    description: "Resolves to YES if a human mission managed by SpaceX successfully touches down on the Martian surface before the end of 2029.",
    resolutionMethod: "Official announcement from NASA/SpaceX"
  },
  {
    id: "3",
    question: "Will the Lakers win the 2025 NBA Championship?",
    category: "Sports",
    yesPercent: 42,
    noPercent: 58,
    volume: 95000,
    liquidity: 18000,
    bettors: 2100,
    closesAt: "2025-06-30",
    trending: true,
    creator: {
      name: "HoopsMaster",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hoops"
    address: "0x0000000000000000000000000000000000000000"
    },
    oddsHistory: generateOddsHistory(42),
    description: "Resolves to YES if the Los Angeles Lakers win the NBA Finals in the 2024-25 season.",
    resolutionMethod: "NBA official results"
  },
  {
    id: "4",
    question: "Will OpenAI release GPT-5 by July 2025?",
    category: "Tech",
    yesPercent: 75,
    noPercent: 25,
    volume: 450000,
    liquidity: 120000,
    bettors: 5400,
    closesAt: "2025-07-01",
    featured: true,
    creator: {
      name: "AIOptimist",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai"
    address: "0x0000000000000000000000000000000000000000"
    },
    oddsHistory: generateOddsHistory(75),
    description: "Resolves to YES if OpenAI officially releases or announces a model explicitly named 'GPT-5' by July 1, 2025.",
    resolutionMethod: "OpenAI Official Blog"
  },
  {
    id: "5",
    question: "Will Taylor Swift win Album of the Year at the 2026 Grammys?",
    category: "Entertainment",
    yesPercent: 55,
    noPercent: 45,
    volume: 82000,
    liquidity: 15000,
    bettors: 3200,
    closesAt: "2026-02-15",
    creator: {
      name: "SwiftieBet",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=swift"
    address: "0x0000000000000000000000000000000000000000"
    },
    oddsHistory: generateOddsHistory(55),
    description: "Resolves to YES if Taylor Swift wins the 'Album of the Year' category at the 68th Annual Grammy Awards.",
    resolutionMethod: "Grammy.com official winner list"
  }
];

export const activity: Bet[] = [
  {
    id: "b1",
    marketId: "1",
    marketQuestion: "Will Bitcoin exceed $150,000 by end of 2025?",
    user: {
      name: "0x1a2b...3c4d",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
      address: "0x1a2b3c4d5e6f7g8h9i0j"
    },
    outcome: 'YES',
    amount: 500,
    timestamp: "2 mins ago",
    probabilityAtBet: 67
  },
  {
    id: "b2",
    marketId: "4",
    marketQuestion: "Will OpenAI release GPT-5 by July 2025?",
    user: {
      name: "0x9f8e...7d6c",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
      address: "0x9f8e7d6c5b4a3z2y1x0w"
    },
    outcome: 'YES',
    amount: 1200,
    timestamp: "5 mins ago",
    probabilityAtBet: 74
  },
  {
    id: "b3",
    marketId: "2",
    marketQuestion: "Will SpaceX land humans on Mars by 2029?",
    user: {
      name: "0x5a4b...3c2d",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
      address: "0x5a4b3c2d1e0f"
    },
    outcome: 'NO',
    amount: 250,
    timestamp: "12 mins ago",
    probabilityAtBet: 86
  }
];

export const positions: Position[] = [
  {
    id: "p1",
    marketId: "1",
    marketQuestion: "Will Bitcoin exceed $150,000 by end of 2025?",
    outcome: 'YES',
    amount: 1000,
    currentValue: 1150,
    pnl: 150,
    pnlPercent: 15,
    entryProbability: 60,
    currentProbability: 68
  },
  {
    id: "p2",
    marketId: "4",
    marketQuestion: "Will OpenAI release GPT-5 by July 2025?",
    outcome: 'YES',
    amount: 500,
    currentValue: 525,
    pnl: 25,
    pnlPercent: 5,
    entryProbability: 72,
    currentProbability: 75
  }
];

export const leaderboard: Trader[] = [
  {
    rank: 1,
    name: "WhaleHunter",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=whale",
    address: "0x123...456",
    volume: 1250000,
    winRate: 72,
    profit: 450000
  },
  {
    rank: 2,
    name: "AlphaSeeker",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alpha",
    address: "0x789...012",
    volume: 850000,
    winRate: 68,
    profit: 280000
  },
  {
    rank: 3,
    name: "CrystalBall",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=crystal",
    address: "0x345...678",
    volume: 620000,
    winRate: 65,
    profit: 150000
  }
];
