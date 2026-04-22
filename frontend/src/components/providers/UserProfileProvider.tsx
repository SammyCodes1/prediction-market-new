'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface UserProfile {
  address: string;
  username: string | null;
  profile_picture: string | null;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (username: string, profile_picture: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  showPrompt: boolean;
  closePrompt: () => void;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) throw new Error('useUserProfile must be used within UserProfileProvider');
  return context;
};

const API_URL = 'http://127.0.0.1:3001';

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const fetchProfile = async (addr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${addr}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (!data.username) {
          setShowPrompt(true);
        }
      } else if (res.status === 404) {
        setProfile(null);
        setShowPrompt(true);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchProfile(address);
    } else {
      setProfile(null);
      setShowPrompt(false);
    }
  }, [isConnected, address]);

  const updateProfile = async (username: string, profile_picture: string) => {
    if (!address) return;
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, username, profile_picture })
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setShowPrompt(false);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const deleteAccount = async () => {
    if (!address) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${address}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProfile(null);
        setShowPrompt(false);
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  return (
    <UserProfileContext.Provider value={{ 
      profile, 
      loading, 
      updateProfile, 
      deleteAccount, 
      showPrompt, 
      closePrompt: () => setShowPrompt(false) 
    }}>
      {children}
      {showPrompt && isConnected && (
        <UsernamePrompt 
          onSave={updateProfile} 
          onClose={() => setShowPrompt(false)} 
        />
      )}
    </UserProfileContext.Provider>
  );
};

const UsernamePrompt = ({ onSave, onClose }: { onSave: (u: string, p: string) => void, onClose: () => void }) => {
  const [username, setUsername] = useState('');
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-6">
      <div className="bg-black border border-white p-12 max-w-md w-full flex flex-col gap-8 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black tracking-tighter uppercase">Identity Required</h2>
          <div className="h-1 w-12 bg-white" />
        </div>
        
        <p className="text-[#555555] font-mono text-xs uppercase leading-relaxed tracking-tight">
          System detected an anonymous connection. Set your network identity to continue.
        </p>

        <div className="flex flex-col gap-4">
          <label className="text-[10px] font-bold text-[#333333] tracking-widest uppercase">USERNAME_ALIAS</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ENTER_ALIAS..."
            className="w-full bg-black border border-[#1a1a1a] p-4 font-mono text-white outline-none focus:border-white transition-all uppercase"
          />
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => onSave(username, `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || Math.random()}`)}
            className="w-full bg-white text-black py-6 font-black uppercase tracking-tighter hover:bg-[#888888] transition-all"
          >
            CONFIRM_IDENTITY
          </button>
          <button 
            onClick={onClose}
            className="w-full text-[#333333] text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all"
          >
            REMAIN_ANONYMOUS
          </button>
        </div>
      </div>
    </div>
  );
};
