import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { GlassStatsCard } from './GlassStatsCard';
import { GlassDownloadCard } from './GlassDownloadCard';
import { DownloadItem, GlassSettings, DownloadOptions } from '../types';
import {
  Link2,
  Sparkles,
  Zap,
  HardDrive,
  Activity,
  ArrowRight,
  Pause,
  Play,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface DashboardViewProps {
  items: DownloadItem[];
  onPauseResume: (id: string) => void;
  onCancel: (id: string) => void;
  onInspect: (item: DownloadItem) => void;
  onPreview: (item: DownloadItem) => void;
  onRetry: (id: string) => void;
  onAnalyzeUrl: (url: string) => void;
  onStartDownload?: (url: string, options: DownloadOptions) => Promise<void>;
  onPauseAll: () => void;
  onResumeAll: () => void;
  networkSpeed: string;
  settings: GlassSettings;
}

export const DashboardView = ({
  items,
  onPauseResume,
  onCancel,
  onInspect,
  onPreview,
  onRetry,
  onAnalyzeUrl,
  onStartDownload,
  onPauseAll,
  onResumeAll,
  networkSpeed,
  settings,
}: DashboardViewProps) => {
  const [urlInput, setUrlInput] = useState('');

  const activeItems = items.filter((i) => i.status === 'active' || i.status === 'paused');
  const completedItems = items.filter((i) => i.status === 'completed');

  const handleAnalyze = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) {
      onAnalyzeUrl('https://apple.com/vision-pro/spatial-cinematic-8k.mp4');
      return;
    }
    onAnalyzeUrl(urlInput.trim());
    setUrlInput('');
  };

  const samplePresets = [
    {
      label: 'YouTube Live / Video Stream',
      url: 'https://www.youtube.com/live/d8PE-I9Fu8w?si=zDyLgZQUmTiG4kPt',
    },
    {
      label: 'Vision Pro 8K Spatial',
      url: 'https://cdn.apple.com/vision-pro/spatial-aurora-8k-hevc.mp4',
    },
    {
      label: 'macOS Sonoma 4K HDR',
      url: 'https://cdn.apple.com/sonoma/aerial-drone-coastal-4k.mp4',
    },
    {
      label: 'Dolby Atmos Spatial Audio',
      url: 'https://cdn.apple.com/audio/binaural-spatial-master.flac',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 lg:space-y-12"
    >
      {/* Search / URL Entry Area */}
      <section className="space-y-5 text-center pt-2 sm:pt-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 backdrop-blur-md">
            <Sparkles size={12} className="text-cyan-300" />
            <span>macOS & VisionOS Liquid Pipeline</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-light text-white tracking-tight">
            What would you like to <span className="font-medium text-white underline decoration-cyan-400/40 underline-offset-8">save</span>?
          </h2>
          <p className="text-xs sm:text-sm text-white/50 max-w-md mx-auto">
            Universal media extraction with layered optical refraction and multi-stream acceleration.
          </p>
        </div>

        {/* Liquid Input Container */}
        <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2 p-2 bg-white/5 backdrop-blur-2xl rounded-[28px] border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300 focus-within:border-white/30 focus-within:shadow-[0_0_30px_rgba(100,210,255,0.15)]">
            <div className="flex-1 flex items-center px-4 py-2 gap-2.5">
              <Link2 size={18} className="text-white/40 shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste media link or stream URL (e.g. YouTube Live, Shorts, Vimeo)..."
                className="w-full bg-transparent border-none outline-none text-white text-sm placeholder:text-white/30"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <GlassButton
                type="button"
                onClick={() => {
                  if (urlInput.trim()) {
                    onStartDownload(urlInput.trim(), {
                      quality: 'best',
                      format: 'mp4',
                      embedThumbnail: true,
                      embedMetadata: true,
                    });
                  }
                }}
                className="px-4 py-3 text-cyan-300 hover:text-cyan-200 border-cyan-500/30 bg-cyan-500/10 flex items-center gap-1.5"
                title="Download immediately with best quality"
              >
                <Zap size={14} className="text-cyan-300" />
                <span className="text-xs font-semibold">Quick Download</span>
              </GlassButton>
              <GlassButton primary type="submit" className="px-6 py-3">
                <span>Analyze</span>
                <ArrowRight size={15} />
              </GlassButton>
            </div>
          </div>
        </form>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="text-[11px] text-white/40 font-medium">Sample streams:</span>
          {samplePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setUrlInput(preset.url);
                onAnalyzeUrl(preset.url);
              }}
              className="text-[11px] px-3 py-1 rounded-full bg-white/5 hover:bg-white/12 text-white/70 hover:text-white border border-white/10 transition-all duration-150 backdrop-blur-md cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        <GlassStatsCard
          label="Network Speed"
          value={networkSpeed}
          trend="+14.2%"
          trendDirection="up"
          subtext="16 concurrent socket streams"
          icon={<Zap size={16} className="text-cyan-300" />}
        />
        <GlassStatsCard
          label="Space Available"
          value="1.2 TB"
          trend="82% Free"
          trendDirection="up"
          subtext="Apple APFS High-Speed Pool"
          icon={<HardDrive size={16} className="text-purple-300" />}
        />
        <GlassStatsCard
          label="Active Tasks"
          value={activeItems.length}
          trend={activeItems.length > 0 ? 'Optimal' : 'Idle'}
          subtext={`${completedItems.length} streams finished`}
          icon={<Activity size={16} className="text-emerald-300" />}
        />
      </section>

      {/* Active Downloads Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">
              Active Downloads ({activeItems.length})
            </h3>
            {activeItems.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
            )}
          </div>

          {activeItems.length > 0 && (
            <div className="flex items-center gap-2">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={onPauseAll}
                className="text-xs text-white/60 hover:text-white"
              >
                <Pause size={12} className="mr-1" />
                Pause All
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={onResumeAll}
                className="text-xs text-cyan-300 hover:text-cyan-200"
              >
                <Play size={12} className="mr-1" fill="currentColor" />
                Resume All
              </GlassButton>
            </div>
          )}
        </div>

        {activeItems.length === 0 ? (
          <GlassCard className="p-10 text-center space-y-3" hover={false}>
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mx-auto">
              <Layers size={22} />
            </div>
            <h4 className="text-sm font-semibold text-white/80">
              No Active Downloads in Queue
            </h4>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Paste any video or audio stream URL above or select a preset to watch the liquid glass physics in action.
            </p>
            <div className="pt-2">
              <GlassButton
                size="sm"
                onClick={() => onAnalyzeUrl('https://cdn.apple.com/vision-pro/spatial-aurora-8k-hevc.mp4')}
              >
                Launch Sample 8K Stream
              </GlassButton>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {activeItems.map((item) => (
              <GlassDownloadCard
                key={item.id}
                item={item}
                onPauseResume={onPauseResume}
                onCancel={onCancel}
                onInspect={onInspect}
                onPreview={onPreview}
                onRetry={onRetry}
              />
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
};
