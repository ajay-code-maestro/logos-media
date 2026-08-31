import React from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { DownloadItem } from '../types';
import { formatBytes, exportMediaToDisk } from '../lib/utils';
import {
  History,
  Play,
  Layers,
  Sparkles,
  Download,
  Trash2,
  Share2,
  FolderCheck,
  CheckCircle2,
} from 'lucide-react';

interface HistoryViewProps {
  items: DownloadItem[];
  onPreview: (item: DownloadItem) => void;
  onInspect: (item: DownloadItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  searchQuery: string;
}

export const HistoryView = ({
  items,
  onPreview,
  onInspect,
  onDelete,
  onClearAll,
  searchQuery,
}: HistoryViewProps) => {
  const completedItems = items.filter(
    (i) =>
      i.status === 'completed' &&
      (i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.codec.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalSavedBytes = completedItems.reduce((acc, curr) => acc + curr.totalSize, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6"
    >
      {/* Header Summary */}
      <GlassCard className="p-6" hover={false}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FolderCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Completed Media Vault
              </h2>
              <p className="text-xs text-white/50">
                {completedItems.length} streams saved • {formatBytes(totalSavedBytes)} total disk allocation
              </p>
            </div>
          </div>

          {completedItems.length > 0 && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs text-white/50 hover:text-red-400 self-start sm:self-auto"
            >
              <Trash2 size={13} className="mr-1" />
              Clear History
            </GlassButton>
          )}
        </div>
      </GlassCard>

      {/* Grid of Completed Media Cards */}
      {completedItems.length === 0 ? (
        <GlassCard className="p-12 text-center space-y-3" hover={false}>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mx-auto">
            <History size={24} />
          </div>
          <h3 className="text-sm font-semibold text-white/80">
            No completed media yet
          </h3>
          <p className="text-xs text-white/40 max-w-sm mx-auto">
            When your downloads finish processing, they will appear here with instant liquid playback and metadata inspection.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedItems.map((item) => (
            <GlassCard key={item.id} className="p-4 group">
              <div className="flex gap-4 items-start">
                {/* Thumbnail with overlay */}
                <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-white/5 shrink-0">
                  <img
                    src={item.thumb}
                    alt={item.title}
                    className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-xl" />
                  <button
                    onClick={() => onPreview(item)}
                    className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 cursor-pointer"
                  >
                    <Play size={14} fill="white" className="ml-0.5" />
                  </button>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4
                    onClick={() => onPreview(item)}
                    className="text-sm font-semibold text-white truncate hover:text-cyan-300 cursor-pointer mb-1"
                  >
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-2">
                    <span className="font-mono">{formatBytes(item.totalSize)}</span>
                    <span>•</span>
                    <span className="text-cyan-300 font-semibold">{item.resolution}</span>
                    <span>•</span>
                    <span>{item.codec}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-white/40">
                      {item.completedAt || 'Saved just now'}
                    </span>
                    <div className="flex items-center gap-1">
                      <GlassButton
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-white/60 hover:text-white"
                        onClick={() => onInspect(item)}
                        title="Stream Info"
                      >
                        <Layers size={13} />
                      </GlassButton>
                      <GlassButton
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20"
                        onClick={() => exportMediaToDisk(item)}
                        title="Save & Export to Laptop"
                      >
                        <Download size={13} />
                      </GlassButton>
                      <GlassButton
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-emerald-400 hover:text-emerald-300"
                        onClick={() => onPreview(item)}
                        title="Play"
                      >
                        <Play size={13} fill="currentColor" />
                      </GlassButton>
                      <GlassButton
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-white/30 hover:text-red-400"
                        onClick={() => onDelete(item.id)}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </GlassButton>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
};
