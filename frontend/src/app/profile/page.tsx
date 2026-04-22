'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { useAccount } from 'wagmi';
import { User, Camera, Trash2, Shield, AlertTriangle, CheckCircle2, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { profile, updateProfile, deleteAccount, loading } = useUserProfile();
  
  const [username, setUsername] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      // Extract seed if it was from dicebear
      if (profile.profile_picture?.includes('seed=')) {
        const seed = profile.profile_picture.split('seed=')[1];
        setAvatarSeed(seed);
      }
    }
  }, [profile]);

  const handleSave = async () => {
    if (!username) return;
    setIsUpdating(true);
    setSaveSuccess(false);
    
    const avatarUrl = avatarSeed 
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`
      : profile?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
      
    await updateProfile(username, avatarUrl);
    setIsUpdating(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDelete = async () => {
    await deleteAccount();
    setShowDeleteConfirm(false);
    window.location.href = '/';
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center flex flex-col items-center gap-8">
           <Shield size={64} className="text-[#333333]" />
           <h2 className="text-4xl font-black tracking-tighter uppercase">Authentication Required</h2>
           <p className="text-[#555555] font-mono text-xs uppercase tracking-widest">Please connect your wallet to access profile controls</p>
        </div>
      </div>
    );
  }

  if (loading) {
     return (
       <div className="min-h-screen bg-black flex items-center justify-center">
         <Loader2 className="w-12 h-12 text-white animate-spin" />
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-black terminal-grid">
      <div className="max-w-[1000px] mx-auto px-6 py-20">
        
        {/* HEADER */}
        <div className="flex flex-col gap-6 mb-20 border-b border-[#1a1a1a] pb-12">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold px-3 py-1 bg-white text-black tracking-[0.2em]">IDENTITY_MANAGER</span>
            <div className="w-2 h-2 bg-white animate-pulse" />
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase">Profile</h1>
          <p className="text-[#555555] font-mono text-sm tracking-widest uppercase">Configure your network persona and system presence</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
          
          {/* LEFT: AVATAR & DELETE */}
          <div className="md:col-span-4 flex flex-col gap-12">
            <div className="flex flex-col gap-8 items-center p-12 border border-[#1a1a1a] bg-[#050505]">
              <div className="relative group">
                <div className="w-40 h-40 border-2 border-white flex items-center justify-center bg-black overflow-hidden">
                  <img 
                    src={avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}` : (profile?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`)} 
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button 
                  onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  <RefreshCw className="text-white" size={32} />
                </button>
              </div>
              
              <div className="text-center">
                <span className="text-[9px] font-bold text-[#333333] tracking-widest uppercase block mb-2">SYSTEM_AVATAR</span>
                <button 
                  onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                  className="text-[10px] font-mono text-white hover:underline uppercase tracking-widest"
                >
                  REGENERATE_SEED
                </button>
              </div>
            </div>

            <div className="p-8 border border-red-900/30 bg-red-900/5 flex flex-col gap-6">
               <div className="flex items-center gap-3 text-red-500">
                  <AlertTriangle size={16} />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase">DANGER_ZONE</span>
               </div>
               <p className="text-[10px] font-mono text-[#555555] leading-relaxed uppercase">
                 Deleting your account will remove your username and profile picture association. 
                 On-chain data remains immutable.
               </p>
               <button 
                 onClick={() => setShowDeleteConfirm(true)}
                 className="flex items-center justify-center gap-3 py-4 border border-red-900 text-red-500 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-red-900 hover:text-white transition-all"
               >
                 <Trash2 size={14} />
                 PURGE_ACCOUNT
               </button>
            </div>
          </div>

          {/* RIGHT: SETTINGS */}
          <div className="md:col-span-8 flex flex-col gap-12">
             <div className="p-12 border border-[#1a1a1a] bg-[#050505] flex flex-col gap-10">
                <div className="flex flex-col gap-8">
                   <div className="flex flex-col gap-4">
                      <label className="text-[10px] font-bold text-[#333333] tracking-widest uppercase px-1">NETWORK_ALIAS</label>
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="ENTER_ALIAS..."
                        className="w-full bg-black border border-[#1a1a1a] p-6 text-2xl font-mono font-bold outline-none focus:border-white transition-all text-white"
                      />
                   </div>

                   <div className="flex flex-col gap-4">
                      <label className="text-[10px] font-bold text-[#333333] tracking-widest uppercase px-1">CONNECTED_ADDRESS</label>
                      <div className="w-full bg-black/40 border border-[#1a1a1a] p-6 font-mono text-[#555555] text-sm break-all">
                        {address}
                      </div>
                   </div>
                </div>

                <div className="flex flex-col gap-4">
                   <GlassButton 
                     variant="primary" 
                     size="lg" 
                     className="w-full h-20 text-lg"
                     onClick={handleSave}
                     loading={isUpdating}
                     disabled={!username}
                   >
                     SAVE_SYSTEM_CHANGES
                   </GlassButton>
                   
                   {saveSuccess && (
                     <div className="flex items-center justify-center gap-2 text-ios-green font-mono text-xs uppercase animate-pulse">
                        <CheckCircle2 size={14} />
                        PROFILE_SYNCED_SUCCESSFULLY
                     </div>
                   )}
                </div>
             </div>

             <div className="p-12 border border-[#1a1a1a] flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                   <h3 className="text-xl font-black uppercase tracking-tight">Security & Privacy</h3>
                   <div className="h-[1px] w-8 bg-[#333333]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-[#333333] uppercase tracking-widest">ENCRYPTION</span>
                      <span className="text-xs font-mono text-[#555555] uppercase">SSL/TLS_ACTIVE</span>
                   </div>
                   <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-[#333333] uppercase tracking-widest">DATA_RETENTION</span>
                      <span className="text-xs font-mono text-[#555555] uppercase">OFFCHAIN_METADATA_ONLY</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-6">
             <div className="bg-black border-2 border-red-600 p-12 max-w-md w-full flex flex-col gap-8 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-black tracking-tighter uppercase text-red-600">Irreversible Action</h2>
                  <div className="h-1 w-12 bg-red-600" />
                </div>
                
                <p className="text-red-500/80 font-mono text-xs uppercase leading-relaxed tracking-tight font-bold">
                  You are about to purge your identity from the foresight system. This action cannot be undone.
                </p>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={handleDelete}
                    className="w-full bg-red-600 text-white py-6 font-black uppercase tracking-tighter hover:bg-red-700 transition-all"
                  >
                    CONFIRM_PURGE
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full text-[#555555] text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all"
                  >
                    ABORT_OPERATION
                  </button>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

