'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, ArrowRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import { usePortfolio } from '@/lib/hooks/useMarkets';
import { useRouter } from 'next/navigation';
import { Market } from '@/lib/types';

interface NotificationItem {
  id: string;
  question: string;
  winner: string;
}

export const SettlementNotification = () => {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { tradedMarkets } = usePortfolio();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Check each resolved market for claimable balance
  useEffect(() => {
    if (!isConnected || !address || tradedMarkets.length === 0) return;

    const resolvedUnnotified = tradedMarkets.filter(
      (m: Market) => m.state === 1 && !dismissed.has(m.id) && !notifications.find(n => n.id === m.id)
    );

    if (resolvedUnnotified.length > 0) {
      const newNotifications = resolvedUnnotified.map(m => ({
        id: m.id,
        question: m.question,
        winner: m.resolution === 1 ? 'YES' : 'NO'
      }));

      // Use a functional update to avoid unnecessary re-renders or stale closures
      setNotifications(prev => {
        const uniqueNew = newNotifications.filter(nn => !prev.find(p => p.id === nn.id));
        if (uniqueNew.length === 0) return prev;
        return [...prev, ...uniqueNew];
      });
    }
  }, [tradedMarkets, isConnected, address, dismissed, notifications]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setDismissed(prev => new Set([...prev, id]));
  };

  const handleClaim = (id: string) => {
    router.push(`/markets/${id}`);
    removeNotification(id);
  };

  if (!isConnected || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-10 right-10 z-[100] flex flex-col gap-4 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="pointer-events-auto w-[400px] bg-black border border-white p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(255,255,255,0.1)] relative group"
          >
            <button 
              onClick={() => removeNotification(notif.id)}
              className="absolute top-4 right-4 text-[#333333] hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-4 text-white">
              <div className="w-10 h-10 border border-white flex items-center justify-center animate-pulse">
                <Trophy size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase">Market_Settled</span>
                <span className="text-[9px] font-mono text-[#555555] uppercase">Outcome: {notif.winner}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold uppercase tracking-tight leading-tight">
                {notif.question}
              </h4>
              <p className="text-[10px] font-mono text-[#555555] uppercase tracking-widest">
                Resolution complete. Claiming window is now open.
              </p>
            </div>

            <button 
              onClick={() => handleClaim(notif.id)}
              className="flex items-center justify-between w-full py-4 border border-white px-6 group/btn hover:bg-white hover:text-black transition-all"
            >
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Claim Reward</span>
              <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
