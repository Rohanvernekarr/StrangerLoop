'use client';

import { useState, useEffect } from 'react';

interface LiveStats {
  totalConnected: number;
  usersInQueue: number;
  activeChats: number;
  totalActiveUsers: number;
  timestamp?: string;
}

export const useLiveStats = () => {
  const [stats, setStats] = useState<LiveStats>({
    totalConnected: 0,
    usersInQueue: 0,
    activeChats: 0,
    totalActiveUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch stats from API
  const fetchStats = async () => {
    try {
      const response = await fetch('https://strangerloop-1.onrender.com/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats on component mount and then every 10 seconds
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return { stats, loading, error, refetch: fetchStats };
};

export default useLiveStats;