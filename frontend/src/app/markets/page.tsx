'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useMarkets } from '@/lib/hooks/useMarkets';
import { Category } from '@/lib/types';
import { Search, SlidersHorizontal, ArrowUpRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

const categories: Category[] = ['All', 'Trending', 'Crypto', 'Tech', 'Sports', 'Politics', 'Entertainment'];

export default function MarketsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { markets, loading } = useMarkets(activeCategory, searchQuery);

  const formatValue = (val: number, isCurrency: boolean = false) => {
    if (!isCurrency) return val.toLocaleString();
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  const now = new Date();
  const activeMarkets = markets.filter(m => new Date(m.closesAt) > now && m.state === 0);
  const expiredMarkets = markets.filter(m => new Date(m.closesAt) <= now || m.state !== 0);

  const MarketCard = ({ market }: { market: any }) => {
    const isExpired = new Date(market.closesAt) <= now;
    const isResolved = market.state !== 0;

    return (
      <motion.div
        key={market.id}
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="border-r border-b border-[#1a1a1a] group relative"
      >
        <Link href={`/markets/${market.id}`} className="block h-full p-10 hover:bg-[#050505] transition-all">
          <div className="flex flex-col h-full gap-8">
            <div className="flex justify-between items-start">
              <div className="flex gap-2">
                <span className="text-[9px] font-bold tracking-[0.2em] px-2 py-1 border border-[#1a1a1a] text-[#555555] group-hover:text-white group-hover:border-white transition-all">
                  {market.category.toUpperCase()}
                </span>
                {(isExpired || isResolved) && (
                  <span className="text-[9px] font-bold tracking-[0.2em] px-2 py-1 bg-red-600 text-white">
                    {isResolved ? 'RESOLVED' : 'EXPIRED'}
                  </span>
                )}
              </div>
              <ArrowUpRight size={16} className="text-[#222222] group-hover:text-white transition-all" />
            </div>

            <h3 className="text-2xl font-bold tracking-tight leading-tight min-h-[4rem] group-hover:underline underline-offset-4">
              {market.question}
            </h3>

            <div className="mt-auto flex flex-col gap-6">
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[#555555] tracking-widest mb-1 uppercase">YES Odds</span>
                  <span className="text-2xl font-mono font-bold text-white">{market.yesPercent}%</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-[#555555] tracking-widest mb-1 uppercase">NO Odds</span>
                  <span className="text-2xl font-mono font-bold text-[#555555] group-hover:text-white transition-all">{market.noPercent}%</span>
                </div>
              </div>

              <div className="w-full h-[2px] bg-[#1a1a1a] relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-white transition-all duration-700" 
                  style={{ width: `${market.yesPercent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono text-[#333333] group-hover:text-[#555555] transition-all">
                <span>VOL: {formatValue(market.volume, true)}</span>
                <span>TRADERS: {market.bettors || 0}</span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-black terminal-grid">
      <div className="max-w-[1400px] mx-auto px-6 py-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20 border-b-2 border-white pb-10">
          <div className="flex flex-col gap-4">
            <h1 className="text-6xl font-black tracking-tighter uppercase">Market Explorer</h1>
            <p className="text-[#555555] font-mono text-sm tracking-widest uppercase">Select a sector to view active predictions</p>
          </div>
          
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#555555] w-5 h-5" />
            <input 
              type="text"
              placeholder="SEARCH BY KEYWORD OR REFERENCE ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-[#0a0a0a] border border-[#1a1a1a] focus:border-white transition-all outline-none text-xs font-mono tracking-widest text-white placeholder:text-[#333333]"
            />
          </div>
        </div>

        {/* CATEGORY NAV */}
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-10 border-b border-[#1a1a1a] mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 py-3 text-[10px] font-bold tracking-[0.2em] transition-all whitespace-nowrap ${
                activeCategory === cat 
                ? 'bg-white text-black' 
                : 'bg-transparent text-[#555555] border border-[#1a1a1a] hover:text-white hover:border-white'
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
          <div className="ml-auto hidden md:flex items-center gap-3 px-6 py-3 border border-[#1a1a1a] text-[#555555] text-[10px] font-bold tracking-[0.2em] uppercase cursor-pointer hover:border-white hover:text-white transition-all">
            <SlidersHorizontal size={14} />
            <span>Sort: Volume</span>
          </div>
        </div>

        {/* ACTIVE MARKETS */}
        <section className="mb-24">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h2 className="text-sm font-bold tracking-[0.3em] text-white uppercase">Active Markets</h2>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
              <span className="text-[10px] font-mono text-[#555555] tracking-[0.3em]">SYNCHRONIZING TERMINAL DATA...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-l border-t border-[#1a1a1a]">
              <AnimatePresence mode='popLayout'>
                {activeMarkets.length === 0 ? (
                  <div className="col-span-full text-center py-40 border-r border-b border-[#1a1a1a] text-[#333333] font-mono uppercase tracking-[0.4em]">
                    NO ACTIVE RECORDS FOUND
                  </div>
                ) : (
                  activeMarkets.map((market) => <MarketCard key={market.id} market={market} />)
                )}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* EXPIRED & RESOLVED MARKETS */}
        {!loading && expiredMarkets.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-2 h-2 bg-red-600 rounded-full" />
              <h2 className="text-sm font-bold tracking-[0.3em] text-white uppercase">Settled & Expired</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-l border-t border-[#1a1a1a] opacity-60 hover:opacity-100 transition-opacity">
              <AnimatePresence mode='popLayout'>
                {expiredMarkets.map((market) => <MarketCard key={market.id} market={market} />)}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* PAGE INDICATOR ACCENT */}
        <div className="mt-20 flex items-center gap-4 text-[#222222]">
           <div className="h-[1px] flex-1 bg-[#1a1a1a]" />
           <span className="text-[10px] font-mono uppercase tracking-[0.3em]">END OF FEED</span>
           <div className="h-[1px] flex-1 bg-[#1a1a1a]" />
        </div>
      </div>
    </div>
  );
}
