import React from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { NavTab } from '../types';
import { cn } from '../lib/utils';
import {
  LayoutDashboard,
  DownloadCloud,
  History,
  Settings,
  Info,
  Zap,
  HardDrive,
  Activity,
  Sparkles,
} from 'lucide-react';

interface GlassSidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeCount?: number;
  completedCount?: number;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}

const NavItem = ({ icon: Icon, label, active, count, onClick }: NavItemProps) => (
  <motion.div
    whileHover={{ x: 3 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    onClick={onClick}
    className={cn(
      "flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 select-none group",
      active
        ? "bg-white/15 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] border border-white/10"
        : "text-white/50 hover:text-white/90 hover:bg-white/5"
    )}
  >
    <div className="flex items-center gap-3">
      <Icon
        size={18}
        strokeWidth={active ? 2 : 1.7}
        className={cn(
          "transition-colors",
          active ? "text-cyan-300" : "text-white/60 group-hover:text-white"
        )}
      />
      <span className="text-sm font-medium tracking-tight">{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span
        className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
          active
            ? "bg-white/20 text-white"
            : "bg-white/5 text-white/40 group-hover:text-white/70"
        )}
      >
        {count}
      </span>
    )}
  </motion.div>
);

export const GlassSidebar = ({
  activeTab,
  onSelectTab,
  activeCount = 0,
  completedCount = 0,
}: GlassSidebarProps) => {
  return (
    <GlassCard
      className="w-64 h-full flex flex-col p-4 shrink-0 hidden md:flex backdrop-blur-3xl"
      hover={false}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-4 mb-2 border-b border-white/5">
        <motion.div
          whileHover={{ rotate: 15, scale: 1.05 }}
          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          <Zap size={20} className="text-black" fill="black" />
        </motion.div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">
              Logos
            </h1>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-cyan-300 border border-cyan-400/20">
              PRO
            </span>
          </div>
          <p className="text-[10px] text-white/40 tracking-wider uppercase font-medium mt-1">
            Liquid Optics • VisionOS
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1.5 py-2">
        <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-3 mb-2">
          Workspace
        </div>
        <NavItem
          icon={LayoutDashboard}
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => onSelectTab('dashboard')}
        />
        <NavItem
          icon={DownloadCloud}
          label="Downloads"
          active={activeTab === 'downloads'}
          count={activeCount}
          onClick={() => onSelectTab('downloads')}
        />
        <NavItem
          icon={History}
          label="History"
          active={activeTab === 'history'}
          count={completedCount}
          onClick={() => onSelectTab('history')}
        />
      </nav>

      {/* System Resource Slab */}
      <div className="my-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1.5 text-white/60">
            <HardDrive size={13} className="text-cyan-300" />
            <span className="font-medium text-[11px]">Storage</span>
          </div>
          <span className="text-[11px] text-white/80 font-mono">1.2 TB free</span>
        </div>
        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full w-[42%]" />
        </div>
        <div className="flex justify-between items-center mt-2 text-[10px] text-white/40">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            Engine Active
          </span>
          <span className="font-mono text-cyan-300/80">60 FPS</span>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="pt-3 border-t border-white/5 space-y-1">
        <NavItem
          icon={Settings}
          label="Settings"
          active={activeTab === 'settings'}
          onClick={() => onSelectTab('settings')}
        />
        <NavItem
          icon={Info}
          label="Optics Guide"
          active={activeTab === 'about'}
          onClick={() => onSelectTab('about')}
        />
      </div>
    </GlassCard>
  );
};
