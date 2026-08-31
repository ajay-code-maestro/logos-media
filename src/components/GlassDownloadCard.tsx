import React from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { GlassProgressBar } from './GlassProgressBar';
import { DownloadItem } from '../types';
import { formatBytes, exportMediaToDisk } from '../lib/utils';
import {
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
} from 'lucide-react';

interface GlassDownloadCardProps {
  item: DownloadItem;
  onPauseResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onInspect?: (item: DownloadItem) => void;
  onPreview?: (item: DownloadItem) => void;
  onRetry?: (id: string) => void;
  compact?: boolean;
  id?: string;
  key?: React.Key;
}

export const GlassDownloadCard = ({
  item,
  onPauseResume,
  onCancel,
  onInspect,
  onPreview,
  onRetry,
  compact = false,
  id,
}: GlassDownloadCardProps) => {
  const isCompleted = item.status === 'completed';
  const isPaused = item.status === 'paused';
  const isError = item.status === 'error';
  const isActive = item.status === 'active';

  return (
    <GlassCard id={id} className="p-4 mb-4 group transition-all duration-300">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Thumbnail with Glass Overlay */}
        <div className="relative w-full sm:w-36 h-22 rounded-xl overflow-hidden bg-white/5 shrink-0 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-shadow">
          <img
            src={item.thumb}
            alt={item.title}
            className="w-full h-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-xl pointer-events-none" />

          {/* Spatial/4K Badge Overlay */}
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
            {item.isSpatialVideo && (
              <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-400/30">
                <Sparkles size={10} /> Spatial
              </span>
            )}
          </div>

          {isCompleted && (
            <div className="absolute top-1.5 right-1.5 bg-emerald-500/80 backdrop-blur-md rounded-full p-1 text-white border border-emerald-400/40">
              <CheckCircle2 size={12} />
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap justify-between items-start gap-2 mb-1.5">
            <h3
              className="text-sm font-semibold text-white/90 truncate max-w-md hover:text-white cursor-pointer"
              onClick={() => onInspect?.(item)}
              title={item.title}
            >
              {item.title}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/70 uppercase tracking-widest leading-normal border border-white/5 backdrop-blur-md">
                {item.resolution}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-white/50 uppercase tracking-wider leading-normal border border-white/5">
                {item.codec}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-between text-[11px] text-white/50 mb-2 font-medium">
            <div className="flex items-center gap-2">
              {isActive && (
                <span className="text-cyan-300 font-semibold">{item.speed}</span>
              )}
              {isPaused && (
                <span className="text-amber-300 font-semibold">Paused</span>
              )}
              {isCompleted && (
                <span className="text-emerald-400 font-semibold">Completed</span>
              )}
              {isError && (
                <span className="text-red-400 font-semibold">Failed</span>
              )}
              <span className="text-white/30">•</span>
              <span>
                {formatBytes(item.downloadedSize)} of {formatBytes(item.totalSize)}
              </span>
              {!isCompleted && !isPaused && !isError && (
                <>
                  <span className="text-white/30">•</span>
                  <span>{item.eta} left</span>
                </>
              )}
            </div>
            <span className="font-semibold text-white/80">
              {Math.round(item.progress)}%
            </span>
          </div>

          <GlassProgressBar progress={item.progress} status={item.status} />

        </div>

        {/* Action Controls */}
        <div className="flex sm:flex-col md:flex-row items-center gap-2 pt-2 sm:pt-0 sm:pl-4 sm:border-l border-white/5 w-full sm:w-auto justify-end">
          {isActive && (
            <GlassButton
              variant="default"
              size="icon"
              className="w-8 h-8"
              onClick={() => onPauseResume?.(item.id)}
              title="Pause Download"
            >
              <Pause size={14} fill="currentColor" />
            </GlassButton>
          )}

          {isPaused && (
            <GlassButton
              variant="default"
              size="icon"
              className="w-8 h-8 text-cyan-300"
              onClick={() => onPauseResume?.(item.id)}
              title="Resume Download"
            >
              <Play size={14} fill="currentColor" className="ml-0.5" />
            </GlassButton>
          )}

          {isError && (
            <GlassButton
              variant="default"
              size="icon"
              className="w-8 h-8 text-amber-300"
              onClick={() => onRetry?.(item.id)}
              title="Retry Download"
            >
              <RefreshCw size={14} />
            </GlassButton>
          )}

          {isCompleted && (
            <>
              <GlassButton
                variant="default"
                size="icon"
                className="w-8 h-8 text-emerald-300 hover:bg-emerald-500/20"
                onClick={() => onPreview?.(item)}
                title="Play / Preview Stream"
              >
                <Eye size={14} />
              </GlassButton>
              <GlassButton
                variant="default"
                size="icon"
                className="w-8 h-8 text-cyan-300 hover:bg-cyan-500/20 border-cyan-400/30"
                onClick={() => exportMediaToDisk(item)}
                title="Save & Export to Laptop"
              >
                <Download size={14} />
              </GlassButton>
            </>
          )}

          <GlassButton
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-white/50 hover:text-white"
            onClick={() => onInspect?.(item)}
            title="Inspect Stream Metadata"
          >
            <Layers size={14} />
          </GlassButton>

          <GlassButton
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-white/30 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => onCancel?.(item.id)}
            title="Remove"
          >
            <Trash2 size={14} />
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
};
