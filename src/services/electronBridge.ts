import {
  IElectronAPI,
  DownloadItem,
  DownloadOptions,
  DownloadStatus,
  VideoMetadata,
  GlassSettings,
} from '../types';

/**
 * Checks if the application is running inside an Electron Renderer process with electronAPI exposed
 */
export const isElectronEnv = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
};

// URL parser & normalizer for media URLs
export function parseMediaUrl(url: string) {
  const trimmed = (url || '').trim();

  // YouTube match (/watch?v=, /live/, /shorts/, /embed/, youtu.be/)
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const isLive = trimmed.includes('/live/');
    const isShort = trimmed.includes('/shorts/');
    return {
      platform: 'YouTube',
      isYouTube: true,
      videoId,
      isLive,
      isShort,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      maxResThumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    };
  }

  // Vimeo match
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      platform: 'Vimeo',
      isVimeo: true,
      videoId: vimeoMatch[1],
      isLive: false,
      isShort: false,
      canonicalUrl: `https://vimeo.com/${vimeoMatch[1]}`,
      thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=600',
      maxResThumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=600',
    };
  }

  // Twitch match
  if (trimmed.includes('twitch.tv/')) {
    return {
      platform: 'Twitch',
      isTwitch: true,
      videoId: trimmed.split('twitch.tv/').pop() || '',
      isLive: true,
      isShort: false,
      canonicalUrl: trimmed,
      thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600',
      maxResThumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600',
    };
  }

  // Generic
  return {
    platform: 'Media',
    isYouTube: false,
    videoId: '',
    isLive: false,
    isShort: false,
    canonicalUrl: trimmed,
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600',
    maxResThumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600',
  };
}

// Local storage persistent history & settings keys
const STORAGE_HISTORY_KEY = 'logos_media_history_v2';
const STORAGE_SETTINGS_KEY = 'logos_media_settings_v2';

function getStoredHistory(): DownloadItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[electronBridge] Failed to load history from localStorage', e);
  }
  return [];
}

function saveStoredHistory(items: DownloadItem[]) {
  try {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[electronBridge] Failed to save history to localStorage', e);
  }
}

function getStoredSettings(): GlassSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[electronBridge] Failed to load settings from localStorage', e);
  }
  return {
    blurIntensity: 'ultra',
    frostOpacity: 6,
    edgeLuminance: 30,
    ambientTheme: 'aurora',
    ambientMovement: true,
    springPhysics: true,
    soundEffects: true,
    glowIntensity: 80,
    maxConcurrentDownloads: 3,
    embedMetadataByDefault: true,
    embedThumbnailsByDefault: true,
  };
}

// In-memory active tasks and listeners
let fallbackDownloads: DownloadItem[] = [];
let fallbackHistory: DownloadItem[] = getStoredHistory();
let fallbackSettings: GlassSettings = getStoredSettings();

type ProgressListener = (data: {
  taskId: string;
  progress: number;
  speed: string;
  speedBytes?: number;
  eta: string;
  etaSeconds?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  completedChunks?: number;
  status?: DownloadStatus;
}) => void;

const progressListeners: Set<ProgressListener> = new Set();
const activeIntervals: Map<string, any> = new Map();

function emitProgress(data: Parameters<ProgressListener>[0]) {
  progressListeners.forEach((listener) => {
    try {
      listener(data);
    } catch (err) {
      console.error('[electronBridge] Listener error', err);
    }
  });
}

/**
 * Universal Electron API Client
 */
export const ElectronClient: IElectronAPI = {
  download: {
    start: async (url: string, options: DownloadOptions = {}): Promise<DownloadItem> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.download.start(url, options);
      }

      const parsed = parseMediaUrl(url);
      const isAudio = ['mp3', 'wav', 'm4a', 'flac', 'aac', 'opus'].includes((options.format || '').toLowerCase());
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      let itemTitle = options.customTitle || '';
      let itemThumb = parsed.isYouTube ? parsed.thumbnail : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400';

      // Extract real metadata dynamically from server
      try {
        const metaRes = await fetch(`/api/extract-metadata?url=${encodeURIComponent(url)}`);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          if (!itemTitle && meta.title) itemTitle = meta.title;
          if (meta.thumbnail) itemThumb = meta.thumbnail;
        }
      } catch (err) {
        console.warn('Could not extract metadata for title and thumbnail', err);
      }

      if (!itemTitle) {
        itemTitle = parsed.isYouTube ? `YouTube Video [${parsed.videoId}]` : 'Media Stream';
      }

      const item: DownloadItem = {
        id: taskId,
        title: itemTitle,
        sourceUrl: parsed.canonicalUrl || url,
        thumb: itemThumb,
        progress: 0,
        speed: 'Connecting…',
        speedBytes: 0,
        eta: 'Waiting for yt-dlp…',
        etaSeconds: 0,
        resolution: (options.quality as string) || (isAudio ? (options.audioBitrate || '320kbps') : '720p HD'),
        codec: options.format?.toUpperCase() || (isAudio ? 'MP3' : 'Source'),
        totalSize: 0,
        downloadedSize: 0,
        status: 'active',
        category: options.isSpatial ? 'spatial' : isAudio ? 'audio' : 'video',
        addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chunks: 0,
        completedChunks: 0,
        isSpatialVideo: options.isSpatial || false,
      };

      const startResponse = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          title: itemTitle,
          sourceUrl: parsed.canonicalUrl || url,
          thumb: itemThumb,
          format: options.format || 'mp4',
          resolution: options.quality || '720p',
        }),
      });
      if (!startResponse.ok) {
        const body = await startResponse.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to start this download.');
      }

      fallbackDownloads = [item, ...fallbackDownloads];

      const applyServerJob = (job: any) => {
        const completed = job.status === 'completed';
        const updatedItem: DownloadItem = {
          ...item,
          title: job.title || item.title,
          progress: Number.isFinite(job.progress) ? job.progress : item.progress,
          speed: job.speed || item.speed,
          speedBytes: job.speedBytes || 0,
          eta: job.eta || item.eta,
          etaSeconds: job.etaSeconds || 0,
          totalSize: job.totalBytes || 0,
          downloadedSize: job.downloadedBytes || 0,
          status: job.status,
          completedAt: completed ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          errorMessage: job.error,
        };
        fallbackDownloads = fallbackDownloads.map((download) => download.id === taskId ? updatedItem : download);
        emitProgress({
          taskId,
          progress: updatedItem.progress,
          speed: updatedItem.speed,
          speedBytes: updatedItem.speedBytes,
          eta: updatedItem.eta,
          etaSeconds: updatedItem.etaSeconds,
          downloadedBytes: updatedItem.downloadedSize,
          totalBytes: updatedItem.totalSize,
          completedChunks: 0,
          status: updatedItem.status,
        });
        if (completed) {
          fallbackHistory = [updatedItem, ...fallbackHistory.filter((historyItem) => historyItem.id !== taskId)];
          saveStoredHistory(fallbackHistory);
        }
      };

      const pollServerJob = async () => {
        try {
          const response = await fetch(`/api/downloads/${taskId}`);
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || 'Unable to read download status.');
          applyServerJob(body.job);
          if (body.job.status === 'completed' || body.job.status === 'error') {
            const interval = activeIntervals.get(taskId);
            if (interval) clearInterval(interval);
            activeIntervals.delete(taskId);
          }
        } catch (error) {
          applyServerJob({ status: 'error', error: error instanceof Error ? error.message : 'Lost connection to download server.' });
          const interval = activeIntervals.get(taskId);
          if (interval) clearInterval(interval);
          activeIntervals.delete(taskId);
        }
      };

      await pollServerJob();
      if (fallbackDownloads.some((download) => download.id === taskId && ['active', 'paused'].includes(download.status))) {
        activeIntervals.set(taskId, setInterval(() => { void pollServerJob(); }, 750));
      }
      return item;
    },

    pause: async (id: string): Promise<boolean> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.download.pause(id);
      }
      const response = await fetch(`/api/downloads/${id}/pause`, { method: 'POST' });
      return response.ok;
    },

    resume: async (id: string): Promise<boolean> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.download.resume(id);
      }
      const response = await fetch(`/api/downloads/${id}/resume`, { method: 'POST' });
      return response.ok;
    },

    cancel: async (id: string): Promise<boolean> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.download.cancel(id);
      }
      const response = await fetch(`/api/downloads/${id}/cancel`, { method: 'POST' });
      if (!response.ok) return false;
      const interval = activeIntervals.get(id);
      if (interval) {
        clearInterval(interval);
        activeIntervals.delete(id);
      }
      fallbackDownloads = fallbackDownloads.filter((d) => d.id !== id);
      return true;
    },

    retry: async (id: string): Promise<boolean> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.download.retry(id);
      }
      const item = fallbackDownloads.find((d) => d.id === id) || fallbackHistory.find((h) => h.id === id);
      if (!item) return false;

      await ElectronClient.download.start(item.sourceUrl, {
        customTitle: item.title,
        quality: item.resolution as any,
      });
      return true;
    },

    getActive: async (): Promise<DownloadItem[]> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.download.getActive();
      }
      return fallbackDownloads;
    },

    onProgress: (callback: ProgressListener) => {
      if (isElectronEnv() && window.electronAPI?.download.onProgress) {
        return window.electronAPI.download.onProgress(callback);
      }
      progressListeners.add(callback);
      return () => {
        progressListeners.delete(callback);
      };
    },
  },

  metadata: {
    extract: async (url: string): Promise<VideoMetadata> => {
      if (isElectronEnv() && window.electronAPI) {
        try {
          return await window.electronAPI.metadata.extract(url);
        } catch (ipcErr) {
          console.warn('[electronBridge] Native metadata extract failed, running web fallback:', ipcErr);
        }
      }

      // Query server-side extractor endpoint
      try {
        const serverRes = await fetch(`/api/extract-metadata?url=${encodeURIComponent(url)}`);
        if (serverRes.ok) {
          return await serverRes.json();
        }
      } catch (e) {
        console.warn('Server metadata extractor failed, falling back to direct oEmbed', e);
      }

      const parsed = parseMediaUrl(url);

      if (parsed.isYouTube && parsed.videoId) {
        try {
          const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${parsed.videoId}&format=json`;
          const res = await fetch(oEmbedUrl);
          if (res.ok) {
            const data = await res.json();
            return {
              id: parsed.videoId,
              title: data.title || 'YouTube Live / Video Stream',
              duration: 0,
              thumbnail: data.thumbnail_url || parsed.thumbnail,
              author: data.author_name || 'Unknown publisher',
              description: '',
              formats: [],
              subtitles: [],
              extractor: 'YouTube oEmbed',
              webpageUrl: parsed.canonicalUrl,
            };
          }
        } catch (err) {
          console.warn('[electronBridge] oEmbed direct fetch error, falling back to parsed info', err);
        }
      }

      // Universal fallback
      return {
        id: parsed.videoId || `media-${Math.random().toString(36).substring(2, 8)}`,
        title: parsed.videoId ? `YouTube video ${parsed.videoId}` : 'Media URL',
        duration: 0,
        thumbnail: parsed.thumbnail,
        author: 'Unknown publisher',
        description: 'Metadata unavailable.',
        formats: [],
        subtitles: [],
        extractor: 'Unavailable',
        webpageUrl: parsed.canonicalUrl || url,
      };
    },
  },

  history: {
    get: async (): Promise<DownloadItem[]> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.history.get();
      }
      return fallbackHistory;
    },

    add: async (item: DownloadItem): Promise<boolean> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.history.add(item);
      }
      fallbackHistory = [item, ...fallbackHistory.filter((h) => h.id !== item.id)];
      saveStoredHistory(fallbackHistory);
      return true;
    },

    clear: async (): Promise<boolean> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.history.clear();
      }
      fallbackHistory = [];
      saveStoredHistory([]);
      return true;
    },

    remove: async (id: string): Promise<boolean> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.history.remove(id);
      }
      fallbackHistory = fallbackHistory.filter((item) => item.id !== id);
      saveStoredHistory(fallbackHistory);
      return true;
    },
  },

  settings: {
    get: async (): Promise<GlassSettings> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.settings.get();
      }
      return fallbackSettings;
    },

    save: async (newSettings: Partial<GlassSettings>): Promise<GlassSettings> => {
      if (isElectronEnv() && window.electronAPI) {
        return window.electronAPI.settings.save(newSettings);
      }
      fallbackSettings = { ...fallbackSettings, ...newSettings };
      try {
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(fallbackSettings));
      } catch (e) {
        console.warn('Failed to save settings to localStorage', e);
      }
      return fallbackSettings;
    },
  },
};
