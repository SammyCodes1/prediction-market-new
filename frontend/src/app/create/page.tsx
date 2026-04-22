'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GlassButton } from '@/components/ui/GlassButton';
import { CONTRACT_ADDRESS, arcTestnet } from '@/lib/web3';
import abiData from '@/lib/abi.json';
import { 
  useAccount, 
  useWriteContract, 
  useWaitForTransactionReceipt, 
  useConnect, 
  useSwitchChain 
} from 'wagmi';
import { 
  PlusCircle, 
  Calendar, 
  FileText, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Shield,
  Layers,
  Loader2
} from 'lucide-react';
import { useMarkets } from '@/lib/hooks/useMarkets';

export default function CreateMarketPage() {
  const router = useRouter();
  const { isConnected, chain, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const { markets, loading: marketsLoading } = useMarkets();
  
  const myMarkets = markets.filter(m => 
    address && m.creator?.name && (
      m.creator.name === `${address.slice(0, 6)}...${address.slice(-4)}`
    )
  );
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    question: '',
    description: '',
    resolutionMethod: '',
    closesAt: ''
  });

  const [txStep, setTxStep] = useState<'idle' | 'signing' | 'confirming' | 'complete'>('idle');
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      setTxStep('complete');
    } else if (isConfirming) {
      setTxStep('confirming');
    }
  }, [isConfirming, isConfirmed]);

  const isWrongNetwork = isConnected && chain?.id !== arcTestnet.id;

  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  const handleSwitchNetwork = () => {
    switchChain({ chainId: arcTestnet.id });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || isWrongNetwork) return;

    setError(null);
    try {
      const closesAtTimestamp = Math.floor(new Date(formData.closesAt).getTime() / 1000);
      
      if (closesAtTimestamp <= Math.floor(Date.now() / 1000)) {
        setError("Close date must be in the future.");
        return;
      }

      setTxStep('signing');
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'createMarket',
        args: [
          formData.question,
          formData.description,
          formData.resolutionMethod,
          BigInt(closesAtTimestamp)
        ],
      });
    } catch (err: unknown) {
      console.error("Create Market Error:", err);
      const errorMsg = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMsg);
      setTxStep('idle');
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black terminal-grid">
      <div className="max-w-[1000px] mx-auto px-6 py-24 pb-48">
        
        {/* HEADER */}
        <div className="flex flex-col gap-6 mb-16 border-b border-[#1a1a1a] pb-12">
          <div className="flex items-center gap-4 text-[#555555]">
            <PlusCircle size={20} />
            <span className="text-[10px] font-bold tracking-[0.4em] uppercase">SYSTEM_INITIALIZATION</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
            New Market <br /> Deployment
          </h1>
          <p className="text-[#555555] font-mono text-xs tracking-widest uppercase max-w-xl">
            Configure parameters for a new peer-to-peer prediction contract. Deployment is permissionless and permanent.
          </p>
        </div>

        {txStep === 'complete' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-white p-12 bg-[#050505] flex flex-col items-center text-center gap-10"
          >
            <div className="w-20 h-20 border-2 border-white flex items-center justify-center">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-4xl font-black tracking-tighter uppercase">Deployment Successful</h2>
              <p className="text-[#555555] font-mono text-sm tracking-widest uppercase">
                Contract ID: {hash?.slice(0, 24)}...
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-6 w-full max-w-md">
              <GlassButton variant="primary" className="flex-1" onClick={() => router.push('/markets')}>
                GO TO TERMINAL
              </GlassButton>
              <GlassButton variant="outline" className="flex-1" onClick={() => {
                setTxStep('idle');
                setFormData({ question: '', description: '', resolutionMethod: '', closesAt: '' });
              }}>
                DEPLOY ANOTHER
              </GlassButton>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* LEFT COLUMN: BASIC INFO */}
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-6 p-8 border border-[#1a1a1a] bg-[#050505]">
                <div className="flex items-center gap-3 text-white">
                  <HelpCircle size={16} />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Market Question</span>
                </div>
                <input 
                  required
                  type="text" 
                  placeholder="e.g., Will BTC exceed $150k by June?"
                  value={formData.question}
                  onChange={(e) => setFormData({...formData, question: e.target.value})}
                  className="w-full bg-black border border-[#1a1a1a] p-5 text-sm font-mono focus:border-white outline-none transition-all placeholder:text-[#222222]"
                />
              </div>

              <div className="flex flex-col gap-6 p-8 border border-[#1a1a1a] bg-[#050505]">
                <div className="flex items-center gap-3 text-white">
                  <FileText size={16} />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Detailed Description</span>
                </div>
                <textarea 
                  required
                  rows={5}
                  placeholder="Define specific terms and conditions for resolution..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-black border border-[#1a1a1a] p-5 text-sm font-mono focus:border-white outline-none transition-all placeholder:text-[#222222] resize-none"
                />
              </div>
            </div>

            {/* RIGHT COLUMN: REGLUATION & TIME */}
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-6 p-8 border border-[#1a1a1a] bg-[#050505]">
                <div className="flex items-center gap-3 text-white">
                  <Shield size={16} />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Resolution Source</span>
                </div>
                <input 
                  required
                  type="text" 
                  placeholder="e.g., CoinMarketCap official closing price"
                  value={formData.resolutionMethod}
                  onChange={(e) => setFormData({...formData, resolutionMethod: e.target.value})}
                  className="w-full bg-black border border-[#1a1a1a] p-5 text-sm font-mono focus:border-white outline-none transition-all placeholder:text-[#222222]"
                />
              </div>

              <div className="flex flex-col gap-6 p-8 border border-[#1a1a1a] bg-[#050505]">
                <div className="flex items-center gap-3 text-white">
                  <Calendar size={16} />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Resolution Deadline</span>
                </div>
                <input 
                  required
                  type="datetime-local" 
                  value={formData.closesAt}
                  onChange={(e) => setFormData({...formData, closesAt: e.target.value})}
                  className="w-full bg-black border border-[#1a1a1a] p-5 text-sm font-mono focus:border-white outline-none transition-all text-[#555555] focus:text-white"
                />
              </div>

              {/* ACTION BAR */}
              <div className="mt-4">
                {error && (
                  <div className="mb-8 p-4 border border-red-900 bg-red-900/10 text-red-500 text-[10px] font-mono flex items-start gap-3">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span className="uppercase">{error}</span>
                  </div>
                )}

                {!isConnected ? (
                  <GlassButton size="lg" className="w-full h-20 text-lg border-2" onClick={handleConnect}>
                    CONNECT WALLET
                  </GlassButton>
                ) : isWrongNetwork ? (
                  <GlassButton variant="primary" size="lg" className="w-full h-20 text-lg bg-red-600 hover:bg-red-700 text-white" onClick={handleSwitchNetwork}>
                    SWITCH TO ARC TESTNET
                  </GlassButton>
                ) : (
                  <GlassButton 
                    type="submit"
                    variant="primary" 
                    size="lg" 
                    className="w-full h-20 text-lg group"
                    loading={txStep === 'signing' || txStep === 'confirming'}
                  >
                    {txStep === 'signing' ? 'AWAITING SIGNATURE...' : 
                     txStep === 'confirming' ? 'CONFIRMING ON-CHAIN...' : 
                     'EXECUTE DEPLOYMENT'}
                    <ArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" />
                  </GlassButton>
                )}
                
                <p className="mt-6 text-[9px] font-mono text-[#333333] text-center leading-relaxed tracking-tight uppercase">
                  Contract deployment requires a small gas fee in USDC. <br />
                  Resolution is manually processed by the contract administrator.
                </p>
              </div>
            </div>

          </form>
        )}

        {/* MY MARKETS SECTION */}
        {mounted && isConnected && (
          <div className="mt-32 pt-20 border-t border-[#1a1a1a]">
            <div className="flex items-center justify-between mb-16">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-white">
                  <Layers size={18} />
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white">Deployed_Assets</span>
                </div>
                <h2 className="text-3xl font-black tracking-tighter uppercase">My Deployed Markets</h2>
              </div>
              <div className="flex items-center gap-3 bg-[#050505] border border-[#1a1a1a] px-4 py-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-mono text-[#555555] uppercase">Database_Linked</span>
              </div>
            </div>

            {marketsLoading ? (
              <div className="p-20 border border-[#1a1a1a] bg-[#050505] flex flex-col items-center gap-6">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <span className="text-[10px] font-mono text-[#333333] uppercase tracking-widest">Scanning Blockchain...</span>
              </div>
            ) : myMarkets.length === 0 ? (
              <div className="p-20 border border-[#1a1a1a] bg-[#050505] text-center">
                <span className="text-[10px] font-mono text-[#333333] uppercase tracking-widest">No deployed markets found for this terminal.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {myMarkets.map((market) => (
                  <div 
                    key={market.id}
                    onClick={() => router.push(`/markets/${market.id}`)}
                    className="group border border-[#1a1a1a] bg-[#050505] p-8 flex flex-col md:flex-row items-center justify-between gap-8 hover:border-white transition-all cursor-pointer"
                  >
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] font-bold px-2 py-0.5 border border-[#1a1a1a] text-[#555555] group-hover:text-white group-hover:border-white transition-all uppercase">
                          {market.category}
                        </span>
                        <span className="text-[9px] font-mono text-[#333333]">ID:{market.id.padStart(4, '0')}</span>
                      </div>
                      <h3 className="text-xl font-bold tracking-tight uppercase group-hover:text-white transition-all">
                        {market.question}
                      </h3>
                    </div>

                    <div className="flex items-center gap-12 shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-bold text-[#333333] uppercase">Status</span>
                        <span className={`text-[10px] font-mono ${market.state === 0 ? 'text-green-500' : 'text-blue-500'} uppercase`}>
                          {market.state === 0 ? 'Active_Trading' : 'Settled_Final'}
                        </span>
                      </div>
                      
                      <div className="w-12 h-12 border border-[#1a1a1a] flex items-center justify-center group-hover:border-white transition-all">
                        <ArrowRight size={16} className="text-[#333333] group-hover:text-white transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
