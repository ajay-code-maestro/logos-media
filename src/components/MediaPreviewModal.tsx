import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { DownloadItem } from '../types';
import { exportMediaToDisk } from '../lib/utils';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  Download,
  ExternalLink,
  Check,
  Copy,
  Radio,
  Tv,
  Film,
  Music,
  Video,
  FileVideo,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MediaPreviewModalProps {
  item: DownloadItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ item, isOpen, onClose }) => {
  const [viewMode, setViewMode] = useState<'local_video' | 'stream' | 'poster'>('local_video');
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen || !item) return null;

  const isAudio = item.codec?.toLowerCase().includes('mp3') || item.category === 'audio';
  const videoStreamUrl = `/api/video/${item.id}`;
  const directDownloadUrl = `/api/download-file/${item.id}`;

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      await exportMediaToDisk(item);
      setExportSuccess(true);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#64d2ff', '#30d158', '#ffd60a'],
        });
      } catch {}
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.sourceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-2xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          className="relative z-10 w-full max-w-4xl"
        >
          <div className="rounded-[26px] bg-[#10121a]/95 border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-3xl overflow-hidden flex flex-col">
            {/* Top Control & Title Bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-black/40 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <FileVideo size={14} className="text-cyan-400 shrink-0" />
                  <span className="text-xs font-semibold text-white/90 truncate max-w-xs sm:max-w-md">
                    {item.title}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/10">
                  <button
                    onClick={() => setViewMode('local_video')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'local_video'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <Video size={12} />
                    <span>Downloaded Video (.MP4)</span>
                  </button>
                  <button
                    onClick={() => setViewMode('poster')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'poster'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <Film size={12} />
                    <span>Artwork</span>
                  </button>
                </div>

                <GlassButton
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full text-white/70 hover:text-white"
                >
                  <X size={14} />
                </GlassButton>
              </div>
            </div>

            {/* Video Stage Container */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
              {viewMode === 'local_video' ? (
                /* Native HTML5 Video Player playing the REAL downloaded MP4 container */
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    ref={videoRef}
                    src={videoStreamUrl}
                    poster={item.thumb}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  >
                    <source src={videoStreamUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                /* Poster Artwork Mode */
                <div className="relative w-full h-full">
                  <img
                    src={item.thumb}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-4 left-4 p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 max-w-md">
                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                    <p className="text-[10px] text-white/60 font-mono mt-0.5">
                      {item.resolution} • {item.codec} • {item.category?.toUpperCase()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action / Export Bar */}
            <div className="p-4 bg-[#0d0f16] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-white/70 w-full sm:w-auto justify-center sm:justify-start">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase text-[11px] border border-cyan-500/30">
                  {item.resolution || '720P'} MP4
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/60 font-mono text-[11px] border border-white/5">
                  H.264 / AAC
                </span>
                {item.status === 'completed' && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                    <Check size={12} /> Ready to Export
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Copy Media URL"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>

                {/* Open Source Button */}
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Open Source</span>
                </a>

                {/* Main Export & Save to Laptop Button (Downloads real MP4) */}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer font-mono tracking-wide ${
                    exportSuccess
                      ? 'bg-emerald-400 text-black shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 text-black hover:from-cyan-300 hover:to-teal-200 shadow-cyan-500/30'
                  }`}
                >
                  {exportSuccess ? (
                    <>
                      <Check size={14} className="stroke-[3]" />
                      <span>DOWNLOADING MP4...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} className="stroke-[2.5]" />
                      <span>{isExporting ? 'EXPORTING MP4...' : 'SAVE TO LAPTOP (.MP4)'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
