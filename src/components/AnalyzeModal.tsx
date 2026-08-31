import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassButton } from './GlassButton';
import { VideoMetadata, VideoFormat, DownloadOptions, QualityPreset, MediaFormat } from '../types';
import { ElectronClient } from '../services/electronBridge';
import { formatBytes, formatDuration } from '../lib/utils';
import {
  X,
  Sparkles,
  Download,
  Check,
  Film,
  Music,
  Video,
  Zap,
  Clock,
  User,
  Layers,
  FileText,
  Subtitles,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  onStartDownload: (url: string, options: DownloadOptions) => Promise<void>;
}

type TabType = 'video' | 'audio';

export const AnalyzeModal: React.FC<AnalyzeModalProps> = ({
  isOpen,
  onClose,
  url,
  onStartDownload,
}) => {
  // State for extraction
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  // Configuration selections
  const [activeTab, setActiveTab] = useState<TabType>('video');
  const [selectedQuality, setSelectedQuality] = useState<string>('best');
  const [selectedFormat, setSelectedFormat] = useState<MediaFormat>('mp4');
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<MediaFormat>('mp3');
  const [selectedAudioBitrate, setSelectedAudioBitrate] = useState<string>('320k');
  const [downloadSubtitles, setDownloadSubtitles] = useState<boolean>(false);
  const [selectedSubLang, setSelectedSubLang] = useState<string>('en');
  const [embedThumbnail, setEmbedThumbnail] = useState<boolean>(true);
  const [embedMetadata, setEmbedMetadata] = useState<boolean>(true);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Trigger metadata extraction whenever modal opens with a valid URL
  useEffect(() => {
    if (!isOpen || !url) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setMetadata(null);

    const extract = async () => {
      try {
        const data = await ElectronClient.metadata.extract(url);
        if (isMounted) {
          setMetadata(data);
          setCustomTitle(data.title || '');
          if (data.subtitles && data.subtitles.length > 0) {
            setSelectedSubLang(data.subtitles[0].lang);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[AnalyzeModal] Extraction error:', err);
          setError(err.message || 'Failed to extract metadata from the provided URL');
          setLoading(false);
        }
      }
    };

    extract();

    return () => {
      isMounted = false;
    };
  }, [isOpen, url]);

  // Handle keyboard shortcuts (Escape to close, Enter to download)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !loading && !error && !isSubmitting && metadata) {
        // Only if not currently editing an input field
        const target = e.target as HTMLElement;
        if (target && target.tagName === 'INPUT' && target.getAttribute('type') === 'text') {
          return;
        }
        handleDownload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, error, isSubmitting, metadata, customTitle, selectedQuality, selectedFormat, selectedAudioFormat, selectedAudioBitrate, downloadSubtitles, selectedSubLang, embedThumbnail, embedMetadata, activeTab]);

  if (!isOpen) return null;

  // Process and aggregate video formats by resolution
  const videoQualities: {
    preset: QualityPreset;
    label: string;
    badge?: string;
    codec: string;
    filesize?: number;
    fps?: number;
  }[] = [
    { preset: 'best', label: 'Best Available (Auto)', badge: 'Recommended', codec: 'Auto (Highest Bitrate)' },
    { preset: '2160p', label: '2160p (4K UHD)', badge: 'Master Quality', codec: 'HEVC / VP9 / AV1', fps: 60 },
    { preset: '1440p', label: '1440p (2K QHD)', codec: 'VP9 / AV1 / H.264', fps: 60 },
    { preset: '1080p', label: '1080p (Full HD)', badge: 'Popular', codec: 'H.264 / AVC', fps: 60 },
    { preset: '720p', label: '720p (HD Ready)', codec: 'H.264 / AVC', fps: 60 },
    { preset: '480p', label: '480p (Standard)', codec: 'H.264 / AVC', fps: 30 },
    { preset: '360p', label: '360p (Compact)', codec: 'H.264 / AVC', fps: 30 },
  ];

  // Available audio profiles
  const audioFormats: {
    format: MediaFormat;
    name: string;
    description: string;
    bitrates: string[];
    badge?: string;
  }[] = [
    { format: 'mp3', name: 'MP3 Audio', description: 'Universal compatibility', bitrates: ['320k', '256k', '192k', '128k'], badge: 'Most Compatible' },
    { format: 'm4a', name: 'M4A / AAC', description: 'Apple native high-efficiency audio', bitrates: ['320k', '256k', '192k'], badge: 'Apple Native' },
    { format: 'flac', name: 'FLAC Lossless', description: '24-bit studio master lossless quality', bitrates: ['Lossless'], badge: 'Lossless Hi-Res' },
    { format: 'wav', name: 'WAV Linear PCM', description: 'Uncompressed audio stream', bitrates: ['Lossless'], badge: 'Studio Master' },
    { format: 'opus', name: 'OPUS Audio', description: 'Next-gen low latency codec', bitrates: ['160k', '128k', '96k'] },
    { format: 'aac', name: 'Raw AAC', description: 'Standard AAC audio stream', bitrates: ['320k', '256k'] },
  ];

  const handleDownload = async () => {
    setIsSubmitting(true);
    try {
      const isAudioOnly = activeTab === 'audio';
      const options: DownloadOptions = {
        customTitle: customTitle.trim() || metadata?.title,
        quality: isAudioOnly ? 'audio-only' : selectedQuality,
        format: isAudioOnly ? selectedAudioFormat : selectedFormat,
        audioBitrate: isAudioOnly ? selectedAudioBitrate : undefined,
        downloadSubtitles: downloadSubtitles,
        subtitleLanguage: downloadSubtitles ? selectedSubLang : undefined,
        embedThumbnail: embedThumbnail,
        embedMetadata: embedMetadata,
        isSpatial: selectedQuality === '2160p' || (metadata?.title.toLowerCase().includes('spatial') ?? false),
      };

      await onStartDownload(url, options);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#64d2ff', '#ffffff', '#af52de', '#30d158'],
        });
      } catch {
        // Confetti fallback
      }

      onClose();
    } catch (err: any) {
      console.error('[AnalyzeModal] Download start error:', err);
      setError(err.message || 'Failed to initialize download task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryExtraction = () => {
    setLoading(true);
    setError(null);
    ElectronClient.metadata.extract(url)
      .then((data) => {
        setMetadata(data);
        setCustomTitle(data.title || '');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Extraction failed');
        setLoading(false);
      });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
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
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[26px] bg-[#12141c]/95 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden"
        >
          {/* Header (Pinned) */}
          <div className="flex items-center justify-between p-5 pb-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] shrink-0">
                <Zap size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white tracking-wide">
                    Stream Analyzer Engine
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-medium">
                    Ready
                  </span>
                </div>
                <p className="text-xs text-white/50 truncate font-mono mt-0.5">
                  {url}
                </p>
              </div>
            </div>

            <GlassButton
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-white/70 hover:text-white shrink-0"
            >
              <X size={16} />
            </GlassButton>
          </div>

          {/* Modal Body (Scrollable Container) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 min-h-0">
            {/* Loading State */}
            {loading && (
              <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
                  <div className="w-16 h-16 rounded-full border-2 border-t-cyan-400 border-r-cyan-400 border-b-transparent border-l-transparent animate-spin flex items-center justify-center">
                    <Sparkles size={22} className="text-cyan-300 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">
                    Extracting Stream Payload...
                  </h4>
                  <p className="text-xs text-white/50 max-w-xs leading-relaxed">
                    Parsing video tracks, audio codecs, resolutions, and subtitle descriptors.
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-white space-y-3">
                <div className="flex items-center gap-2.5 text-red-300">
                  <AlertCircle size={18} />
                  <h4 className="text-sm font-semibold">Extraction Failed</h4>
                </div>
                <p className="text-xs text-red-200/80 font-mono break-words">{error}</p>
                <div className="pt-2 flex justify-end">
                  <GlassButton size="sm" onClick={handleRetryExtraction} className="flex items-center gap-1.5">
                    <RefreshCw size={14} />
                    <span>Retry Analysis</span>
                  </GlassButton>
                </div>
              </div>
            )}

            {/* Extracted Metadata Overview */}
            {metadata && !loading && (
              <div className="space-y-4">
                {/* Media Hero Card */}
                <div className="flex flex-col sm:flex-row gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                  <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-black/50 border border-white/10 shrink-0">
                    <img
                      src={metadata.thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400'}
                      alt={metadata.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {metadata.duration > 0 && (
                      <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-medium text-white flex items-center gap-1">
                        <Clock size={10} />
                        <span>{formatDuration(metadata.duration)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div>
                      <label className="text-[11px] text-white/50 block mb-1">Title / Target Filename:</label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Title / Target Filename"
                        className="w-full text-xs font-medium text-white bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all truncate"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-cyan-300" />
                        <span className="font-medium text-white/80">{metadata.author || 'Creator'}</span>
                      </div>

                      {metadata.extractor && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                          {metadata.extractor}
                        </span>
                      )}

                      {metadata.fps && (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono text-white/70">
                          {metadata.fps} FPS
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mode Selector Tabs (Video vs Audio) */}
                <div className="flex p-1 rounded-2xl bg-white/[0.05] border border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('video')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                      activeTab === 'video'
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 border border-cyan-400/30 shadow-lg'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Video size={15} />
                    <span>Video Formats & Streams</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('audio')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                      activeTab === 'audio'
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-200 border border-purple-400/30 shadow-lg'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Music size={15} />
                    <span>Audio Extraction</span>
                  </button>
                </div>

                {/* VIDEO CONFIGURATION */}
                {activeTab === 'video' && (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-white/70 flex items-center justify-between">
                      <span>Select Video Quality:</span>
                      <span className="text-[10px] text-white/40">Multi-stream FFmpeg Merge</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                      {videoQualities.map((item) => {
                        const isSelected = selectedQuality === item.preset;
                        return (
                          <div
                            key={item.preset}
                            onClick={() => setSelectedQuality(item.preset)}
                            className={`p-2.5 rounded-xl cursor-pointer border transition-all duration-200 flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white'
                                : 'bg-white/[0.03] border-white/5 text-white/70 hover:bg-white/[0.08] hover:text-white'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold">{item.label}</span>
                                {item.badge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-white/40 font-mono mt-0.5">
                                {item.codec} {item.fps ? `• ${item.fps}fps` : ''}
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'bg-cyan-400 border-cyan-300 text-black'
                                  : 'border-white/20'
                              }`}
                            >
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Video Container Format */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-white/70">Container Format:</label>
                      <div className="flex gap-2">
                        {(['mp4', 'mkv', 'mov', 'webm'] as MediaFormat[]).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setSelectedFormat(fmt)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-semibold uppercase border transition-all ${
                              selectedFormat === fmt
                                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200 shadow'
                                : 'bg-white/[0.03] border-white/5 text-white/50 hover:text-white'
                            }`}
                          >
                            .{fmt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AUDIO EXTRACTION CONFIGURATION */}
                {activeTab === 'audio' && (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-white/70">
                      Select Audio Format Profile:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                      {audioFormats.map((af) => {
                        const isSelected = selectedAudioFormat === af.format;
                        return (
                          <div
                            key={af.format}
                            onClick={() => {
                              setSelectedAudioFormat(af.format);
                              setSelectedAudioBitrate(af.bitrates[0]);
                            }}
                            className={`p-2.5 rounded-xl cursor-pointer border transition-all duration-200 flex items-center justify-between ${
                              isSelected
                                ? 'bg-purple-500/15 border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] text-white'
                                : 'bg-white/[0.03] border-white/5 text-white/70 hover:bg-white/[0.08] hover:text-white'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold">{af.name}</span>
                                {af.badge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                                    {af.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-white/40 font-mono mt-0.5">
                                {af.description}
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'bg-purple-400 border-purple-300 text-black'
                                  : 'border-white/20'
                              }`}
                            >
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bitrate Selector for MP3/M4A */}
                    {selectedAudioFormat === 'mp3' || selectedAudioFormat === 'm4a' ? (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/70">Audio Bitrate Target:</label>
                        <div className="flex gap-2">
                          {['320k', '256k', '192k', '128k'].map((br) => (
                            <button
                              key={br}
                              type="button"
                              onClick={() => setSelectedAudioBitrate(br)}
                              className={`flex-1 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                                selectedAudioBitrate === br
                                  ? 'bg-purple-500/20 border-purple-400/40 text-purple-200 font-semibold shadow'
                                  : 'bg-white/[0.03] border-white/5 text-white/50 hover:text-white'
                              }`}
                            >
                              {br}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Subtitles & Embedding Options */}
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div className="text-xs font-semibold text-white/70">
                    Metadata & Subtitle Embeddings
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/80 cursor-pointer hover:bg-white/[0.06]">
                      <input
                        type="checkbox"
                        checked={embedThumbnail}
                        onChange={(e) => setEmbedThumbnail(e.target.checked)}
                        className="rounded accent-cyan-400"
                      />
                      <ImageIcon size={13} className="text-cyan-300 shrink-0" />
                      <span className="truncate">Thumb</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/80 cursor-pointer hover:bg-white/[0.06]">
                      <input
                        type="checkbox"
                        checked={embedMetadata}
                        onChange={(e) => setEmbedMetadata(e.target.checked)}
                        className="rounded accent-cyan-400"
                      />
                      <FileText size={13} className="text-purple-300 shrink-0" />
                      <span className="truncate">Tags</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/80 cursor-pointer hover:bg-white/[0.06]">
                      <input
                        type="checkbox"
                        checked={downloadSubtitles}
                        onChange={(e) => setDownloadSubtitles(e.target.checked)}
                        className="rounded accent-cyan-400"
                      />
                      <Subtitles size={13} className="text-emerald-300 shrink-0" />
                      <span className="truncate">Subtitles</span>
                    </label>
                  </div>

                  {downloadSubtitles && metadata.subtitles && metadata.subtitles.length > 0 && (
                    <div className="pt-1 flex items-center gap-2 text-xs">
                      <span className="text-white/60 shrink-0">Subtitle:</span>
                      <select
                        value={selectedSubLang}
                        onChange={(e) => setSelectedSubLang(e.target.value)}
                        className="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 w-full"
                      >
                        <option value="all">All Available Subtitles</option>
                        {metadata.subtitles.map((s) => (
                          <option key={s.lang} value={s.lang}>
                            {s.name || s.lang} ({s.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer (Always Pinned at the bottom with vibrant download button) */}
          <div className="p-4 sm:p-5 border-t border-white/10 shrink-0 bg-[#0e1017]/95 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <div className="text-xs text-white/60 text-center sm:text-left">
              {metadata ? (
                <div className="flex items-center gap-2">
                  <span className="text-white/50">Target:</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 font-mono font-bold uppercase border border-white/10">
                    .{activeTab === 'video' ? selectedFormat : selectedAudioFormat}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono font-semibold border border-white/10">
                    {activeTab === 'video' ? selectedQuality : selectedAudioBitrate}
                  </span>
                </div>
              ) : (
                <span className="text-white/40 font-mono text-[11px]">Awaiting payload analysis...</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={loading || Boolean(error) || isSubmitting}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 hover:from-cyan-300 hover:to-teal-200 active:scale-95 transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 font-mono tracking-wide"
              >
                <Download size={16} className="text-black stroke-[2.5]" />
                <span>{isSubmitting ? 'INITIALIZING...' : 'START DOWNLOAD'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
