'use client';

import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useMarkets } from '@/lib/hooks/useMarkets';
import { useStats } from '@/lib/hooks/useActivity';
import { ArrowRight, Loader2, TrendingUp, BarChart3, Users, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { markets, loading: marketsLoading } = useMarkets();
  const { stats: apiStats } = useStats();
  
  const featuredMarkets = markets.slice(0, 3);
  
  const formatValue = (val: number, isCurrency: boolean = false) => {
    if (!isCurrency) return val.toLocaleString();
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  const stats = [
    { label: 'TOTAL VOLUME', value: apiStats ? formatValue(apiStats.totalVolume, true) : '$0.00', icon: BarChart3 },
    { label: 'ACTIVE MARKETS', value: apiStats ? formatValue(apiStats.activeMarkets) : '0', icon: TrendingUp },
    { label: 'TOTAL TRADERS', value: apiStats ? formatValue(apiStats.traders) : '0', icon: Users },
    { label: '24H VOLUME', value: apiStats ? formatValue(apiStats.volume24h, true) : '$0.00', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-black terminal-grid">
      <div className="max-w-[1400px] mx-auto px-6 py-20">
        
        {/* HERO SECTION */}
        <section className="py-24 border-b border-[#1a1a1a] mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-8 text-white">
              PREDICT<br />THE FUTURE.
            </h1>
            <p className="text-xl md:text-2xl font-medium text-[#888888] max-w-3xl mx-auto mb-12 uppercase tracking-tight">
              Foresight is a premium prediction market for elite traders. 
              Real-time insights. Absolute transparency.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Link href="/markets">
                <GlassButton size="lg" className="min-w-[240px]">
                  EXPLORE MARKETS
                </GlassButton>
              </Link>
              <Link href="/portfolio">
                <GlassButton variant="outline" size="lg" className="min-w-[240px]">
                  MY PORTFOLIO
                </GlassButton>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* STATS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-[#1a1a1a] mb-20 bg-black">
          {stats.map((stat, idx) => (
            <div key={idx} className={`p-10 flex flex-col gap-4 ${idx !== stats.length - 1 ? 'border-r border-[#1a1a1a]' : ''} ${idx >= 2 ? 'border-t md:border-t-0 border-[#1a1a1a]' : ''}`}>
              <div className="flex items-center gap-2">
                <stat.icon size={16} className="text-[#555555]" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase">{stat.label}</span>
              </div>
              <div className="text-4xl md:text-5xl font-mono font-bold text-white tracking-tighter">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* FEATURED MARKETS */}
        <section>
          <div className="flex items-end justify-between mb-12 border-b-2 border-white pb-4">
            <h2 className="text-4xl font-black tracking-tighter">FEATURED MARKETS</h2>
            <Link href="/markets" className="flex items-center gap-2 text-sm font-bold tracking-widest hover:translate-x-1 transition-transform">
              VIEW ALL <ArrowRight size={16} />
            </Link>
          </div>

          {marketsLoading ? (
            <div className="flex items-center justify-center py-24 border border-[#1a1a1a]">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-0 border-t border-[#1a1a1a]">
              {featuredMarkets.length === 0 ? (
                <div className="text-center py-24 border border-[#1a1a1a] text-[#555555] font-mono uppercase tracking-widest">
                  NO ACTIVE MARKETS FOUND
                </div>
              ) : (
                featuredMarkets.map((market) => {
                  const isExpired = new Date(market.closesAt) <= new Date();
                  const isResolved = market.state !== 0;

                  return (
                    <Link key={market.id} href={`/markets/${market.id}`}>
                      <div className="group border-b border-[#1a1a1a] p-12 hover:bg-[#0a0a0a] transition-all flex flex-col md:flex-row md:items-center justify-between gap-12 relative overflow-hidden">
                        <div className="flex flex-col gap-4 flex-1">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold px-3 py-1 bg-white text-black tracking-[0.2em]">
                              {market.category.toUpperCase()}
                            </span>
                            {(isExpired || isResolved) && (
                              <span className="text-[10px] font-bold px-3 py-1 bg-red-600 text-white tracking-[0.2em]">
                                {isResolved ? 'RESOLVED' : 'EXPIRED'}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-[#555555]">
                              REF: {market.id.padStart(4, '0')}
                            </span>
                          </div>
                          <h3 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight group-hover:underline underline-offset-8">
                            {market.question}
                          </h3>
                          <div className="flex items-center gap-6 text-[11px] font-mono text-[#555555]">
                            <span>BY: {market.creator.name}</span>
                            <span>VOL: {formatValue(market.volume, true)}</span>
                          </div>
                        </div>

                        <div className="w-full md:w-80 flex flex-col gap-4">
                          <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-white tracking-widest mb-1">YES</span>
                              <span className="text-3xl font-mono font-bold text-white">{market.yesPercent}%</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-[#555555] tracking-widest mb-1">NO</span>
                              <span className="text-3xl font-mono font-bold text-[#555555]">{market.noPercent}%</span>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-[#1a1a1a] relative">
                            <div 
                              className="absolute top-0 left-0 h-full bg-white transition-all duration-1000" 
                              style={{ width: `${market.yesPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </section>

        {/* FOOTER ACCENT */}
        <div className="mt-40 border-t border-[#1a1a1a] pt-12 flex justify-between items-center opacity-30">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em]">FORESIGHT TERMINAL v1.0.4</span>
          <div className="flex gap-8">
            <div className="w-4 h-4 bg-white" />
            <div className="w-4 h-4 bg-[#1a1a1a]" />
            <div className="w-4 h-4 bg-[#2a2a2a]" />
          </div>
        </div>
      </div>
    </div>
  );
}
