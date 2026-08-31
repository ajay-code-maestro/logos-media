import { motion } from 'motion/react';
import React, { ReactNode } from 'react';
import { GlassCard } from './GlassCard';
import { cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface GlassStatsCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down';
  icon?: ReactNode;
  subtext?: string;
  className?: string;
  id?: string;
}

export const GlassStatsCard = ({
  label,
  value,
  trend,
  trendDirection = 'up',
  icon,
  subtext,
  className,
  id,
}: GlassStatsCardProps) => {
  return (
    <GlassCard id={id} className={cn("p-5 flex flex-col justify-between group", className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold text-white/50 tracking-wider uppercase">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 group-hover:text-white group-hover:bg-white/10 transition-colors">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <div className="text-2xl lg:text-3xl font-semibold tracking-tight text-white font-sans">
          {value}
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center text-xs font-medium px-2 py-0.5 rounded-full border backdrop-blur-md",
              trendDirection === 'up'
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            )}
          >
            {trendDirection === 'up' ? (
              <ArrowUpRight size={12} className="mr-0.5" />
            ) : (
              <ArrowDownRight size={12} className="mr-0.5" />
            )}
            {trend}
          </div>
        )}
      </div>

      {subtext && (
        <div className="mt-2 text-[11px] text-white/40 font-medium truncate">
          {subtext}
        </div>
      )}
    </GlassCard>
  );
};
