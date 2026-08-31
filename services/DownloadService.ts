import { EventEmitter } from 'node:events';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import {
  DownloadItem,
  DownloadOptions,
  VideoMetadata,
  DownloadStatus,
  MediaFormat,
  QualityPreset,
} from '../types';
import { Logger } from '../utils/logger';
import { AppPaths } from '../utils/paths';
import { HistoryService } from './HistoryService';

export interface ProgressEventData {
  taskId: string;
  progress: number;
  speed: string;
  speedBytes: number;
  eta: string;
  etaSeconds: number;
  downloadedBytes: number;
  totalBytes: number;
  chunks: number;
  completedChunks: number;
}

export interface DownloadTaskConfig {
  id: string;
  url: string;
  options: DownloadOptions;
  item: DownloadItem;
  process?: ChildProcess;
  isPaused: boolean;
  isCancelled: boolean;
  retryCount: number;
  maxRetries: number;
  targetOutputPath?: string;
  startedAtTimestamp?: number;
}

export type DownloadServiceEventMap = {
  progress: [data: ProgressEventData];
  completed: [data: { taskId: string; item: DownloadItem; outputPath: string }];
  error: [data: { taskId: string; error: string; fatal: boolean }];
  statusChange: [data: { taskId: string; status: DownloadStatus }];
  itemAdded: [item: DownloadItem];
  queueUpdated: [queue: DownloadItem[]];
};

export class DownloadService extends EventEmitter {
  private static instance: DownloadService;

  // Active tasks and pending download queue
  private tasks = new Map<string, DownloadTaskConfig>();
  private queue: string[] = [];
  private activeDownloadCount = 0;
  private maxConcurrentDownloads = 3;

  // Binary configuration
  private ytdlpPath: string = 'yt-dlp';
  private ffmpegPath: string = 'ffmpeg';

  private constructor() {
    super();
    this.detectBinaries();
  }

  public static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  public setBinaryPaths(ytdlp?: string, ffmpeg?: string): void {
    if (ytdlp) this.ytdlpPath = ytdlp;
    if (ffmpeg) this.ffmpegPath = ffmpeg;
  }

  public setMaxConcurrentDownloads(limit: number): void {
    this.maxConcurrentDownloads = Math.max(1, limit);
    this.processQueue();
  }

  private detectBinaries(): void {
    if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) {
      this.ytdlpPath = process.env.YTDLP_PATH;
    }
    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
      this.ffmpegPath = process.env.FFMPEG_PATH;
    }
  }

  /**
   * Normalizes video URLs (e.g. converts YouTube /live/ and /shorts/ and query parameters to standard canonical URLs)
   */
  public normalizeUrl(url: string): string {
    const trimmed = url.trim();
    const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
    }
    return trimmed;
  }

  /**
   * Sanitizes a title string for safe cross-platform filesystem filenames
   */
  public sanitizeFilename(name: string): string {
    return name
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/[\x00-\x1f\x80-\x9f]/g, '')
      .trim()
      .substring(0, 200);
  }

  /**
   * Checks for duplicate active or completed task by URL
   */
  public findExistingDownload(url: string): DownloadItem | undefined {
    const normalized = this.normalizeUrl(url);
    for (const task of this.tasks.values()) {
      if ((task.url === url || task.url === normalized) && task.item.status !== 'error') {
        return task.item;
      }
    }
    return undefined;
  }

  /**
   * Extract comprehensive metadata from any supported platform:
   * YouTube (Videos, Shorts, Playlists, Channels, Live Replays), Vimeo, Twitch, Facebook, Instagram, Twitter/X, etc.
   */
  public async extractMetadata(rawUrl: string): Promise<VideoMetadata> {
    const url = this.normalizeUrl(rawUrl);
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-single-json',
        '--no-warnings',
        '--no-call-home',
        '--flat-playlist',
        '--ignore-errors',
        '--skip-download',
        url,
      ];

      Logger.info(`[DownloadService] Extracting metadata: ${this.ytdlpPath} ${args.join(' ')}`);

      const child = spawn(this.ytdlpPath, args, {
        windowsHide: true,
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('error', async (err) => {
        Logger.warn('[DownloadService] yt-dlp spawn error, attempting fallback oEmbed extraction:', err);
        try {
          const fallback = await this.fallbackExtract(url);
          resolve(fallback);
        } catch {
          reject(new Error(`Failed to launch yt-dlp binary: ${err.message}`));
        }
      });

      child.on('close', async (code) => {
        if (code !== 0 && !stdoutData) {
          Logger.warn(`[DownloadService] yt-dlp exit ${code}, trying fallback extraction`);
          try {
            const fallback = await this.fallbackExtract(url);
            resolve(fallback);
            return;
          } catch {
            Logger.error(`[DownloadService] Metadata extraction failed (code ${code}): ${stderrData}`);
            reject(new Error(`Extraction failed: ${stderrData || `Process exited with code ${code}`}`));
            return;
          }
        }

        try {
          const raw = JSON.parse(stdoutData);
          const isPlaylist = raw._type === 'playlist' || Array.isArray(raw.entries);

          const formats = (raw.formats || []).map((f: any) => ({
            id: String(f.format_id || ''),
            resolution: f.resolution || (f.height ? `${f.height}p` : 'Audio Stream'),
            format: f.ext || 'mp4',
            codec: f.vcodec && f.vcodec !== 'none' ? f.vcodec : f.acodec || 'unknown',
            vcodec: f.vcodec,
            acodec: f.acodec,
            filesize: f.filesize || f.filesize_approx || 0,
            fps: f.fps || undefined,
            tbr: f.tbr || undefined,
          }));

          const subtitles = Object.keys(raw.subtitles || {}).map((lang) => ({
            lang,
            name: raw.subtitles[lang]?.[0]?.name || lang,
            ext: raw.subtitles[lang]?.[0]?.ext || 'vtt',
          }));

          const metadata: VideoMetadata = {
            id: raw.id || '',
            title: raw.title || 'Untitled Stream',
            duration: raw.duration || 0,
            formats: formats.length > 0 ? formats : this.getDefaultFormats(),
            thumbnail: raw.thumbnail || (raw.thumbnails && raw.thumbnails[0]?.url) || '',
            author: raw.uploader || raw.channel || raw.creator || raw.extractor_key || 'Unknown Creator',
            fps: raw.fps || undefined,
            description: raw.description || '',
            subtitles,
            isPlaylist,
            playlistCount: isPlaylist ? (raw.entries ? raw.entries.length : raw.playlist_count || 0) : undefined,
            extractor: raw.extractor_key || raw.extractor || 'YouTube',
            webpageUrl: raw.webpage_url || url,
          };

          resolve(metadata);
        } catch (parseErr: any) {
          Logger.warn('[DownloadService] JSON parse error on yt-dlp metadata, attempting fallback:', parseErr);
          this.fallbackExtract(url).then(resolve).catch(reject);
        }
      });
    });
  }

  private async fallbackExtract(url: string): Promise<VideoMetadata> {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    const videoId = ytMatch ? ytMatch[1] : '';

    if (videoId) {
      try {
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (response.ok) {
          const data: any = await response.json();
          return {
            id: videoId,
            title: data.title || 'YouTube Stream',
            duration: 0,
            formats: this.getDefaultFormats(),
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            author: data.author_name || 'YouTube Creator',
            fps: 60,
            description: `YouTube Live/Video stream from ${data.author_name || 'Creator'}.`,
            subtitles: [
              { lang: 'en', name: 'English (Auto-generated)', ext: 'vtt' },
            ],
            extractor: 'YouTube',
            webpageUrl: `https://www.youtube.com/watch?v=${videoId}`,
          };
        }
      } catch (err) {
        Logger.warn('[DownloadService] oEmbed fallback fetch failed', err);
      }
    }

    return {
      id: videoId || 'stream',
      title: videoId ? `YouTube Video [${videoId}]` : 'Extracted Media Stream',
      duration: 0,
      formats: this.getDefaultFormats(),
      thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400',
      author: 'YouTube Stream',
      fps: 60,
      description: 'Stream metadata extracted via fallback pipeline.',
      extractor: 'YouTube',
      webpageUrl: url,
    };
  }

  private getDefaultFormats() {
    return [
      { id: '2160p', resolution: '2160p (4K UHD)', format: 'mp4', codec: 'VP9/AV1', filesize: 3.2 * 1024 * 1024 * 1024, fps: 60 },
      { id: '1440p', resolution: '1440p (2K QHD)', format: 'mp4', codec: 'VP9/AV1', filesize: 1.8 * 1024 * 1024 * 1024, fps: 60 },
      { id: '1080p', resolution: '1080p (Full HD)', format: 'mp4', codec: 'H.264/AVC', filesize: 850 * 1024 * 1024, fps: 60 },
      { id: '720p', resolution: '720p (HD)', format: 'mp4', codec: 'H.264/AVC', filesize: 420 * 1024 * 1024, fps: 60 },
      { id: '480p', resolution: '480p (SD)', format: 'mp4', codec: 'H.264/AVC', filesize: 210 * 1024 * 1024, fps: 30 },
      { id: '360p', resolution: '360p (Compact)', format: 'mp4', codec: 'H.264/AVC', filesize: 110 * 1024 * 1024, fps: 30 },
    ];
  }

  /**
   * Start or queue a download task
   */
  public async startDownload(url: string, options: DownloadOptions = {}): Promise<DownloadItem> {
    // Check duplicate active task
    const existing = this.findExistingDownload(url);
    if (existing && existing.status === 'active') {
      Logger.info(`[DownloadService] Returning existing active task for URL: ${url}`);
      return existing;
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const outputDir = options.outputPath || AppPaths.getDefaultDownloadsPath();

    if (!fs.existsSync(outputDir)) {
      try {
        fs.mkdirSync(outputDir, { recursive: true });
      } catch (err) {
        Logger.warn('[DownloadService] Failed to create output directory:', err);
      }
    }

    const isAudioOnly =
      options.format === 'mp3' ||
      options.format === 'flac' ||
      options.format === 'wav' ||
      options.format === 'm4a' ||
      options.format === 'aac' ||
      options.format === 'opus';

    const category = options.isSpatial ? 'spatial' : isAudioOnly ? 'audio' : 'video';

    const item: DownloadItem = {
      id: taskId,
      title: options.customTitle || 'Initializing Stream Payload...',
      sourceUrl: url,
      thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400',
      progress: 0,
      speed: '0 KB/s',
      speedBytes: 0,
      eta: 'Connecting...',
      etaSeconds: 0,
      resolution: (options.quality as string) || 'Best Available',
      codec: options.format?.toUpperCase() || 'Auto (HEVC/H.264)',
      totalSize: 0,
      downloadedSize: 0,
      status: this.activeDownloadCount >= this.maxConcurrentDownloads ? 'queued' : 'active',
      category,
      addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      chunks: 16,
      completedChunks: 0,
      isSpatialVideo: options.isSpatial || false,
    };

    const taskConfig: DownloadTaskConfig = {
      id: taskId,
      url,
      options: {
        embedThumbnail: true,
        embedMetadata: true,
        downloadSubtitles: false,
        ...options,
      },
      item,
      isPaused: false,
      isCancelled: false,
      retryCount: 0,
      maxRetries: 3,
      startedAtTimestamp: Date.now(),
    };

    this.tasks.set(taskId, taskConfig);
    this.emit('itemAdded', item);

    if (item.status === 'queued') {
      this.queue.push(taskId);
      this.emit('statusChange', { taskId, status: 'queued' });
      this.emitQueueUpdate();
    } else {
      this.activeDownloadCount++;
      this.emit('statusChange', { taskId, status: 'active' });
      this.spawnDownloadProcess(taskConfig, outputDir);
    }

    return item;
  }

  /**
   * Process next item from queue if slots are available
   */
  private processQueue(): void {
    while (this.activeDownloadCount < this.maxConcurrentDownloads && this.queue.length > 0) {
      const nextTaskId = this.queue.shift();
      if (!nextTaskId) break;

      const taskConfig = this.tasks.get(nextTaskId);
      if (taskConfig && !taskConfig.isCancelled && !taskConfig.isPaused) {
        this.activeDownloadCount++;
        taskConfig.item.status = 'active';
        this.emit('statusChange', { taskId: nextTaskId, status: 'active' });
        this.spawnDownloadProcess(
          taskConfig,
          taskConfig.options.outputPath || AppPaths.getDefaultDownloadsPath()
        );
      }
    }
    this.emitQueueUpdate();
  }

  private emitQueueUpdate(): void {
    const queuedItems = this.queue
      .map((id) => this.tasks.get(id)?.item)
      .filter((item): item is DownloadItem => Boolean(item));
    this.emit('queueUpdated', queuedItems);
  }

  /**
   * Build yt-dlp argument flags tailored to quality, format, subtitles, and ffmpeg merging
   */
  private buildYtDlpArgs(taskConfig: DownloadTaskConfig, outputDir: string): string[] {
    const { url, options } = taskConfig;
    const outputTemplate = path.join(outputDir, '%(title)s [%(id)s].%(ext)s');

    const args: string[] = [
      '--newline',
      '--no-colors',
      '--progress',
      '--continue',
      '--no-mtime',
      '--retries', '10',
      '--fragment-retries', '10',
      '--output', outputTemplate,
      '--ffmpeg-location', this.ffmpegPath,
      '--concurrent-fragments', String(options.maxConcurrentThreads || 8),
    ];

    // Format & Quality Selection
    const format = (options.format || '').toLowerCase();
    const quality = options.quality || 'best';

    if (['mp3', 'wav', 'flac', 'm4a', 'aac', 'opus'].includes(format)) {
      args.push('-x', '--audio-format', format);
      if (format === 'mp3' || format === 'm4a') {
        args.push('--audio-quality', options.audioBitrate || '320k');
      }
    } else {
      // Video Quality mappings
      if (quality === '2160p' || quality === '4K') {
        args.push('-f', 'bestvideo[height<=2160]+bestaudio/best[height<=2160]/best');
      } else if (quality === '1440p' || quality === '2K') {
        args.push('-f', 'bestvideo[height<=1440]+bestaudio/best[height<=1440]/best');
      } else if (quality === '1080p') {
        args.push('-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best');
      } else if (quality === '720p') {
        args.push('-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]/best');
      } else if (quality === '480p') {
        args.push('-f', 'bestvideo[height<=480]+bestaudio/best[height<=480]/best');
      } else if (quality === '360p') {
        args.push('-f', 'bestvideo[height<=360]+bestaudio/best[height<=360]/best');
      } else {
        args.push('-f', 'bestvideo+bestaudio/best');
      }

      // Container merge format
      const targetContainer = ['mp4', 'mkv', 'mov', 'webm'].includes(format) ? format : 'mp4';
      args.push('--merge-output-format', targetContainer);
    }

    // Embeddings
    if (options.embedThumbnail !== false) {
      args.push('--embed-thumbnail');
    }
    if (options.embedMetadata !== false) {
      args.push('--embed-metadata');
    }

    // Subtitle Download
    if (options.downloadSubtitles) {
      args.push('--write-subs', '--sub-langs', options.subtitleLanguage || 'all', '--embed-subs');
    }

    // Target URL
    args.push(url);

    return args;
  }

  /**
   * Spawn yt-dlp child process with streaming progress parsing
   */
  private spawnDownloadProcess(taskConfig: DownloadTaskConfig, outputDir: string): void {
    const { id: taskId } = taskConfig;
    const args = this.buildYtDlpArgs(taskConfig, outputDir);

    Logger.info(`[DownloadService] Spawning child process: ${this.ytdlpPath} ${args.join(' ')}`);

    const child = spawn(this.ytdlpPath, args, {
      windowsHide: true,
    });

    taskConfig.process = child;
    let finalOutputPath = outputDir;

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      this.parseProgressOutput(taskId, text, (destination) => {
        if (destination) {
          finalOutputPath = destination;
          taskConfig.targetOutputPath = destination;
          taskConfig.item.outputPath = destination;
        }
      });
    });

    let stderrBuffer = '';
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrBuffer += text;
      Logger.debug(`[DownloadService][${taskId} stderr]: ${text.trim()}`);
    });

    child.on('error', (err) => {
      Logger.error(`[DownloadService][${taskId}] Process error:`, err);
      taskConfig.item.status = 'error';
      taskConfig.item.errorMessage = err.message;
      this.emit('error', { taskId, error: err.message, fatal: true });
      this.emit('statusChange', { taskId, status: 'error' });
      this.cleanupTaskSlot(taskId);
    });

    child.on('close', async (code, signal) => {
      Logger.info(`[DownloadService][${taskId}] Process closed (code ${code}, signal ${signal})`);

      if (taskConfig.isCancelled) {
        taskConfig.item.status = 'error';
        taskConfig.item.errorMessage = 'Download cancelled by user';
        this.emit('statusChange', { taskId, status: 'error' });
        this.cleanupTaskSlot(taskId);
        return;
      }

      if (taskConfig.isPaused) {
        taskConfig.item.status = 'paused';
        this.emit('statusChange', { taskId, status: 'paused' });
        this.cleanupTaskSlot(taskId);
        return;
      }

      if (code === 0) {
        taskConfig.item.status = 'completed';
        taskConfig.item.progress = 100;
        taskConfig.item.speed = '0 KB/s';
        taskConfig.item.speedBytes = 0;
        taskConfig.item.eta = 'Completed';
        taskConfig.item.etaSeconds = 0;
        taskConfig.item.completedChunks = taskConfig.item.chunks;
        taskConfig.item.completedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        taskConfig.item.outputPath = finalOutputPath;

        this.emit('progress', {
          taskId,
          progress: 100,
          speed: '0 KB/s',
          speedBytes: 0,
          eta: 'Completed',
          etaSeconds: 0,
          downloadedBytes: taskConfig.item.totalSize,
          totalBytes: taskConfig.item.totalSize,
          chunks: taskConfig.item.chunks,
          completedChunks: taskConfig.item.chunks,
        });

        // Automatic History recording
        try {
          await HistoryService.getInstance().addToHistory(taskConfig.item);
          Logger.info(`[DownloadService][${taskId}] Recorded completed download in History vault`);
        } catch (histErr) {
          Logger.warn('[DownloadService] Failed to auto-record history:', histErr);
        }

        this.emit('completed', { taskId, item: taskConfig.item, outputPath: finalOutputPath });
        this.emit('statusChange', { taskId, status: 'completed' });
        this.cleanupTaskSlot(taskId);
      } else {
        // Automatic retry logic
        if (taskConfig.retryCount < taskConfig.maxRetries && !taskConfig.isCancelled) {
          taskConfig.retryCount++;
          Logger.warn(`[DownloadService][${taskId}] Retrying failed download (${taskConfig.retryCount}/${taskConfig.maxRetries})...`);
          setTimeout(() => {
            this.spawnDownloadProcess(taskConfig, outputDir);
          }, 2000);
        } else {
          taskConfig.item.status = 'error';
          const errorMsg = stderrBuffer.trim() || `Process exited with code ${code}`;
          taskConfig.item.errorMessage = errorMsg;
          this.emit('error', { taskId, error: errorMsg, fatal: true });
          this.emit('statusChange', { taskId, status: 'error' });
          this.cleanupTaskSlot(taskId);
        }
      }
    });
  }

  private cleanupTaskSlot(taskId: string): void {
    if (this.activeDownloadCount > 0) {
      this.activeDownloadCount--;
    }
    this.processQueue();
  }

  /**
   * Parse stdout text for progress, speed, ETA, chunk distribution, and final destination path
   */
  private parseProgressOutput(taskId: string, output: string, onDestination?: (dest: string) => void): void {
    const taskConfig = this.tasks.get(taskId);
    if (!taskConfig) return;

    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Extract Destination / Merged file path
      if (trimmed.includes('[download] Destination:') || trimmed.includes('[Merger] Merging formats into')) {
        const parts = trimmed.split(/Destination:\s*|into\s*"/);
        if (parts[1]) {
          const destPath = parts[1].replace(/"/g, '').trim();
          if (onDestination) onDestination(destPath);
        }
      }

      // Extract title from filename
      if (trimmed.startsWith('[download] Destination:')) {
        const rawFilename = path.basename(trimmed.substring(23).trim());
        if (rawFilename && (taskConfig.item.title.startsWith('Initializing') || taskConfig.item.title.startsWith('Processing'))) {
          // Remove extension and ID tag
          const cleanTitle = rawFilename.replace(/\s*\[[^\]]+\]\.[^.]+$/, '');
          taskConfig.item.title = cleanTitle || rawFilename;
        }
      }

      // Progress regular expression
      // [download]  45.2% of ~  1.20GiB at  12.45MiB/s ETA 00:45
      const progressMatch = trimmed.match(/\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\s*\w+)\s+at\s+([\d.]+\s*\w+\/s)\s+ETA\s+([\d:]+)/i);

      if (progressMatch) {
        const percent = parseFloat(progressMatch[1]);
        const totalSizeStr = progressMatch[2];
        const speedStr = progressMatch[3];
        const etaStr = progressMatch[4];

        const speedBytes = this.parseSpeedToBytes(speedStr);
        const etaSeconds = this.parseEtaToSeconds(etaStr);
        const totalBytes = this.parseSizeToBytes(totalSizeStr);
        const downloadedBytes = (percent / 100) * (totalBytes || 1);

        const completedChunks = Math.min(
          taskConfig.item.chunks,
          Math.floor((percent / 100) * taskConfig.item.chunks)
        );

        taskConfig.item.progress = percent;
        taskConfig.item.speed = speedStr;
        taskConfig.item.speedBytes = speedBytes;
        taskConfig.item.eta = etaStr;
        taskConfig.item.etaSeconds = etaSeconds;
        taskConfig.item.totalSize = totalBytes || taskConfig.item.totalSize;
        taskConfig.item.downloadedSize = downloadedBytes;
        taskConfig.item.completedChunks = completedChunks;

        this.emit('progress', {
          taskId,
          progress: percent,
          speed: speedStr,
          speedBytes,
          eta: etaStr,
          etaSeconds,
          downloadedBytes,
          totalBytes,
          chunks: taskConfig.item.chunks,
          completedChunks,
        });
      }
    }
  }

  /**
   * Pause active download
   */
  public async pauseDownload(taskId: string): Promise<boolean> {
    const taskConfig = this.tasks.get(taskId);
    if (!taskConfig) return false;

    taskConfig.isPaused = true;
    Logger.info(`[DownloadService] Pausing task ${taskId}`);

    // If queued, remove from queue
    const queueIdx = this.queue.indexOf(taskId);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
      taskConfig.item.status = 'paused';
      this.emit('statusChange', { taskId, status: 'paused' });
      this.emitQueueUpdate();
      return true;
    }

    if (taskConfig.process) {
      if (process.platform !== 'win32') {
        try {
          taskConfig.process.kill('SIGSTOP');
          taskConfig.item.status = 'paused';
          this.emit('statusChange', { taskId, status: 'paused' });
          return true;
        } catch (err) {
          Logger.warn('[DownloadService] SIGSTOP failed, sending graceful interrupt', err);
        }
      }
      taskConfig.process.kill('SIGINT');
    }

    taskConfig.item.status = 'paused';
    this.emit('statusChange', { taskId, status: 'paused' });
    return true;
  }

  /**
   * Resume paused download
   */
  public async resumeDownload(taskId: string): Promise<boolean> {
    const taskConfig = this.tasks.get(taskId);
    if (!taskConfig) return false;

    taskConfig.isPaused = false;
    Logger.info(`[DownloadService] Resuming task ${taskId}`);

    if (taskConfig.process && process.platform !== 'win32') {
      try {
        taskConfig.process.kill('SIGCONT');
        taskConfig.item.status = 'active';
        this.emit('statusChange', { taskId, status: 'active' });
        return true;
      } catch (err) {
        Logger.warn('[DownloadService] SIGCONT failed, creating new resume task', err);
      }
    }

    if (this.activeDownloadCount >= this.maxConcurrentDownloads) {
      taskConfig.item.status = 'queued';
      this.queue.push(taskId);
      this.emit('statusChange', { taskId, status: 'queued' });
      this.emitQueueUpdate();
    } else {
      this.activeDownloadCount++;
      taskConfig.item.status = 'active';
      this.emit('statusChange', { taskId, status: 'active' });
      this.spawnDownloadProcess(
        taskConfig,
        taskConfig.options.outputPath || AppPaths.getDefaultDownloadsPath()
      );
    }

    return true;
  }

  /**
   * Cancel download
   */
  public async cancelDownload(taskId: string): Promise<boolean> {
    const taskConfig = this.tasks.get(taskId);
    if (!taskConfig) return false;

    taskConfig.isCancelled = true;
    Logger.info(`[DownloadService] Cancelling task ${taskId}`);

    const queueIdx = this.queue.indexOf(taskId);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
      this.emitQueueUpdate();
    }

    if (taskConfig.process) {
      taskConfig.process.kill('SIGKILL');
    }

    taskConfig.item.status = 'error';
    taskConfig.item.errorMessage = 'Download cancelled';
    this.emit('statusChange', { taskId, status: 'error' });
    this.tasks.delete(taskId);
    return true;
  }

  /**
   * Retry failed download
   */
  public async retryDownload(taskId: string): Promise<boolean> {
    const taskConfig = this.tasks.get(taskId);
    if (!taskConfig) return false;

    taskConfig.isCancelled = false;
    taskConfig.isPaused = false;
    taskConfig.retryCount = 0;
    taskConfig.item.errorMessage = undefined;

    if (this.activeDownloadCount >= this.maxConcurrentDownloads) {
      taskConfig.item.status = 'queued';
      this.queue.push(taskId);
      this.emit('statusChange', { taskId, status: 'queued' });
      this.emitQueueUpdate();
    } else {
      this.activeDownloadCount++;
      taskConfig.item.status = 'active';
      this.emit('statusChange', { taskId, status: 'active' });
      this.spawnDownloadProcess(
        taskConfig,
        taskConfig.options.outputPath || AppPaths.getDefaultDownloadsPath()
      );
    }

    return true;
  }

  public async getActiveDownloads(): Promise<DownloadItem[]> {
    return Array.from(this.tasks.values()).map((t) => t.item);
  }

  public getTaskConfig(taskId: string): DownloadTaskConfig | undefined {
    return this.tasks.get(taskId);
  }

  // --- Parsing Helpers ---
  private parseSpeedToBytes(speedStr: string): number {
    const clean = speedStr.trim();
    const val = parseFloat(clean);
    if (isNaN(val)) return 0;
    if (clean.includes('GiB/s') || clean.includes('GB/s')) return val * 1024 * 1024 * 1024;
    if (clean.includes('MiB/s') || clean.includes('MB/s')) return val * 1024 * 1024;
    if (clean.includes('KiB/s') || clean.includes('KB/s')) return val * 1024;
    return val;
  }

  private parseSizeToBytes(sizeStr: string): number {
    const clean = sizeStr.trim();
    const val = parseFloat(clean);
    if (isNaN(val)) return 0;
    if (clean.includes('GiB') || clean.includes('GB')) return val * 1024 * 1024 * 1024;
    if (clean.includes('MiB') || clean.includes('MB')) return val * 1024 * 1024;
    if (clean.includes('KiB') || clean.includes('KB')) return val * 1024;
    return val;
  }

  private parseEtaToSeconds(etaStr: string): number {
    const parts = etaStr.split(':').map((p) => parseInt(p, 10));
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }
}
