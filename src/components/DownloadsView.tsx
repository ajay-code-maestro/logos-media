import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { GlassDownloadCard } from './GlassDownloadCard';
import { DownloadItem, DownloadStatus } from '../types';
import {
  DownloadCloud,
  Pause,
  Play,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

interface DownloadsViewProps {
  items: DownloadItem[];
  onPauseResume: (id: string) => void;
  onCancel: (id: string) => void;
  onInspect: (item: DownloadItem) => void;
  onPreview: (item: DownloadItem) => void;
  onRetry: (id: string) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  onClearCompleted: () => void;
  searchQuery: string;
}

export const DownloadsView = ({
  items,
  onPauseResume,
  onCancel,
  onInspect,
  onPreview,
  onRetry,
  onPauseAll,
  onResumeAll,
  onClearCompleted,
  searchQuery,
}: DownloadsViewProps) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.codec.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.resolution.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return item.status === 'active';
    if (filterStatus === 'paused') return item.status === 'paused';
    if (filterStatus === 'completed') return item.status === 'completed';
    return true;
  });

  const activeCount = items.filter((i) => i.status === 'active').length;
  const pausedCount = items.filter((i) => i.status === 'paused').length;
  const completedCount = items.filter((i) => i.status === 'completed').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6"
    >
      {/* Top Filter and Controls Bar */}
      <GlassCard className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" hover={false}>
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {[
            { id: 'all', label: 'All Tasks', count: items.length },
            { id: 'active', label: 'Active', count: activeCount },
            { id: 'paused', label: 'Paused', count: pausedCount },
            { id: 'completed', label: 'Completed', count: completedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterStatus === tab.id
                    ? 'bg-black/15 text-black'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 justify-end">
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onPauseAll}
            className="text-xs text-white/70 hover:text-white"
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
          {completedCount > 0 && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={onClearCompleted}
              className="text-xs text-white/40 hover:text-red-400"
            >
              <Trash2 size={12} className="mr-1" />
              Clear Done
            </GlassButton>
          )}
        </div>
      </GlassCard>

      {/* Downloads List */}
      {filteredItems.length === 0 ? (
        <GlassCard className="p-12 text-center space-y-3" hover={false}>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mx-auto">
            <DownloadCloud size={24} />
          </div>
          <h3 className="text-sm font-semibold text-white/80">
            No matching downloads found
          </h3>
          <p className="text-xs text-white/40">
            Try adjusting your search query or filter criteria.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
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
    </motion.div>
  );
};
