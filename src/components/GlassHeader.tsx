import React from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { NavTab, AmbientTheme } from '../types';
import {
  Sparkles,
  Layers,
  Activity,
  SlidersHorizontal,
  Search,
  Wifi,
  Moon,
} from 'lucide-react';

interface GlassHeaderProps {
  activeTab: NavTab;
  ambientTheme: AmbientTheme;
  onCycleTheme: () => void;
  onOpenQuickModal?: () => void;
  networkSpeed?: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onSelectTab?: (tab: NavTab) => void;
  activeCount?: number;
}

export const GlassHeader = ({
  activeTab,
  ambientTheme,
  onCycleTheme,
  networkSpeed = '124.5 Mbps',
  searchQuery = '',
  onSearchChange,
  onSelectTab,
  activeCount = 0,
}: GlassHeaderProps) => {
  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Studio Overview',
      subtitle: 'Liquid glass optical workspace & media engine',
    },
    downloads: {
      title: 'Active Streams',
      subtitle: 'Multi-threaded segmented downloads',
    },
    history: {
      title: 'Library Archive',
      subtitle: 'Completed media & crystal vault',
    },
    settings: {
      title: 'Optics & Physics',
      subtitle: 'Configure blur, refraction, luminance & theme',
    },
    about: {
      title: 'Liquid Glass Spec',
      subtitle: 'Native macOS & VisionOS rendering breakdown',
    },
  };

  const themeLabels: Record<AmbientTheme, { name: string; color: string }> = {
    monochrome: { name: 'Titanium Graphite', color: 'bg-white/20' },
    aurora: { name: 'VisionOS Aurora', color: 'bg-gradient-to-r from-cyan-400 to-purple-500' },
    'deep-ocean': { name: 'Deep Ocean', color: 'bg-gradient-to-r from-blue-500 to-cyan-400' },
    sunset: { name: 'Solar Dusk', color: 'bg-gradient-to-r from-orange-400 to-rose-500' },
    'vision-glow': { name: 'Quantum Emerald', color: 'bg-gradient-to-r from-emerald-400 to-teal-400' },
  };

  return (
    <GlassCard className="p-3.5 md:px-6 md:py-3.5 backdrop-blur-3xl shrink-0" hover={false}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: macOS traffic lights and title */}
        <div className="flex items-center gap-4">
          {/* Traffic light dots */}
          <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-white/10">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/40 shadow-xs inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/40 shadow-xs inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/40 shadow-xs inline-block" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-semibold text-white tracking-tight">
                {titles[activeTab].title}
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/5 capitalize hidden sm:inline-flex">
                macOS 15 • Liquid
              </span>
            </div>
            <p className="text-xs text-white/40 hidden md:block">
              {titles[activeTab].subtitle}
            </p>
          </div>
        </div>

        {/* Mobile Navigation Pills */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {(['dashboard', 'downloads', 'history', 'settings', 'about'] as NavTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onSelectTab?.(tab)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'downloads' && activeCount > 0 && ` (${activeCount})`}
            </button>
          ))}
        </div>

        {/* Right: Quick actions, Search, Theme toggle */}
        <div className="flex items-center gap-2.5 justify-end">
          {/* Quick search input */}
          <div className="relative hidden lg:flex items-center">
            <Search
              size={14}
              className="absolute left-3 text-white/40 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search downloads..."
              className="w-48 bg-white/5 hover:bg-white/10 focus:bg-white/10 focus:w-64 transition-all duration-300 text-xs text-white placeholder:text-white/30 rounded-full pl-8 pr-3 py-1.5 border border-white/10 outline-none backdrop-blur-md"
            />
          </div>

          {/* Network throughput badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 backdrop-blur-md">
            <Wifi size={13} className="text-cyan-400" />
            <span className="font-mono text-[11px]">{networkSpeed}</span>
          </div>

          {/* Ambient Lighting Theme Cycler */}
          <GlassButton
            onClick={onCycleTheme}
            size="sm"
            variant="default"
            className="flex items-center gap-1.5 text-xs font-normal"
            title={`Current Lighting: ${themeLabels[ambientTheme].name}`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${themeLabels[ambientTheme].color}`}
            />
            <span className="hidden xl:inline text-xs text-white/80">
              {themeLabels[ambientTheme].name}
            </span>
            <Sparkles size={13} className="text-amber-300" />
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
};
