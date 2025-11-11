'use client';

import React from 'react';
import useLiveStats from '../hooks/useLiveStats';

interface LiveStatsProps {
  className?: string;
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export default function LiveStats({ 
  className = '', 
  showLabels = true, 
  orientation = 'horizontal' 
}: LiveStatsProps) {
  const { stats, loading, error } = useLiveStats();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center gap-4">
          <div className="h-8 w-12 bg-zinc-700 rounded"></div>
          <div className="h-8 w-12 bg-zinc-700 rounded"></div>
          <div className="h-8 w-12 bg-zinc-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-400 text-sm ${className}`}>
        Failed to load stats
      </div>
    );
  }

  const statsData = [
    {
      label: 'Online',
      value: stats.totalActiveUsers,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10'
    },
  
  ];

  const flexDirection = orientation === 'horizontal' ? 'flex-row' : 'flex-col';
  const divider = orientation === 'horizontal' ? 'h-6 w-px bg-zinc-700' : 'h-px w-6 bg-zinc-700';

  return (
    <div className={`flex items-center gap-4 px-3 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700 ${className}`}>
      {statsData.map((stat, index) => (
        <React.Fragment key={stat.label}>
          <div className="text-center">
            <div className={`text-lg font-bold ${stat.color}`}>
              {stat.value}
            </div>
            {showLabels && (
              <div className="text-xs text-zinc-400">
                {stat.label}
              </div>
            )}
          </div>
          {index < statsData.length - 1 && <div className={divider}></div>}
        </React.Fragment>
      ))}
    </div>
  );
}