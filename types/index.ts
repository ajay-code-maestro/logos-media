export type DownloadStatus = 'active' | 'paused' | 'completed' | 'queued' | 'error';
export type MediaCategory = 'video' | 'audio' | 'spatial' | 'document' | 'archive';
export type NavTab = 'dashboard' | 'downloads' | 'history' | 'settings' | 'about';
export type AmbientTheme = 'monochrome' | 'aurora' | 'deep-ocean' | 'sunset' | 'vision-glow';

export type MediaFormat = 'mp4' | 'mkv' | 'mov' | 'webm' | 'mp3' | 'wav' | 'm4a' | 'flac' | 'aac' | 'opus';
export type QualityPreset = 'best' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | 'audio-only';

export interface DownloadItem {
  id: string;
  title: string;
  sourceUrl: string;
  thumb: string;
  progress: number;
  speed: string;
  speedBytes: number;
  eta: string;
  etaSeconds: number;
  resolution: string;
  codec: string;
  totalSize: number; // in bytes
  downloadedSize: number; // in bytes
  status: DownloadStatus;
  category: MediaCategory;
  addedAt: string;
  completedAt?: string;
  bitrate?: string;
  frameRate?: string;
  audioChannels?: string;
  chunks: number;
  completedChunks: number;
  isSpatialVideo?: boolean;
  outputPath?: string;
  errorMessage?: string;
}

export interface VideoFormat {
  id: string;
  resolution: string;
  format: string;
  codec?: string;
  filesize?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  tbr?: number;
}

export interface VideoSubtitle {
  lang: string;
  name?: string;
  url?: string;
  ext?: string;
}

export interface VideoMetadata {
  id?: string;
  title: string;
  duration: number;
  formats: VideoFormat[];
  thumbnail: string;
  author: string;
  fps?: number;
  description?: string;
  subtitles?: VideoSubtitle[];
  isPlaylist?: boolean;
  playlistCount?: number;
  extractor?: string;
  webpageUrl?: string;
}

export interface DownloadOptions {
  customTitle?: string;
  quality?: QualityPreset | string;
  format?: MediaFormat | string;
  isSpatial?: boolean;
  outputPath?: string;
  downloadSubtitles?: boolean;
  subtitleLanguage?: string;
  embedThumbnail?: boolean;
  embedMetadata?: boolean;
  maxConcurrentThreads?: number;
  audioBitrate?: string;
  convertSpatialMVHEVC?: boolean;
}

export interface GlassSettings {
  blurIntensity: 'low' | 'medium' | 'high' | 'ultra';
  frostOpacity: number; // 0 to 100
  edgeLuminance: number; // 0 to 100
  ambientTheme: AmbientTheme;
  ambientMovement: boolean;
  springPhysics: boolean;
  soundEffects: boolean;
  glowIntensity: number;
  maxConcurrentDownloads?: number;
  defaultDownloadPath?: string;
  embedMetadataByDefault?: boolean;
  embedThumbnailsByDefault?: boolean;
}

export interface FileExportResult {
  canceled: boolean;
  filePath?: string;
}

export interface IElectronAPI {
  exportFile?: (taskId: string, suggestedFilename: string) => Promise<FileExportResult>;
  download: {
    start: (url: string, options?: DownloadOptions) => Promise<DownloadItem>;
    pause: (taskId: string) => Promise<boolean>;
    resume: (taskId: string) => Promise<boolean>;
    cancel: (taskId: string) => Promise<boolean>;
    retry: (taskId: string) => Promise<boolean>;
    getActive: () => Promise<DownloadItem[]>;
    onProgress?: (callback: (data: { taskId: string; progress: number; speed: string; eta: string; status?: DownloadStatus }) => void) => () => void;
  };
  metadata: {
    extract: (url: string) => Promise<VideoMetadata>;
  };
  history: {
    get: () => Promise<DownloadItem[]>;
    add: (item: DownloadItem) => Promise<boolean>;
    remove: (id: string) => Promise<boolean>;
    clear: () => Promise<boolean>;
  };
  settings: {
    get: () => Promise<GlassSettings>;
    save: (settings: Partial<GlassSettings>) => Promise<GlassSettings>;
  };
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}
