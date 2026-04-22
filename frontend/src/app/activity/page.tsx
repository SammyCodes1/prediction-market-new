'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { useActivity } from '@/lib/hooks/useActivity';
import { Activity, ArrowUpRight, ArrowDownRight, Zap, Filter, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function ActivityPage() {
  const [sideFilter, setSideFilter] = React.useState('ALL');
  const { activity, loading } = useActivity(sideFilter);

  const handleExportCSV = () => {
    if (activity.length === 0) return;
    
    const headers = ['TRANSACTION_ID', 'MARKET_QUESTION', 'USER_IDENTITY', 'SIDE', 'AMOUNT_USDC', 'TIMESTAMP_UTC'];
    const rows = activity.map(bet => [
      `"${bet.id}"`,
      `"${bet.marketQuestion.replace(/"/g, '""')}"`,
      `"${bet.user.name}"`,
      `"${bet.outcome}"`,
      bet.amount.toFixed(2),
      `"${new Date(bet.timestamp * 1000).toISOString()}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `foresight_activity_${sideFilter.toLowerCase()}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black terminal-grid">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16 border-b-2 border-white pb-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Activity size={32} className="text-white" />
              <h1 className="text-6xl font-black tracking-tighter uppercase text-white">Global Feed</h1>
            </div>
            <p className="text-[#555555] font-mono text-sm tracking-[0.2em] uppercase">Real-time market commitments across ARC network</p>
          </div>
          
          <div className="flex gap-4">
            <div className="relative group">
              <select 
                value={sideFilter}
                onChange={(e) => setSideFilter(e.target.value)}
                className="appearance-none bg-black border border-[#1a1a1a] text-[#555555] text-[10px] font-bold tracking-[0.2em] uppercase px-8 py-3 pr-10 hover:border-white hover:text-white transition-all cursor-pointer focus:outline-none"
              >
                <option value="ALL">ALL SIDES</option>
                <option value="YES">YES ONLY</option>
                <option value="NO">NO ONLY</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#555555] group-hover:text-white transition-all">
                <Filter size={12} />
              </div>
            </div>
            <button 
              onClick={handleExportCSV}
              disabled={activity.length === 0}
              className="px-6 py-3 border border-[#1a1a1a] text-[#555555] text-[10px] font-bold tracking-[0.2em] uppercase hover:border-white hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              EXPORT CSV
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
            <span className="text-[10px] font-mono text-[#555555] tracking-[0.3em]">RETRIVING TRANSACTION LOGS...</span>
          </div>
        ) : (
          <div className="flex flex-col border border-[#1a1a1a] bg-black">
            {activity.length === 0 ? (
              <div className="text-center py-40 text-[#333333] font-mono uppercase tracking-[0.4em]">
                NO RECENT NETWORK ACTIVITY DETECTED
              </div>
            ) : (
              activity.map((bet, idx) => (
                <motion.div
                  key={bet.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-[#1a1a1a] hover:bg-[#050505] transition-all p-10 group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-8 flex-1">
                      <div className="w-12 h-12 border border-[#2a2a2a] bg-[#111111] flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-mono font-bold text-white">#{(idx + 1).toString().padStart(2, '0')}</span>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-white uppercase tracking-wider">{bet.user.name}</span>
                          <span className="text-[10px] font-mono text-[#333333] uppercase">COMMITTED</span>
                          <span className={`font-mono text-[11px] font-bold tracking-wider ${bet.outcome === 'YES' ? 'text-white underline' : 'text-[#555555]'}`}>
                            {bet.amount.toFixed(2)} USDC TO {bet.outcome}
                          </span>
                        </div>
                        
                        <Link href={`/markets/${bet.marketId}`}>
                          <h3 className="text-xl font-bold tracking-tight text-white group-hover:underline underline-offset-4">
                            {bet.marketQuestion}
                          </h3>
                        </Link>
                        
                        <div className="flex items-center gap-6 text-[9px] font-mono text-[#333333]">
                          <span className="uppercase">{new Date(bet.timestamp * 1000).toLocaleTimeString()}</span>
                          <span className="uppercase">BLOCK: {bet.id.split('-')[0].slice(0, 12)}...</span>
                          <span className="uppercase">NETWORK: ARC_T</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Link href={`/markets/${bet.marketId}`}>
                        <button className="px-6 py-3 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-gray-200 transition-all flex items-center gap-2">
                          TRADE <ChevronRight size={14} />
                        </button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* FEED END */}
        <div className="mt-20 flex justify-center">
           <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-[#222222]">--- END OF LIVE TRANSMISSION ---</span>
        </div>
      </div>
    </div>
  );
}
