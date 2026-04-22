'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { CONTRACT_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from '@/lib/web3';
import { usePortfolio } from '@/lib/hooks/useMarkets';
import abiData from '@/lib/abi.json';
import { 
  Briefcase, 
  TrendingUp, 
  Target, 
  Wallet,
  ArrowUpRight,
  History,
  Activity,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useAccount, useConnect, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';

// Component for a single position row
function PositionRow({ market, address, onAction }: { market: any, address: `0x${string}`, onAction: () => void }) {
  const { data: positionData, refetch: refetchPosition } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'getPosition',
    args: market && address ? [BigInt(market.id), address] : undefined,
    query: { enabled: !!address && !!market }
  });

  const { writeContractAsync: sellAsync } = useWriteContract();
  const { writeContractAsync: claimAsync } = useWriteContract();
  const [isProcessing, setIsProcessing] = useState(false);

  const yesAmount = positionData ? (positionData as [bigint, bigint])[0] : 0n;
  const noAmount = positionData ? (positionData as [bigint, bigint])[1] : 0n;

  const isResolved = market.state === 1;
  const winner = market.resolution === 1 ? 'YES' : market.resolution === 2 ? 'NO' : null;
  const winningAmount = market.resolution === 1 ? yesAmount : market.resolution === 2 ? noAmount : 0n;
  const lostAmount = market.resolution === 1 ? noAmount : market.resolution === 2 ? yesAmount : 0n;

  const handleLiquidate = async (side: number, amount: bigint) => {
    try {
      setIsProcessing(true);
      const hash = await sellAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'sell',
        args: [BigInt(market.id), BigInt(side), amount],
      });
      console.log(`Liquidation tx sent: ${hash}`);
      
      setTimeout(() => {
        onAction();
        refetchPosition();
      }, 2000);
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaim = async () => {
    try {
      setIsProcessing(true);
      const hash = await claimAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'claimPayout',
        args: [BigInt(market.id), address],
      });
      console.log(`Claim tx sent: ${hash}`);
      
      setTimeout(() => {
        onAction();
        refetchPosition();
      }, 2000);
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // If the user has a zero balance in this market, don't show the row
  if (!positionData || (yesAmount === 0n && noAmount === 0n)) return null;

  return (
    <div className="border-b border-[#1a1a1a] p-12 hover:bg-[#050505] transition-all flex flex-col md:flex-row gap-12">
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-bold px-3 py-1 bg-white text-black tracking-[0.2em]">
            {market.category.toUpperCase()}
          </span>
          {yesAmount > 0n && (
            <span className={`text-[9px] font-mono border px-3 py-1 ${isResolved && winner === 'NO' ? 'border-red-900 text-red-900' : 'border-white text-white'}`}>
              YES_POSITION {isResolved && winner === 'NO' && '(LOST)'}
            </span>
          )}
          {noAmount > 0n && (
            <span className={`text-[9px] font-mono border px-3 py-1 ${isResolved && winner === 'YES' ? 'border-red-900 text-red-900' : 'border-[#555555] text-[#555555]'}`}>
              NO_POSITION {isResolved && winner === 'YES' && '(LOST)'}
            </span>
          )}
          {isResolved && (
            <span className="text-[9px] font-bold px-3 py-1 bg-green-600 text-white tracking-[0.2em]">
              RESOLVED: {winner}
            </span>
          )}
        </div>
        <h3 className="text-3xl font-bold tracking-tight leading-tight uppercase">
          {market.question}
        </h3>
        <div className="flex gap-12 text-[10px] font-mono text-[#555555]">
          <div className="flex flex-col gap-1">
            <span>UNITS_YES</span>
            <span className="text-white">{parseFloat(formatUnits(yesAmount, USDC_DECIMALS)).toFixed(2)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span>UNITS_NO</span>
            <span className="text-white">{parseFloat(formatUnits(noAmount, USDC_DECIMALS)).toFixed(2)}</span>
          </div>
          {!isResolved && (
            <div className="flex flex-col gap-1">
              <span>CURRENT_PROB</span>
              <span className="text-white">{market.yesPercent}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="w-full md:w-80 flex flex-col justify-between border-l border-[#1a1a1a] pl-12 gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-[#555555] tracking-widest uppercase">
            {isResolved ? 'SETTLEMENT_VALUE' : 'LIQUIDITY_VALUE'}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-mono font-bold text-white">
              ~${isResolved 
                ? parseFloat(formatUnits(winningAmount, USDC_DECIMALS)).toFixed(2)
                : ((parseFloat(formatUnits(yesAmount, USDC_DECIMALS)) * market.yesPercent / 100) + (parseFloat(formatUnits(noAmount, USDC_DECIMALS)) * market.noPercent / 100)).toFixed(2)
              }
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {isResolved ? (
            winningAmount > 0n ? (
              <button 
                onClick={handleClaim}
                disabled={isProcessing}
                className="w-full py-4 bg-white text-black text-[10px] font-bold tracking-[0.3em] uppercase hover:bg-opacity-90 transition-all disabled:opacity-50"
              >
                {isProcessing ? 'PROCESSING...' : 'CLAIM PAYOUT'}
              </button>
            ) : (
              <div className="w-full py-4 border border-red-900 text-red-900 text-center text-[10px] font-bold tracking-[0.3em] uppercase">
                POSITION LOST
              </div>
            )
          ) : (
            <>
              {yesAmount > 0n && (
                <button 
                  onClick={() => handleLiquidate(1, yesAmount)}
                  disabled={isProcessing}
                  className="w-full py-4 border border-white text-[10px] font-bold tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'PROCESSING...' : 'LIQUIDATE YES'}
                </button>
              )}
              {noAmount > 0n && (
                <button 
                  onClick={() => handleLiquidate(2, noAmount)}
                  disabled={isProcessing}
                  className="w-full py-4 border border-[#555555] text-[10px] font-bold tracking-[0.3em] uppercase hover:bg-[#555555] hover:text-black transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'PROCESSING...' : 'LIQUIDATE NO'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export default function PortfolioPage() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { tradedMarkets, loading: portfolioLoading } = usePortfolio();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Wallet balance
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = () => {
    setIsSyncing(true);
    refetchBalance();
    window.location.reload(); 
  };

  const displayBalance = balanceData 
    ? `${parseFloat(formatUnits(balanceData.value, USDC_DECIMALS)).toFixed(2)}` 
    : '0.00';

  const stats = [
    { label: 'WALLET BALANCE', value: `${displayBalance} USDC`, change: '', icon: Wallet },
    { label: 'TRADED MARKETS', value: portfolioLoading ? '...' : tradedMarkets.length.toString().padStart(2, '0'), change: '', icon: Briefcase },
    { label: 'WIN PROBABILITY', value: '--%', change: '', icon: Target },
    { label: 'NET ASSETS (EST)', value: 'LIVE', change: '', icon: TrendingUp },
  ];

  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  // Only show the real content if we're mounted on the client
  // During SSR, we show a simplified "loading" or empty state to prevent hydration errors
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black terminal-grid flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black terminal-grid flex items-center justify-center">
        <div className="max-w-md w-full p-12 border border-[#1a1a1a] bg-black text-center flex flex-col gap-8">
           <div className="w-16 h-16 border-2 border-white mx-auto flex items-center justify-center">
              <Wallet size={32} className="text-white" />
           </div>
           <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black tracking-tighter uppercase">Terminal Locked</h1>
              <p className="text-[#555555] font-mono text-xs tracking-widest uppercase">Connect your wallet to access portfolio data</p>
           </div>
           <GlassButton size="lg" className="w-full" onClick={handleConnect}>
              INITIALIZE CONNECTION
           </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black terminal-grid">
      <div className="max-w-[1400px] mx-auto px-6 py-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16 border-b-2 border-white pb-10">
          <div className="flex flex-col gap-4">
            <h1 className="text-6xl font-black tracking-tighter uppercase">Portfolio Control</h1>
            <p className="text-[#555555] font-mono text-sm tracking-widest uppercase">Overview of your active commitments and history</p>
          </div>
          <div className="flex items-center gap-6">
             <button 
               onClick={handleManualSync}
               className="flex items-center gap-2 px-4 py-2 border border-[#1a1a1a] text-[10px] font-bold text-[#555555] hover:text-white hover:border-white transition-all uppercase"
             >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                Refresh Data
             </button>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-[#333333] tracking-widest uppercase">ACCOUNT_ID</span>
                <span className="text-xs font-mono text-white tracking-widest">{address?.slice(0, 12)}...{address?.slice(-8)}</span>
             </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-[#1a1a1a] mb-20 bg-black">
          {stats.map((stat, idx) => (
            <div key={idx} className={`p-10 flex flex-col gap-4 ${idx !== stats.length - 1 ? 'border-r border-[#1a1a1a]' : ''} ${idx >= 2 ? 'border-t md:border-t-0 border-[#1a1a1a]' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <stat.icon size={16} className="text-[#555555]" />
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase">{stat.label}</span>
                </div>
                {stat.change && <span className="text-[9px] font-mono text-white border border-[#1a1a1a] px-2 py-0.5">{stat.change}</span>}
              </div>
              <div className="text-3xl md:text-4xl font-mono font-bold text-white tracking-tighter">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* ACTIVE POSITIONS */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-12 border-b border-[#1a1a1a] pb-6">
            <h2 className="text-3xl font-black tracking-tighter uppercase">Active Commitments</h2>
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#555555] tracking-widest uppercase animate-pulse">
               <Activity size={14} />
               Live Tracking Enabled
            </div>
          </div>

          {portfolioLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-0 border-t border-[#1a1a1a]">
              {tradedMarkets.length === 0 ? (
                <div className="text-center py-24 text-[#333333] font-mono uppercase tracking-[0.4em] flex flex-col gap-4 items-center">
                  <span>NO ACTIVE POSITIONS DETECTED</span>
                  <p className="text-[10px] text-[#222222] max-w-xs">If you just placed a trade, wait 10 seconds for the indexer to sync and press refresh.</p>
                </div>
              ) : (
                tradedMarkets.map((market) => (
                  <PositionRow 
                    key={market.id} 
                    market={market} 
                    address={address!} 
                    onAction={() => refetchBalance()} 
                  />
                ))
              )}
            </div>
          )}
        </section>

        {/* RECENT ACTIVITY TABLE */}
        <section>
          <div className="flex items-center justify-between mb-12 border-b border-[#1a1a1a] pb-6">
            <h2 className="text-3xl font-black tracking-tighter uppercase">Audit Log</h2>
            <button className="text-[10px] font-bold text-[#555555] tracking-widest uppercase hover:text-white transition-all flex items-center gap-2">
               VIEW ALL TRANSACTIONS <ArrowRight size={14} />
            </button>
          </div>

          <div className="border border-[#1a1a1a] bg-[#050505] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="p-8 text-[10px] font-bold text-[#333333] uppercase tracking-[0.2em]">MARKET_REF</th>
                  <th className="p-8 text-[10px] font-bold text-[#333333] uppercase tracking-[0.2em]">SIDE</th>
                  <th className="p-8 text-[10px] font-bold text-[#333333] uppercase tracking-[0.2em]">QUANTITY</th>
                  <th className="p-8 text-[10px] font-bold text-[#333333] uppercase tracking-[0.2em]">TIMESTAMP</th>
                  <th className="p-8 text-[10px] font-bold text-[#333333] uppercase tracking-[0.2em]">STATUS</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[11px] text-[#555555]">
                {tradedMarkets.slice(0, 5).map((m) => (
                  <tr key={m.id} className="border-b border-[#1a1a1a] hover:bg-black transition-all">
                    <td className="p-8 uppercase text-white font-bold tracking-tight truncate max-w-[200px]">{m.question}</td>
                    <td className="p-8"><span className="text-white underline">POSITION</span></td>
                    <td className="p-8 text-white">ACTIVE</td>
                    <td className="p-8 uppercase">{new Date(m.closesAt).toLocaleDateString()}</td>
                    <td className="p-8"><span className="px-2 py-0.5 border border-[#1a1a1a] text-[9px]">LIVE</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
