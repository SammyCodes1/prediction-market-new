export type Category = 'Crypto' | 'Sports' | 'Politics' | 'Tech' | 'Entertainment' | 'All' | 'Trending';

export interface OddsDataPoint {
  time: string;
  yes: number;
  no: number;
}

export interface Market {
  id: string;
  question: string;
  category: Category;
  yesPercent: number;
  noPercent: number;
  volume: number;
  liquidity: number;
  bettors: number;
  closesAt: string;
  trending?: boolean;
  featured?: boolean;
  creator: {
    name: string;
    avatar: string;
    address: string;
  };
  oddsHistory: OddsDataPoint[];
  description: string;
  resolutionMethod: string;
  state: number;
  resolution: number;
}

export interface Bet {
  id: string;
  marketId: string;
  marketQuestion: string;
  user: {
    name: string;
    avatar: string;
    address: string;
  };
  outcome: 'YES' | 'NO';
  amount: number;
  timestamp: string;
  probabilityAtBet: number;
}

export interface Position {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcome: 'YES' | 'NO';
  amount: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  entryProbability: number;
  currentProbability: number;
}

export interface Trader {
  rank: number;
  name: string;
  avatar: string;
  address: string;
  volume: number;
  winRate: number;
  profit: number;
}
