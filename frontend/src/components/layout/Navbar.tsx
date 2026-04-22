'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BarChart3, LayoutDashboard, History, Trophy, Wallet, LogOut, PlusSquare, User } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useUserProfile } from '@/components/providers/UserProfileProvider';

export const Navbar = () => {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { profile } = useUserProfile();
  
  // Fix hydration mismatch by only rendering connection status after mounting
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const navItems = [
    { label: 'MARKETS', href: '/markets', icon: BarChart3 },
    { label: 'CREATE MARKET', href: '/create', icon: PlusSquare },
    { label: 'PORTFOLIO', href: '/portfolio', icon: LayoutDashboard },
    { label: 'ACTIVITY', href: '/activity', icon: History },
    { label: 'LEADERBOARD', href: '/leaderboard', icon: Trophy },
  ];

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      if (connectors.length > 0) {
        connect({ connector: connectors[0] });
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-[#1a1a1a]">
      <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter text-white">FORESIGHT</span>
            <div className="w-2 h-2 bg-white" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-[11px] font-bold tracking-[0.2em] transition-colors hover:text-white flex items-center gap-2",
                  pathname === item.href ? "text-white" : "text-[#555555]"
                )}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[10px] font-bold text-[#333333] tracking-widest uppercase">STN_STATUS</span>
            <span className="text-[10px] font-mono text-[#555555] animate-pulse uppercase">ARC_TESTNET_ONLINE</span>
          </div>
          
          <div className="h-8 w-[1px] bg-[#1a1a1a] hidden lg:block" />

          {mounted && isConnected && (
            <Link 
              href="/profile"
              className={cn(
                "flex items-center gap-3 px-3 py-1 border border-[#1a1a1a] hover:border-white transition-all group",
                pathname === '/profile' ? "border-white" : ""
              )}
            >
              <div className="w-6 h-6 border border-[#2a2a2a] bg-black flex items-center justify-center overflow-hidden">
                <img 
                  src={profile?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                {profile?.username || 'ANONYMOUS_ENTITY'}
              </span>
            </Link>
          )}

          <button 
            onClick={handleConnect}
            className="flex items-center gap-3 px-4 py-2 bg-transparent border border-[#2a2a2a] hover:border-white transition-all group"
          >
            {mounted && isConnected ? (
              <>
                <LogOut size={14} className="text-[#555555] group-hover:text-white" />
                <span className="text-[11px] font-bold tracking-widest text-[#555555] group-hover:text-white">
                  EXIT
                </span>
              </>
            ) : (
              <>
                <Wallet size={14} className="text-[#555555] group-hover:text-white" />
                <span className="text-[11px] font-bold tracking-widest text-white">
                  CONNECT
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};
