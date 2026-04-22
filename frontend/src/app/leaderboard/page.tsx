'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLeaderboard } from '@/lib/hooks/useActivity';
import { Trophy, Crown, Medal, TrendingUp, BarChart2, ChevronRight, Activity, Loader2 } from 'lucide-react';

export default function LeaderboardPage() {
  const { leaderboard, loading } = useLeaderboard();
  const topThree = leaderboard.slice(0, 3);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black terminal-grid">
      <div className="max-w-[1400px] mx-auto px-6 py-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16 border-b-2 border-white pb-10">
          <div className="flex flex-col gap-4">
            <h1 className="text-6xl font-black tracking-tighter uppercase">High Scores</h1>
            <p className="text-[#555555] font-mono text-sm tracking-widest uppercase">The top performing entities in the Foresight system</p>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-[#333333] tracking-widest uppercase">SNAPSHOT_TIME</span>
                <span className="text-xs font-mono text-white tracking-widest">{new Date().toISOString().replace('T', ' ').split('.')[0]}</span>
             </div>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-40 border border-[#1a1a1a] text-[#555555] font-mono uppercase tracking-[0.2em]">
            NO TRADING ACTIVITY RECORDED YET
          </div>
        ) : (
          <>
            {/* TOP THREE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#1a1a1a] mb-20 bg-black">
              {topThree.map((trader, idx) => (
                <div key={trader.address} className={`p-16 flex flex-col items-center gap-8 text-center ${idx !== topThree.length - 1 ? 'border-r border-[#1a1a1a]' : ''}`}>
                   <div className="relative">
                      <div className="w-24 h-24 border border-[#2a2a2a] bg-[#0a0a0a] flex items-center justify-center">
                         {idx === 0 ? <Crown size={40} className="text-white" /> : <Medal size={40} className="text-[#555555]" />}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white text-black font-black text-xl flex items-center justify-center">
                         {trader.rank}
                      </div>
                   </div>

                   <div className="flex flex-col gap-2">
                      <h3 className="text-2xl font-black tracking-tight uppercase underline underline-offset-4">{trader.name}</h3>
                      <span className="text-[10px] font-mono text-[#555555] tracking-widest">{trader.address}</span>
                   </div>

                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#333333] tracking-[0.2em] uppercase">ACCUMULATED_PROFIT</span>
                      <span className={`text-5xl font-mono font-bold tracking-tighter ${trader.profit >= 0 ? 'text-white' : 'text-red-500'}`}>
                        {trader.profit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(trader.profit))}
                      </span>
                   </div>

                   <div className="w-full grid grid-cols-2 gap-4 mt-4 pt-8 border-t border-[#1a1a1a]">
                      <div className="flex flex-col gap-1 items-start">
                         <span className="text-[9px] font-bold text-[#333333] uppercase tracking-widest">VOLUME</span>
                         <span className="text-sm font-mono text-white">{formatCurrency(trader.volume)}</span>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                         <span className="text-[9px] font-bold text-[#333333] uppercase tracking-widest">WIN_RATE</span>
                         <span className="text-sm font-mono text-white">{trader.winRate}%</span>
                      </div>
                   </div>
                </div>
              ))}
            </div>

            {/* FULL RANKINGS TABLE */}
            <section>
              <div className="flex items-center justify-between mb-12 border-b border-[#1a1a1a] pb-6">
                <h2 className="text-3xl font-black tracking-tighter uppercase">Full Rankings</h2>
                <div className="flex items-center gap-6">
                   <span className="text-[10px] font-mono text-[#555555] tracking-widest uppercase">SORTED_BY: PROFIT_DESC</span>
                   <div className="w-4 h-4 bg-white" />
                </div>
              </div>

              <div className="border border-[#1a1a1a] bg-[#050505] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1a1a1a]">
                      <th className="p-8 text-[10px] font-bold text-[#333333] uppercase tracking-[0.2em]">RANK</th>
                      <th className="p-8 text-[10px] font-bold text-[#333333] uppercase tracking-[0.2em]">IDENTITY</th>
                      <th className="p-8 text-[10px] font-bold text-[#333333] uppercase tracking-[0.2em]">TOTAL_VOLUME</th>
                      <th className="p-8 text-[10px] font-bold text-[#333333] uppercase tracking-[0.2em]">WIN_RATE</th>
                      <th className="p-8 text-[10px] font-bold text-[#333333] uppercase tracking-[0.2em] text-right">NET_PROFIT</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[11px] text-[#555555]">
                    {leaderboard.map((trader) => (
                      <tr key={trader.address} className="border-b border-[#1a1a1a] hover:bg-black transition-all">
                        <td className="p-8 font-black text-lg text-white">#{trader.rank.toString().padStart(2, '0')}</td>
                        <td className="p-8">
                           <div className="flex flex-col gap-1">
                              <span className="text-white font-bold tracking-tight uppercase text-sm">{trader.name}</span>
                              <span className="text-[10px] text-[#333333] tracking-widest">{trader.address}</span>
                           </div>
                        </td>
                        <td className="p-8 text-white">{formatCurrency(trader.volume)}</td>
                        <td className="p-8">
                           <div className="flex items-center gap-4">
                              <div className="flex-1 max-w-[60px] h-[1px] bg-[#1a1a1a] relative">
                                 <div className="absolute top-0 left-0 h-full bg-white" style={{ width: `${trader.winRate}%` }} />
                              </div>
                              <span className="text-white">{trader.winRate}%</span>
                           </div>
                        </td>
                        <td className="p-8 text-right font-bold text-sm">
                           <span className={trader.profit >= 0 ? 'text-white' : 'text-red-500'}>
                              {trader.profit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(trader.profit))}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* REFRESH ACCENT */}
        <div className="mt-20 flex flex-col items-center gap-6 opacity-20">
           <Activity size={24} className="text-white" />
           <span className="text-[9px] font-mono uppercase tracking-[0.5em]">CONTINUOUS_DATA_STREAM_ENABLED</span>
        </div>

      </div>
    </div>
  );
}
