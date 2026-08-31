import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { DownloadItem } from '../types';
import { formatBytes } from '../lib/utils';
import {
  X,
  Layers,
  Sparkles,
  Cpu,
  Volume2,
  HardDrive,
  CheckCircle,
  Copy,
  Terminal,
  Share2,
} from 'lucide-react';

interface InspectorModalProps {
  item: DownloadItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InspectorModal = ({ item, isOpen, onClose }: InspectorModalProps) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !item) return null;

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(item.sourceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Optical Blur Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <GlassCard className="p-6 md:p-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-cyan-300">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white truncate max-w-md">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-white/50">Stream Inspector</span>
                    <span className="text-xs text-cyan-400">• {item.resolution}</span>
                    <span className="text-xs text-white/40">• {item.codec}</span>
                  </div>
                </div>
              </div>
              <GlassButton
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8"
              >
                <X size={16} />
              </GlassButton>
            </div>

            {/* Body Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-1">
                  Resolution
                </span>
                <span className="text-sm font-semibold text-white font-mono">
                  {item.resolution}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-1">
                  Bitrate
                </span>
                <span className="text-sm font-semibold text-cyan-300 font-mono">
                  {item.bitrate}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-1">
                  Total Payload
                </span>
                <span className="text-sm font-semibold text-white font-mono">
                  {formatBytes(item.totalSize)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-1">
                  Framerate
                </span>
                <span className="text-sm font-semibold text-white font-mono">
                  {item.frameRate || '60.0 fps'}
                </span>
              </div>
            </div>

            {/* Spatial & Audio Architecture */}
            <div className="space-y-3 mb-5">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 size={18} className="text-purple-300" />
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Audio Stream Matrix
                    </div>
                    <div className="text-[11px] text-white/50">
                      {item.audioChannels || 'Dolby Atmos 7.1.4 (Binaural Render)'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  Spatial Audio 96kHz
                </span>
              </div>

              {item.isSpatialVideo && (
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} className="text-cyan-300" />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Apple Vision Pro Stereoscopic
                      </div>
                      <div className="text-[11px] text-cyan-200/70">
                        MV-HEVC Dual-Eye disparity metadata included
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-300/30">
                    VisionOS Ready
                  </span>
                </div>
              )}
            </div>

            {/* Chunk Buffer Distribution Map */}
            <div className="mb-5">
              <div className="flex justify-between items-center text-xs mb-2 text-white/60">
                <span className="font-semibold text-white/80">Segmented Threads ({item.completedChunks}/{item.chunks})</span>
                <span className="font-mono text-cyan-300">{Math.round(item.progress)}% Verified</span>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 p-2 rounded-xl bg-black/40 border border-white/5">
                {Array.from({ length: item.chunks }).map((_, i) => (
                  <div
                    key={i}
                    title={`Chunk #${i + 1}`}
                    className={`h-4 rounded-xs text-[8px] flex items-center justify-center font-mono ${
                      i < item.completedChunks
                        ? 'bg-cyan-400/80 text-black font-bold shadow-[0_0_8px_rgba(100,210,255,0.4)]'
                        : 'bg-white/10 text-white/30'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Terminal Command & Footer */}
            <div className="p-3 rounded-xl bg-black/50 border border-white/5 mb-5 flex items-center justify-between gap-2 font-mono text-[11px] text-white/60">
              <div className="flex items-center gap-2 truncate">
                <Terminal size={13} className="text-cyan-400 shrink-0" />
                <span className="truncate">curl -C - -O "{item.sourceUrl}"</span>
              </div>
              <GlassButton
                variant="ghost"
                size="sm"
                className="text-xs shrink-0 py-1"
                onClick={handleCopyUrl}
              >
                {copied ? <CheckCircle size={12} className="text-emerald-400 mr-1" /> : <Copy size={12} className="mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </GlassButton>
            </div>

            <div className="flex justify-end gap-3">
              <GlassButton variant="primary" onClick={onClose}>
                Done
              </GlassButton>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
