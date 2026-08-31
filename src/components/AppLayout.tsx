import React from 'react';
import { GlassSidebar } from './GlassSidebar';
import { GlassHeader } from './GlassHeader';
import { NavTab, AmbientTheme, GlassSettings } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  ambientTheme: AmbientTheme;
  onCycleTheme: () => void;
  networkSpeed: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCount: number;
  completedCount: number;
  settings: GlassSettings;
}

export const AppLayout = ({
  children,
  activeTab,
  onSelectTab,
  ambientTheme,
  onCycleTheme,
  networkSpeed,
  searchQuery,
  onSearchChange,
  activeCount,
  completedCount,
  settings,
}: AppLayoutProps) => {
  // Theme ambient gradient styles for optical refraction
  const getThemeBlobs = () => {
    switch (ambientTheme) {
      case 'aurora':
        return {
          blob1: 'bg-cyan-500/15 from-cyan-400 to-blue-600',
          blob2: 'bg-purple-600/20 from-purple-500 to-pink-600',
          blob3: 'bg-emerald-400/10',
        };
      case 'deep-ocean':
        return {
          blob1: 'bg-blue-600/20 from-blue-700 to-cyan-500',
          blob2: 'bg-indigo-700/25 from-indigo-800 to-teal-500',
          blob3: 'bg-sky-400/10',
        };
      case 'sunset':
        return {
          blob1: 'bg-orange-500/18 from-amber-500 to-red-600',
          blob2: 'bg-rose-600/20 from-rose-700 to-purple-600',
          blob3: 'bg-yellow-400/10',
        };
      case 'vision-glow':
        return {
          blob1: 'bg-emerald-500/18 from-teal-400 to-emerald-600',
          blob2: 'bg-cyan-600/20 from-cyan-500 to-lime-500',
          blob3: 'bg-green-400/10',
        };
      case 'monochrome':
      default:
        return {
          blob1: 'bg-white/10 from-white/15 to-white/5',
          blob2: 'bg-white/8 from-white/10 to-transparent',
          blob3: 'bg-white/5',
        };
    }
  };

  const blobs = getThemeBlobs();

  return (
    <div className="relative h-screen w-screen bg-[#0a0a0a] text-[#f5f5f7] overflow-hidden font-sans antialiased select-none">
      {/* Background Grid Pattern for Glass Refraction */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      {/* Ambient Background Lighting Blobs with liquid animation */}
      <div
        className={cn(
          "absolute top-[-15%] left-[-10%] w-[55%] h-[55%] blur-[130px] rounded-full pointer-events-none transition-all duration-1000",
          blobs.blob1,
          settings.ambientMovement && "animate-float-slow"
        )}
      />
      <div
        className={cn(
          "absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] blur-[160px] rounded-full pointer-events-none transition-all duration-1000",
          blobs.blob2,
          settings.ambientMovement && "animate-float-reverse"
        )}
      />
      <div
        className={cn(
          "absolute top-[40%] left-[30%] w-[35%] h-[35%] blur-[140px] rounded-full pointer-events-none transition-all duration-1000 opacity-60",
          blobs.blob3
        )}
      />

      {/* Top Edge Ambient Light Bar */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-50" />

      {/* Main Glass Viewport Layout */}
      <div className="relative z-10 flex h-full p-3 sm:p-5 lg:p-6 gap-4 lg:gap-6">
        {/* Floating Sidebar */}
        <GlassSidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          activeCount={activeCount}
          completedCount={completedCount}
        />

        {/* Content Viewport */}
        <div className="flex-1 flex flex-col gap-4 lg:gap-6 min-w-0 h-full">
          <GlassHeader
            activeTab={activeTab}
            ambientTheme={ambientTheme}
            onCycleTheme={onCycleTheme}
            networkSpeed={networkSpeed}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSelectTab={onSelectTab}
            activeCount={activeCount}
          />
          <main className="flex-1 overflow-y-auto custom-scrollbar rounded-[28px] focus:outline-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
