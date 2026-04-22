'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMarket } from '@/lib/hooks/useMarkets';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { CONTRACT_ADDRESS, USDC_ADDRESS, USDC_DECIMALS, arcTestnet } from '@/lib/web3';
import abiData from '@/lib/abi.json';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect, useSwitchChain, useBalance, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Loader2,
  Activity,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

const USDC_ABI = [
  {
    "name": "approve",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }]
  }
] as const;

export default function MarketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { market, loading: marketLoading } = useMarket(id as string);

  const formatValue = (val: number, isCurrency: boolean = false) => {
    if (!isCurrency) return val.toLocaleString();
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Contract Owner
  const { data: contractOwner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'owner',
  });

  const isOwner = isConnected && address && contractOwner && 
    (contractOwner as string).toLowerCase() === address.toLowerCase();
  
  const isCreator = isConnected && address && market?.creator?.address &&
    market.creator.address.toLowerCase() === address.toLowerCase();

  const canResolve = isOwner || isCreator;

  // Wallet balance
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
 } as any);
  
  // Market position
  const { data: positionData, refetch: refetchPosition } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'getPosition',
    args: market && address ? [BigInt(market.id), address] : undefined,
    query: { enabled: !!address && !!market }
  }as any);

  const yesBalance = positionData ? (positionData as [bigint, bigint])[0] : 0n;
  const noBalance = positionData ? (positionData as [bigint, bigint])[1] : 0n;

  const [betSide, setBetSide] = useState<'YES' | 'NO'>('YES');
  const [betAmount, setBetAmount] = useState<string>('');
  const [txStep, setTxStep] = useState<'idle' | 'approving' | 'approved' | 'buying' | 'resolving' | 'claiming' | 'complete'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Approval Hook
  const { writeContractAsync: approveAsync, data: approveHash } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ 
    hash: approveHash 
  });

  // Buy Hook
  const { writeContractAsync: buyAsync, data: buyHash } = useWriteContract();
  const { isLoading: isBuyConfirming, isSuccess: isBuyConfirmed } = useWaitForTransactionReceipt({ 
    hash: buyHash 
  });

  // Resolve Hook
  const { writeContractAsync: resolveAsync, data: resolveHash } = useWriteContract();
  const { isLoading: isResolveConfirming, isSuccess: isResolveConfirmed } = useWaitForTransactionReceipt({ 
    hash: resolveHash 
  });

  // Claim Hook
  const { writeContractAsync: claimAsync, data: claimHash } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({ 
    hash: claimHash 
  });

  useEffect(() => {
    if (isApproveConfirmed) setTxStep('approved');
  }, [isApproveConfirmed]);

  useEffect(() => {
    if (isBuyConfirmed || isResolveConfirmed || isClaimConfirmed) {
      setTxStep('complete');
      refetchBalance();
      refetchPosition();
      // Reload page after a delay to show updated market state
      if (isResolveConfirmed) setTimeout(() => window.location.reload(), 2000);
    }
  }, [isBuyConfirmed, isResolveConfirmed, isClaimConfirmed, refetchBalance, refetchPosition]);

  const isWrongNetwork = isConnected && chain?.id !== arcTestnet.id;

  if (marketLoading || !mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
        <span className="text-[10px] font-mono text-[#555555] tracking-[0.3em]">SYNCHRONIZING TERMINAL...</span>
      </div>
    );
  }

  if (!market) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono uppercase tracking-[0.4em]">ERROR: MARKET_NOT_FOUND</div>;

  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  const handleSwitchNetwork = () => {
    switchChain({ chainId: arcTestnet.id });
  };

  const handleApprove = async () => {
    if (!isConnected || !betAmount) return;
    setError(null);
    try {
      setTxStep('approving');
      const amount = parseUnits(betAmount, USDC_DECIMALS);
      await approveAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, amount],
      });
    } catch (err: any) {
      console.error("Approval Error:", err);
      setError(err.shortMessage || err.message || "Approval failed");
      setTxStep('idle');
    }
  };

  const handleBuy = async () => {
    if (!isConnected || !betAmount) return;
    setError(null);
    try {
      setTxStep('buying');
      const amount = parseUnits(betAmount, USDC_DECIMALS);
      await buyAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'buy',
        args: [BigInt(market.id), BigInt(betSide === 'YES' ? 1 : 2), amount],
      });
    } catch (err: any) {
      console.error("Buy Error:", err);
      setError(err.shortMessage || err.message || "Buy failed");
      setTxStep('approved');
    }
  };

  const handleResolve = async (outcome: number) => {
    if (!isOwner) return;
    setError(null);
    try {
      setTxStep('resolving');
      await resolveAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'resolveMarket',
        args: [BigInt(market.id), BigInt(outcome)],
      });
    } catch (err: any) {
      console.error("Resolve Error:", err);
      setError(err.shortMessage || err.message || "Resolution failed");
      setTxStep('idle');
    }
  };

  const handleClaim = async () => {
    if (!isConnected) return;
    setError(null);
    try {
      setTxStep('claiming');
      await claimAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'claimPayout',
        args: [BigInt(market.id), address!],
      });
    } catch (err: any) {
      console.error("Claim Error:", err);
      setError(err.shortMessage || err.message || "Claim failed");
      setTxStep('idle');
    }
  };

  const potentialPayout = betAmount ? (parseFloat(betAmount) * (100 / (betSide === 'YES' ? market.yesPercent : market.noPercent))).toFixed(2) : '0.00';
  
  const isMarketResolved = market.state === 1;
  const isMarketCancelled = market.state === 2;
  const isMarketExpired = !isMarketResolved && !isMarketCancelled && new Date(market.closesAt) <= new Date();
  const winner = market.resolution === 1 ? 'YES' : market.resolution === 2 ? 'NO' : null;
  const userWinningBalance = market.resolution === 1 ? yesBalance : market.resolution === 2 ? noBalance : 0n;
  const hasClaimable = isMarketResolved && userWinningBalance > 0n;

  return (
    <div className="min-h-screen bg-black terminal-grid">
      <div className="max-w-[1400px] mx-auto px-6 py-20">
        
        {/* TOP NAV BAR */}
        <div className="flex items-center justify-between mb-16 border-b border-[#1a1a1a] pb-8">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] text-[#555555] hover:text-white transition-all uppercase"
          >
            <ArrowLeft size={14} />
            BACK TO TERMINAL
          </button>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-mono text-[#333333]">STN: ARC_TESTNET</span>
            <div className="w-2 h-2 bg-white animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-[#1a1a1a]">
          
          {/* MAIN COLUMN */}
          <div className="lg:col-span-8 flex flex-col border-r border-[#1a1a1a]">
            
            {/* CONTENT AREA */}
            <div className="p-16 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-4 mb-8">
                <span className="text-[10px] font-bold px-3 py-1 bg-white text-black tracking-[0.2em]">
                  {market.category.toUpperCase()}
                </span>
                {(isMarketExpired || isMarketResolved) && (
                  <span className="text-[10px] font-bold px-3 py-1 bg-red-600 text-white tracking-[0.2em]">
                    {isMarketResolved ? 'RESOLVED' : 'EXPIRED'}
                  </span>
                )}
                <span className="text-[10px] font-mono text-[#555555]">
                  ID: {market.id.padStart(4, '0')}
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-12 uppercase">
                {market.question}
              </h1>

              <div className="flex flex-wrap items-center gap-12 text-[11px] font-mono text-[#555555]">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#1a1a1a] border border-[#2a2a2a]" />
                  <span>AUTHOR: {market.creator.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={16} />
                  <span>TRADERS: {market.bettors || 0}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Activity size={16} />
                  <span>VOL: {formatValue(market.volume, true)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={16} />
                  <span>EXPIRES: {new Date(market.closesAt).toLocaleString().toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* DATA GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
               <div className="p-16 border-r border-[#1a1a1a]">
                  <span className="text-[10px] font-bold text-[#555555] tracking-[0.3em] uppercase mb-10 block">CURRENT PROBABILITY</span>
                  <div className="flex flex-col gap-8">
                     <div className="flex justify-between items-end">
                        <span className="text-6xl font-mono font-bold text-white tracking-tighter">{market.yesPercent}%</span>
                        <span className="text-[10px] font-bold text-white tracking-[0.2em] mb-2 uppercase">YES OUTCOME</span>
                     </div>
                     <div className="w-full h-1 bg-[#1a1a1a] relative">
                        <div className="absolute top-0 left-0 h-full bg-white transition-all duration-1000" style={{ width: `${market.yesPercent}%` }} />
                     </div>
                  </div>
               </div>
               <div className="p-16">
                  <span className="text-[10px] font-bold text-[#555555] tracking-[0.3em] uppercase mb-10 block">MARKET INSIGHT</span>
                  <p className="text-[#888888] font-medium leading-relaxed uppercase text-sm tracking-tight">
                    {market.description}
                  </p>
               </div>
            </div>

            {/* SPECS BAR */}
            <div className="p-10 border-t border-[#1a1a1a] bg-[#050505] flex flex-wrap gap-12">
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-[#333333] tracking-widest uppercase">RESOLUTION SOURCE</span>
                  <span className="text-[10px] font-mono text-[#555555] uppercase">{market.resolutionMethod || 'BLOCKCHAIN_ORACLE_V1'}</span>
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-[#333333] tracking-widest uppercase">SETTLEMENT</span>
                  <span className="text-[10px] font-mono text-[#555555] uppercase text-white">USDC_NATIVE</span>
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-[#333333] tracking-widest uppercase">STATUS</span>
                  <span className="text-[10px] font-mono text-white animate-pulse">ACTIVE_TRADING</span>
               </div>
            </div>

            {/* RECENT TRANSACTIONS SECTION */}
            <div className="border-t border-[#1a1a1a]">
               <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* YES TRADES */}
                  <div className="border-r border-[#1a1a1a]">
                    <div className="p-6 border-b border-[#1a1a1a] bg-[#080808] flex justify-between items-center">
                       <span className="text-[10px] font-bold text-white tracking-[0.3em] uppercase">YES_TRANSACTIONS</span>
                       <div className="w-2 h-2 bg-white" />
                    </div>
                    <div className="flex flex-col">
                       {market.trades?.filter((t: any) => t.side === 'YES').length === 0 ? (
                          <div className="p-12 text-center text-[10px] font-mono text-[#222222] uppercase tracking-widest">NO_YES_COMMITS</div>
                       ) : (
                          market.trades?.filter((t: any) => t.side === 'YES').map((trade: any, idx: number) => (
                             <div key={idx} className="p-6 border-b border-[#1a1a1a] flex justify-between items-center hover:bg-[#050505] transition-all">
                                <div className="flex flex-col gap-1">
                                   <span className="text-[11px] font-mono text-white font-bold">{trade.trader.slice(0, 6)}...{trade.trader.slice(-4)}</span>
                                   <span className="text-[9px] font-mono text-[#333333]">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <span className="text-sm font-mono font-bold text-white">+{parseFloat(trade.amount).toFixed(2)}</span>
                             </div>
                          ))
                       )}
                    </div>
                  </div>

                  {/* NO TRADES */}
                  <div>
                    <div className="p-6 border-b border-[#1a1a1a] bg-[#080808] flex justify-between items-center">
                       <span className="text-[10px] font-bold text-[#555555] tracking-[0.3em] uppercase">NO_TRANSACTIONS</span>
                       <div className="w-2 h-2 bg-[#222222]" />
                    </div>
                    <div className="flex flex-col">
                       {market.trades?.filter((t: any) => t.side === 'NO').length === 0 ? (
                          <div className="p-12 text-center text-[10px] font-mono text-[#222222] uppercase tracking-widest">NO_NO_COMMITS</div>
                       ) : (
                          market.trades?.filter((t: any) => t.side === 'NO').map((trade: any, idx: number) => (
                             <div key={idx} className="p-6 border-b border-[#1a1a1a] flex justify-between items-center hover:bg-[#050505] transition-all">
                                <div className="flex flex-col gap-1">
                                   <span className="text-[11px] font-mono text-[#555555] font-bold">{trade.trader.slice(0, 6)}...{trade.trader.slice(-4)}</span>
                                   <span className="text-[9px] font-mono text-[#333333]">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <span className="text-sm font-mono font-bold text-[#555555]">+{parseFloat(trade.amount).toFixed(2)}</span>
                             </div>
                          ))
                       )}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* TRADING SIDEBAR */}
          <div className="lg:col-span-4 bg-[#0a0a0a] p-12">
             <div className="sticky top-32 flex flex-col gap-12">
                
                {/* MARKET STATUS & RESOLUTION */}
                {isMarketResolved ? (
                  <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-4">
                      <h3 className="text-3xl font-black tracking-tighter uppercase text-white">Market Resolved</h3>
                      <div className="h-1 w-12 bg-white" />
                    </div>
                    
                    <div className="p-8 border border-white bg-white text-black text-center flex flex-col gap-2">
                      <span className="text-[10px] font-bold tracking-[0.4em] uppercase">Official Outcome</span>
                      <span className="text-5xl font-black tracking-tighter">{winner}</span>
                    </div>

                    <div className="flex flex-col gap-4 p-8 border border-[#1a1a1a] bg-black font-mono">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#555555]">YOUR_YES_UNITS</span>
                        <span className="text-white">{parseFloat(formatUnits(yesBalance, USDC_DECIMALS)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#555555]">YOUR_NO_UNITS</span>
                        <span className="text-white">{parseFloat(formatUnits(noBalance, USDC_DECIMALS)).toFixed(2)}</span>
                      </div>
                    </div>

                    {hasClaimable ? (
                      <div className="flex flex-col gap-4">
                        <p className="text-[10px] font-mono text-white text-center uppercase tracking-widest animate-pulse">
                          Winnings Detected: {parseFloat(formatUnits(userWinningBalance, USDC_DECIMALS)).toFixed(2)} USDC
                        </p>
                        <GlassButton 
                          variant="primary" 
                          size="lg" 
                          className="w-full h-20 text-lg"
                          onClick={handleClaim}
                          loading={txStep === 'claiming' || isClaimConfirming}
                          disabled={txStep === 'complete'}
                        >
                          {txStep === 'complete' ? 'PAYOUT_CLAIMED' : 'CLAIM PAYOUT'}
                        </GlassButton>
                      </div>
                    ) : (
                      <div className="p-6 border border-[#1a1a1a] text-center">
                        <span className="text-[10px] font-mono text-[#333333] uppercase tracking-widest">No Claimable Payout</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-4">
                      <h3 className="text-3xl font-black tracking-tighter uppercase">Execute Trade</h3>
                      <div className="h-1 w-12 bg-white" />
                    </div>

                    <div className="flex border border-[#1a1a1a]">
                      <button 
                        onClick={() => { setBetSide('YES'); setTxStep('idle'); }}
                        className={`flex-1 py-4 text-[10px] font-bold tracking-[0.3em] transition-all ${betSide === 'YES' ? 'bg-white text-black' : 'bg-transparent text-[#555555] hover:text-white'}`}
                      >
                        YES
                      </button>
                      <button 
                        onClick={() => { setBetSide('NO'); setTxStep('idle'); }}
                        className={`flex-1 py-4 text-[10px] font-bold tracking-[0.3em] transition-all ${betSide === 'NO' ? 'bg-white text-black' : 'bg-transparent text-[#555555] hover:text-white'}`}
                      >
                        NO
                      </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between text-[10px] font-bold text-[#555555] tracking-widest uppercase px-1">
                        <span>TRANSACTION AMOUNT</span>
                        <span className="font-mono">
                          {mounted && isConnected && balanceData ? `${parseFloat(formatUnits(balanceData.value, USDC_DECIMALS)).toFixed(2)} USDC` : 'WALLET: --'}
                        </span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={betAmount}
                          onChange={(e) => { setBetAmount(e.target.value); setTxStep('idle'); }}
                          className="w-full bg-black border border-[#1a1a1a] p-6 text-3xl font-mono font-bold outline-none focus:border-white transition-all text-white placeholder:text-[#222222]"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 font-mono font-bold text-[#333333]">USDC</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6 p-8 border border-[#1a1a1a] bg-black font-mono">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#555555]">PROBABILITY</span>
                        <span className="text-white">{betSide === 'YES' ? market.yesPercent : market.noPercent}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#555555]">EST. PAYOUT</span>
                        <span className="text-white">${potentialPayout}</span>
                      </div>
                      <div className="h-[1px] bg-[#1a1a1a]" />
                      <div className="flex justify-between text-xs">
                        <span className="text-[#555555]">GAS_TOKEN</span>
                        <span className="text-white uppercase">USDC (ARC)</span>
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 border border-red-900 bg-red-900/10 text-red-500 text-[10px] font-mono flex items-start gap-3">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span className="uppercase">{error}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      {!isConnected ? (
                        <GlassButton size="lg" className="w-full h-20 text-lg border-2" onClick={handleConnect}>
                          CONNECT TERMINAL
                        </GlassButton>
                      ) : isWrongNetwork ? (
                        <GlassButton variant="primary" size="lg" className="w-full h-20 text-lg bg-red-600 hover:bg-red-700 text-white" onClick={handleSwitchNetwork}>
                          <AlertTriangle className="mr-2" size={20} />
                          SWITCH TO ARC
                        </GlassButton>
                      ) : txStep === 'complete' ? (
                        <div className="flex flex-col gap-4">
                          <div className="h-20 border border-white flex items-center justify-center gap-3 bg-white text-black font-black uppercase tracking-tighter">
                              <CheckCircle2 size={24} />
                              COMMITMENT_CONFIRMED
                          </div>
                          <GlassButton variant="outline" size="md" onClick={() => { setTxStep('idle'); setBetAmount(''); }}>
                              NEW TRANSACTION
                          </GlassButton>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <GlassButton 
                            variant={txStep === 'approved' || isApproveConfirmed ? 'outline' : 'secondary'} 
                            size="lg" 
                            className={`w-full h-16 ${txStep === 'approved' || isApproveConfirmed ? 'border-ios-green text-ios-green opacity-50' : ''}`}
                            onClick={handleApprove}
                            loading={txStep === 'approving' || isApproveConfirming}
                            disabled={txStep === 'approved' || isApproveConfirmed || !betAmount}
                          >
                            {txStep === 'approved' || isApproveConfirmed ? '1. AUTH_GRANTED' : '1. AUTH_USDC'}
                          </GlassButton>
                          <GlassButton 
                            variant="primary" 
                            size="lg" 
                            className="w-full h-20 text-lg"
                            onClick={handleBuy}
                            disabled={!(txStep === 'approved' || isApproveConfirmed) || !betAmount}
                            loading={txStep === 'buying' || isBuyConfirming}
                          >
                            2. COMMIT_{betSide}
                          </GlassButton>
                        </div>
                      )}
                      <p className="text-[9px] font-mono text-[#333333] text-center leading-relaxed tracking-tight">
                        BY COMMITTING FUNDS, YOU ACKNOWLEDGE THE RISK OF TOTAL CAPITAL LOSS. SETTLEMENT IS FINAL.
                      </p>
                    </div>
                  </>
                )}

                {/* RESOLUTION CONTROLS */}
                {canResolve && !isMarketResolved && (
                  <div className="mt-12 pt-12 border-t-2 border-white flex flex-col gap-8">
                    <div className="flex flex-col gap-4">
                      <h3 className="text-xl font-black tracking-tighter uppercase text-white">Resolution Controls</h3>
                      <div className="h-1 w-8 bg-white" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleResolve(1)}
                        disabled={txStep === 'resolving'}
                        className="py-4 border border-white text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all disabled:opacity-50"
                      >
                        {txStep === 'resolving' ? '...' : 'Resolve YES'}
                      </button>
                      <button 
                        onClick={() => handleResolve(2)}
                        disabled={txStep === 'resolving'}
                        className="py-4 border border-white text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all disabled:opacity-50"
                      >
                        {txStep === 'resolving' ? '...' : 'Resolve NO'}
                      </button>
                    </div>
                    <p className="text-[9px] font-mono text-[#555555] uppercase tracking-tight leading-relaxed">
                      {isCreator && !isOwner ? "YOU ARE THE CREATOR OF THIS MARKET. RESOLUTION IS PERMANENT." : "ADMINISTRATOR OVERRIDE ACTIVE. ENSURE OUTCOME ACCURACY."}
                    </p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
