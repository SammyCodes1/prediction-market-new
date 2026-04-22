import { useState, useEffect } from 'react';
import { useSocket } from '@/components/providers/SocketProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

async function safeFetchJson(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.error(`Failed to fetch or parse JSON from ${url}:`, e);
    return null;
  }
}

export function useActivity(side?: string, marketId?: string) {
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  async function fetchActivity() {
    try {
      const url = new URL(`${API_URL}/api/activity`);
      if (side && side !== 'ALL') url.searchParams.append('side', side);
      if (marketId) url.searchParams.append('marketId', marketId);
      
      const data = await safeFetchJson(url.toString());
      setActivity(data || []);
    } catch (err) {
      console.error('Failed to fetch activity', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActivity();
    
    if (!socket) return;

    const handleUpdate = () => {
      fetchActivity();
    };

    socket.on('trade', handleUpdate);

    return () => {
      socket.off('trade', handleUpdate);
    };
  }, [side, marketId, socket]);

  return { activity, loading };
}

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const data = await safeFetchJson(`${API_URL}/api/leaderboard`);
        setLeaderboard(data || []);
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  return { leaderboard, loading };
}

export function useStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  async function fetchStats() {
    try {
      const data = await safeFetchJson(`${API_URL}/api/stats`);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
    
    if (!socket) return;

    socket.on('trade', fetchStats);
    socket.on('market_created', fetchStats);
    socket.on('market_resolved', fetchStats);

    return () => {
      socket.off('trade', fetchStats);
      socket.off('market_created', fetchStats);
      socket.off('market_resolved', fetchStats);
    };
  }, [socket]);

  return { stats, loading };
}
