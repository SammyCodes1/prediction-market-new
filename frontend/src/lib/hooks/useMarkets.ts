import { useState, useEffect } from 'react';
import { Market } from '@/lib/types';
import { useReadContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESS } from '@/lib/web3';
import abiData from '@/lib/abi.json';
import { useSocket } from '@/components/providers/SocketProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

async function safeFetchJson(url: string) {
  try {
    const response = await fetch(url);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.error(`Failed to fetch or parse JSON from ${url}:`, e);
    return null;
  }
}

export function useMarkets(category?: string, search?: string) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  async function fetchMarkets() {
    try {
      const url = new URL(`${API_URL}/api/markets`);
      if (category && category !== 'All') url.searchParams.append('category', category);
      if (search) url.searchParams.append('search', search);
      
      const data = await safeFetchJson(url.toString());
      if (data) setMarkets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMarkets();
    
    if (!socket) return;

    const handleMarketUpdate = () => {
      fetchMarkets(); // Simple re-fetch for now when any market changes
    };

    socket.on('market_created', handleMarketUpdate);
    socket.on('market_resolved', handleMarketUpdate);
    socket.on('trade', handleMarketUpdate);

    return () => {
      socket.off('market_created', handleMarketUpdate);
      socket.off('market_resolved', handleMarketUpdate);
      socket.off('trade', handleMarketUpdate);
    };
  }, [category, search, socket]);

  return { markets, loading, error };
}

export function useMarket(id: string) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  async function fetchMarket() {
    if (!id) return;
    try {
      const data = await safeFetchJson(`${API_URL}/api/markets/${id}`);
      if (data) setMarket(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMarket();
    
    if (!socket || !id) return;

    const handleUpdate = (data: any) => {
      if (data.marketId === id || data.id === id) {
        fetchMarket();
      }
    };

    socket.on('market_resolved', handleUpdate);
    socket.on('trade', handleUpdate);

    return () => {
      socket.off('market_resolved', handleUpdate);
      socket.off('trade', handleUpdate);
    };
  }, [id, socket]);

  return { market, loading, error };
}

export function usePortfolio() {
  const { address } = useAccount();
  const [tradedMarkets, setTradedMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  async function fetchTradedMarkets() {
    if (!address) return;
    try {
      const data = await safeFetchJson(`${API_URL}/api/portfolio/${address}`);
      setTradedMarkets(data || []);
    } catch (err) {
      console.error('Failed to fetch portfolio', err);
      setTradedMarkets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTradedMarkets();
    
    if (!socket || !address) return;

    const handleUpdate = () => {
      fetchTradedMarkets();
    };

    socket.on('trade', (data: any) => {
      if (data.trader.toLowerCase() === address.toLowerCase()) {
        handleUpdate();
      }
    });
    socket.on('market_resolved', handleUpdate);

    return () => {
      socket.off('trade');
      socket.off('market_resolved', handleUpdate);
    };
  }, [address, socket]);

  return { tradedMarkets, loading };
}
