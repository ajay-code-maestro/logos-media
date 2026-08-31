var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron5 = require("electron");
var import_node_path3 = __toESM(require("node:path"), 1);
var import_promises = __toESM(require("node:fs/promises"), 1);

// electron/ipc/download.ts
var import_electron = require("electron");

// services/DownloadService.ts
var import_node_events = require("node:events");
var import_node_child_process = require("node:child_process");
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);

// utils/logger.ts
var Logger = class {
  static format(level, message, ...args) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }
  static debug(message, ...args) {
    console.debug(this.format("debug", message), ...args);
  }
  static info(message, ...args) {
    console.info(this.format("info", message), ...args);
  }
  static warn(message, ...args) {
    console.warn(this.format("warn", message), ...args);
  }
  static error(message, ...args) {
    console.error(this.format("error", message), ...args);
  }
};

// utils/paths.ts
var import_node_path = __toESM(require("node:path"), 1);
var import_node_os = __toESM(require("node:os"), 1);
var AppPaths = {
  getAppRoot() {
    return process.cwd();
  },
  getUserDataPath() {
    return import_node_path.default.join(import_node_os.default.homedir(), ".logos-media");
  },
  getDefaultDownloadsPath() {
    return import_node_path.default.join(import_node_os.default.homedir(), "Downloads", "LogosMedia");
  },
  getTempPath() {
    return import_node_path.default.join(import_node_os.default.tmpdir(), "logos-media-temp");
  },
  getLogPath() {
    return import_node_path.default.join(this.getUserDataPath(), "logs");
  },
  getPreloadPath() {
    return import_node_path.default.join(__dirname, "preload.cjs");
  }
};

// services/HistoryService.ts
var HistoryService = class _HistoryService {
  constructor() {
    this.history = [];
  }
  static getInstance() {
    if (!_HistoryService.instance) {
      _HistoryService.instance = new _HistoryService();
    }
    return _HistoryService.instance;
  }
  async getHistory() {
    return [...this.history];
  }
  async addToHistory(item) {
    this.history.unshift(item);
  }
  async removeFromHistory(id) {
    const prevLen = this.history.length;
    this.history = this.history.filter((i) => i.id !== id);
    return this.history.length < prevLen;
  }
  async clearHistory() {
    this.history = [];
  }
};

// services/DownloadService.ts
var DownloadService = class _DownloadService extends import_node_events.EventEmitter {
  constructor() {
    super();
    // Active tasks and pending download queue
    this.tasks = /* @__PURE__ */ new Map();
    this.queue = [];
    this.activeDownloadCount = 0;
    this.maxConcurrentDownloads = 3;
    // Binary configuration
    this.ytdlpPath = "yt-dlp";
    this.ffmpegPath = "ffmpeg";
    this.detectBinaries();
  }
  static getInstance() {
    if (!_DownloadService.instance) {
      _DownloadService.instance = new _DownloadService();
    }
    return _DownloadService.instance;
  }
  setBinaryPaths(ytdlp, ffmpeg) {
    if (ytdlp) this.ytdlpPath = ytdlp;
    if (ffmpeg) this.ffmpegPath = ffmpeg;
  }
  setMaxConcurrentDownloads(limit) {
    this.maxConcurrentDownloads = Math.max(1, limit);
    this.processQueue();
  }
  detectBinaries() {
    if (process.env.YTDLP_PATH && import_node_fs.default.existsSync(process.env.YTDLP_PATH)) {
      this.ytdlpPath = process.env.YTDLP_PATH;
    }
    if (process.env.FFMPEG_PATH && import_node_fs.default.existsSync(process.env.FFMPEG_PATH)) {
      this.ffmpegPath = process.env.FFMPEG_PATH;
    }
  }
  /**
   * Normalizes video URLs (e.g. converts YouTube /live/ and /shorts/ and query parameters to standard canonical URLs)
   */
  normalizeUrl(url) {
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
  sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, "_").replace(/[\x00-\x1f\x80-\x9f]/g, "").trim().substring(0, 200);
  }
  /**
   * Checks for duplicate active or completed task by URL
   */
  findExistingDownload(url) {
    const normalized = this.normalizeUrl(url);
    for (const task of this.tasks.values()) {
      if ((task.url === url || task.url === normalized) && task.item.status !== "error") {
        return task.item;
      }
    }
    return void 0;
  }
  /**
   * Extract comprehensive metadata from any supported platform:
   * YouTube (Videos, Shorts, Playlists, Channels, Live Replays), Vimeo, Twitch, Facebook, Instagram, Twitter/X, etc.
   */
  async extractMetadata(rawUrl) {
    const url = this.normalizeUrl(rawUrl);
    return new Promise((resolve, reject) => {
      const args = [
        "--dump-single-json",
        "--no-warnings",
        "--no-call-home",
        "--flat-playlist",
        "--ignore-errors",
        "--skip-download",
        url
      ];
      Logger.info(`[DownloadService] Extracting metadata: ${this.ytdlpPath} ${args.join(" ")}`);
      const child = (0, import_node_child_process.spawn)(this.ytdlpPath, args, {
        windowsHide: true
      });
      let stdoutData = "";
      let stderrData = "";
      child.stdout.on("data", (chunk) => {
        stdoutData += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderrData += chunk.toString();
      });
      child.on("error", async (err) => {
        Logger.warn("[DownloadService] yt-dlp spawn error, attempting fallback oEmbed extraction:", err);
        try {
          const fallback = await this.fallbackExtract(url);
          resolve(fallback);
        } catch {
          reject(new Error(`Failed to launch yt-dlp binary: ${err.message}`));
        }
      });
      child.on("close", async (code) => {
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
          const isPlaylist = raw._type === "playlist" || Array.isArray(raw.entries);
          const formats = (raw.formats || []).map((f) => ({
            id: String(f.format_id || ""),
            resolution: f.resolution || (f.height ? `${f.height}p` : "Audio Stream"),
            format: f.ext || "mp4",
            codec: f.vcodec && f.vcodec !== "none" ? f.vcodec : f.acodec || "unknown",
            vcodec: f.vcodec,
            acodec: f.acodec,
            filesize: f.filesize || f.filesize_approx || 0,
            fps: f.fps || void 0,
            tbr: f.tbr || void 0
          }));
          const subtitles = Object.keys(raw.subtitles || {}).map((lang) => ({
            lang,
            name: raw.subtitles[lang]?.[0]?.name || lang,
            ext: raw.subtitles[lang]?.[0]?.ext || "vtt"
          }));
          const metadata = {
            id: raw.id || "",
            title: raw.title || "Untitled Stream",
            duration: raw.duration || 0,
            formats: formats.length > 0 ? formats : this.getDefaultFormats(),
            thumbnail: raw.thumbnail || raw.thumbnails && raw.thumbnails[0]?.url || "",
            author: raw.uploader || raw.channel || raw.creator || raw.extractor_key || "Unknown Creator",
            fps: raw.fps || void 0,
            description: raw.description || "",
            subtitles,
            isPlaylist,
            playlistCount: isPlaylist ? raw.entries ? raw.entries.length : raw.playlist_count || 0 : void 0,
            extractor: raw.extractor_key || raw.extractor || "YouTube",
            webpageUrl: raw.webpage_url || url
          };
          resolve(metadata);
        } catch (parseErr) {
          Logger.warn("[DownloadService] JSON parse error on yt-dlp metadata, attempting fallback:", parseErr);
          this.fallbackExtract(url).then(resolve).catch(reject);
        }
      });
    });
  }
  async fallbackExtract(url) {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    const videoId = ytMatch ? ytMatch[1] : "";
    if (videoId) {
      try {
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (response.ok) {
          const data = await response.json();
          return {
            id: videoId,
            title: data.title || "YouTube Stream",
            duration: 0,
            formats: this.getDefaultFormats(),
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            author: data.author_name || "YouTube Creator",
            fps: 60,
            description: `YouTube Live/Video stream from ${data.author_name || "Creator"}.`,
            subtitles: [
              { lang: "en", name: "English (Auto-generated)", ext: "vtt" }
            ],
            extractor: "YouTube",
            webpageUrl: `https://www.youtube.com/watch?v=${videoId}`
          };
        }
      } catch (err) {
        Logger.warn("[DownloadService] oEmbed fallback fetch failed", err);
      }
    }
    return {
      id: videoId || "stream",
      title: videoId ? `YouTube Video [${videoId}]` : "Extracted Media Stream",
      duration: 0,
      formats: this.getDefaultFormats(),
      thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400",
      author: "YouTube Stream",
      fps: 60,
      description: "Stream metadata extracted via fallback pipeline.",
      extractor: "YouTube",
      webpageUrl: url
    };
  }
  getDefaultFormats() {
    return [
      { id: "2160p", resolution: "2160p (4K UHD)", format: "mp4", codec: "VP9/AV1", filesize: 3.2 * 1024 * 1024 * 1024, fps: 60 },
      { id: "1440p", resolution: "1440p (2K QHD)", format: "mp4", codec: "VP9/AV1", filesize: 1.8 * 1024 * 1024 * 1024, fps: 60 },
      { id: "1080p", resolution: "1080p (Full HD)", format: "mp4", codec: "H.264/AVC", filesize: 850 * 1024 * 1024, fps: 60 },
      { id: "720p", resolution: "720p (HD)", format: "mp4", codec: "H.264/AVC", filesize: 420 * 1024 * 1024, fps: 60 },
      { id: "480p", resolution: "480p (SD)", format: "mp4", codec: "H.264/AVC", filesize: 210 * 1024 * 1024, fps: 30 },
      { id: "360p", resolution: "360p (Compact)", format: "mp4", codec: "H.264/AVC", filesize: 110 * 1024 * 1024, fps: 30 }
    ];
  }
  /**
   * Start or queue a download task
   */
  async startDownload(url, options = {}) {
    const existing = this.findExistingDownload(url);
    if (existing && existing.status === "active") {
      Logger.info(`[DownloadService] Returning existing active task for URL: ${url}`);
      return existing;
    }
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const outputDir = options.outputPath || AppPaths.getDefaultDownloadsPath();
    if (!import_node_fs.default.existsSync(outputDir)) {
      try {
        import_node_fs.default.mkdirSync(outputDir, { recursive: true });
      } catch (err) {
        Logger.warn("[DownloadService] Failed to create output directory:", err);
      }
    }
    const isAudioOnly = options.format === "mp3" || options.format === "flac" || options.format === "wav" || options.format === "m4a" || options.format === "aac" || options.format === "opus";
    const category = options.isSpatial ? "spatial" : isAudioOnly ? "audio" : "video";
    const item = {
      id: taskId,
      title: options.customTitle || "Initializing Stream Payload...",
      sourceUrl: url,
      thumb: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400",
      progress: 0,
      speed: "0 KB/s",
      speedBytes: 0,
      eta: "Connecting...",
      etaSeconds: 0,
      resolution: options.quality || "Best Available",
      codec: options.format?.toUpperCase() || "Auto (HEVC/H.264)",
      totalSize: 0,
      downloadedSize: 0,
      status: this.activeDownloadCount >= this.maxConcurrentDownloads ? "queued" : "active",
      category,
      addedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      chunks: 16,
      completedChunks: 0,
      isSpatialVideo: options.isSpatial || false
    };
    const taskConfig = {
      id: taskId,
      url,
      options: {
        embedThumbnail: true,
        embedMetadata: true,
        downloadSubtitles: false,
        ...options
      },
      item,
      isPaused: false,
      isCancelled: false,
      retryCount: 0,
      maxRetries: 3,
      startedAtTimestamp: Date.now()
    };
    this.tasks.set(taskId, taskConfig);
    this.emit("itemAdded", item);
    if (item.status === "queued") {
      this.queue.push(taskId);
      this.emit("statusChange", { taskId, status: "queued" });
      this.emitQueueUpdate();
    } else {
      this.activeDownloadCount++;
      this.emit("statusChange", { taskId, status: "active" });
      this.spawnDownloadProcess(taskConfig, outputDir);
    }
    return item;
  }
  /**
   * Process next item from queue if slots are available
   */
  processQueue() {
    while (this.activeDownloadCount < this.maxConcurrentDownloads && this.queue.length > 0) {
      const nextTaskId = this.queue.shift();
      if (!nextTaskId) break;
      const taskConfig = this.tasks.get(nextTaskId);
      if (taskConfig && !taskConfig.isCancelled && !taskConfig.isPaused) {
        this.activeDownloadCount++;
        taskConfig.item.status = "active";
        this.emit("statusChange", { taskId: nextTaskId, status: "active" });
        this.spawnDownloadProcess(
          taskConfig,
          taskConfig.options.outputPath || AppPaths.getDefaultDownloadsPath()
        );
      }
    }
    this.emitQueueUpdate();
  }
  emitQueueUpdate() {
    const queuedItems = this.queue.map((id) => this.tasks.get(id)?.item).filter((item) => Boolean(item));
    this.emit("queueUpdated", queuedItems);
  }
  /**
   * Build yt-dlp argument flags tailored to quality, format, subtitles, and ffmpeg merging
   */
  buildYtDlpArgs(taskConfig, outputDir) {
    const { url, options } = taskConfig;
    const outputTemplate = import_node_path2.default.join(outputDir, "%(title)s [%(id)s].%(ext)s");
    const args = [
      "--newline",
      "--no-colors",
      "--progress",
      "--continue",
      "--no-mtime",
      "--retries",
      "10",
      "--fragment-retries",
      "10",
      "--output",
      outputTemplate,
      "--ffmpeg-location",
      this.ffmpegPath,
      "--concurrent-fragments",
      String(options.maxConcurrentThreads || 8)
    ];
    const format = (options.format || "").toLowerCase();
    const quality = options.quality || "best";
    if (["mp3", "wav", "flac", "m4a", "aac", "opus"].includes(format)) {
      args.push("-x", "--audio-format", format);
      if (format === "mp3" || format === "m4a") {
        args.push("--audio-quality", options.audioBitrate || "320k");
      }
    } else {
      if (quality === "2160p" || quality === "4K") {
        args.push("-f", "bestvideo[height<=2160]+bestaudio/best[height<=2160]/best");
      } else if (quality === "1440p" || quality === "2K") {
        args.push("-f", "bestvideo[height<=1440]+bestaudio/best[height<=1440]/best");
      } else if (quality === "1080p") {
        args.push("-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best");
      } else if (quality === "720p") {
        args.push("-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best");
      } else if (quality === "480p") {
        args.push("-f", "bestvideo[height<=480]+bestaudio/best[height<=480]/best");
      } else if (quality === "360p") {
        args.push("-f", "bestvideo[height<=360]+bestaudio/best[height<=360]/best");
      } else {
        args.push("-f", "bestvideo+bestaudio/best");
      }
      const targetContainer = ["mp4", "mkv", "mov", "webm"].includes(format) ? format : "mp4";
      args.push("--merge-output-format", targetContainer);
    }
    if (options.embedThumbnail !== false) {
      args.push("--embed-thumbnail");
    }
    if (options.embedMetadata !== false) {
      args.push("--embed-metadata");
    }
    if (options.downloadSubtitles) {
      args.push("--write-subs", "--sub-langs", options.subtitleLanguage || "all", "--embed-subs");
    }
    args.push(url);
    return args;
  }
  /**
   * Spawn yt-dlp child process with streaming progress parsing
   */
  spawnDownloadProcess(taskConfig, outputDir) {
    const { id: taskId } = taskConfig;
    const args = this.buildYtDlpArgs(taskConfig, outputDir);
    Logger.info(`[DownloadService] Spawning child process: ${this.ytdlpPath} ${args.join(" ")}`);
    const child = (0, import_node_child_process.spawn)(this.ytdlpPath, args, {
      windowsHide: true
    });
    taskConfig.process = child;
    let finalOutputPath = outputDir;
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      this.parseProgressOutput(taskId, text, (destination) => {
        if (destination) {
          finalOutputPath = destination;
          taskConfig.targetOutputPath = destination;
          taskConfig.item.outputPath = destination;
        }
      });
    });
    let stderrBuffer = "";
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrBuffer += text;
      Logger.debug(`[DownloadService][${taskId} stderr]: ${text.trim()}`);
    });
    child.on("error", (err) => {
      Logger.error(`[DownloadService][${taskId}] Process error:`, err);
      taskConfig.item.status = "error";
      taskConfig.item.errorMessage = err.message;
      this.emit("error", { taskId, error: err.message, fatal: true });
      this.emit("statusChange", { taskId, status: "error" });
      this.cleanupTaskSlot(taskId);
    });
    child.on("close", async (code, signal) => {
      Logger.info(`[DownloadService][${taskId}] Process closed (code ${code}, signal ${signal})`);
      if (taskConfig.isCancelled) {
        taskConfig.item.status = "error";
        taskConfig.item.errorMessage = "Download cancelled by user";
        this.emit("statusChange", { taskId, status: "error" });
        this.cleanupTaskSlot(taskId);
        return;
      }
      if (taskConfig.isPaused) {
        taskConfig.item.status = "paused";
        this.emit("statusChange", { taskId, status: "paused" });
        this.cleanupTaskSlot(taskId);
        return;
      }
      if (code === 0) {
        taskConfig.item.status = "completed";
        taskConfig.item.progress = 100;
        taskConfig.item.speed = "0 KB/s";
        taskConfig.item.speedBytes = 0;
        taskConfig.item.eta = "Completed";
        taskConfig.item.etaSeconds = 0;
        taskConfig.item.completedChunks = taskConfig.item.chunks;
        taskConfig.item.completedAt = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        taskConfig.item.outputPath = finalOutputPath;
        this.emit("progress", {
          taskId,
          progress: 100,
          speed: "0 KB/s",
          speedBytes: 0,
          eta: "Completed",
          etaSeconds: 0,
          downloadedBytes: taskConfig.item.totalSize,
          totalBytes: taskConfig.item.totalSize,
          chunks: taskConfig.item.chunks,
          completedChunks: taskConfig.item.chunks
        });
        try {
          await HistoryService.getInstance().addToHistory(taskConfig.item);
          Logger.info(`[DownloadService][${taskId}] Recorded completed download in History vault`);
        } catch (histErr) {
          Logger.warn("[DownloadService] Failed to auto-record history:", histErr);
        }
        this.emit("completed", { taskId, item: taskConfig.item, outputPath: finalOutputPath });
        this.emit("statusChange", { taskId, status: "completed" });
        this.cleanupTaskSlot(taskId);
      } else {
        if (taskConfig.retryCount < taskConfig.maxRetries && !taskConfig.isCancelled) {
          taskConfig.retryCount++;
          Logger.warn(`[DownloadService][${taskId}] Retrying failed download (${taskConfig.retryCount}/${taskConfig.maxRetries})...`);
          setTimeout(() => {
            this.spawnDownloadProcess(taskConfig, outputDir);
          }, 2e3);
        } else {
          taskConfig.item.status = "error";
          const errorMsg = stderrBuffer.trim() || `Process exited with code ${code}`;
          taskConfig.item.errorMessage = errorMsg;
          this.emit("error", { taskId, error: errorMsg, fatal: true });
          this.emit("statusChange", { taskId, status: "error" });
          this.cleanupTaskSlot(taskId);
        }
      }
    });
  }
  cleanupTaskSlot(taskId) {
    if (this.activeDownloadCount > 0) {
      this.activeDownloadCount--;
    }
    this.processQueue();
  }
  /**
   * Parse stdout text for progress, speed, ETA, chunk distribution, and final destination path
   */
  parseProgressOutput(taskId, output, onDestination) {
    const taskConfig = this.tasks.get(taskId);
    if (!taskConfig) return;
    const lines = output.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.includes("[download] Destination:") || trimmed.includes("[Merger] Merging formats into")) {
        const parts = trimmed.split(/Destination:\s*|into\s*"/);
        if (parts[1]) {
          const destPath = parts[1].replace(/"/g, "").trim();
          if (onDestination) onDestination(destPath);
        }
      }
      if (trimmed.startsWith("[download] Destination:")) {
        const rawFilename = import_node_path2.default.basename(trimmed.substring(23).trim());
        if (rawFilename && (taskConfig.item.title.startsWith("Initializing") || taskConfig.item.title.startsWith("Processing"))) {
          const cleanTitle = rawFilename.replace(/\s*\[[^\]]+\]\.[^.]+$/, "");
          taskConfig.item.title = cleanTitle || rawFilename;
        }
      }
      const progressMatch = trimmed.match(/\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\s*\w+)\s+at\s+([\d.]+\s*\w+\/s)\s+ETA\s+([\d:]+)/i);
      if (progressMatch) {
        const percent = parseFloat(progressMatch[1]);
        const totalSizeStr = progressMatch[2];
        const speedStr = progressMatch[3];
        const etaStr = progressMatch[4];
        const speedBytes = this.parseSpeedToBytes(speedStr);
        const etaSeconds = this.parseEtaToSeconds(etaStr);
        const totalBytes = this.parseSizeToBytes(totalSizeStr);
        const downloadedBytes = percent / 100 * (totalBytes || 1);
        const completedChunks = Math.min(
          taskConfig.item.chunks,
          Math.floor(percent / 100 * taskConfig.item.chunks)
        );
        taskConfig.item.progress = percent;
        taskConfig.item.speed = speedStr;
        taskConfig.item.speedBytes = speedBytes;
        taskConfig.item.eta = etaStr;
        taskConfig.item.etaSeconds = etaSeconds;
        taskConfig.item.totalSize = totalBytes || taskConfig.item.totalSize;
        taskConfig.item.downloadedSize = downloadedBytes;
        taskConfig.item.completedChunks = completedChunks;
        this.emit("progress", {
          taskId,
          progress: percent,
          speed: speedStr,
          speedBytes,
          eta: etaStr,
          etaSeconds,
          downloadedBytes,
          totalBytes,
          chunks: taskConfig.item.chunks,
          completedChunks
        });
      }
    }
  }
  /**
   * Pause active download
   */
  async pauseDownload(taskId) {
    const taskConfig = this.tasks.get(taskId);
    if (!taskConfig) return false;
    taskConfig.isPaused = true;
    Logger.info(`[DownloadService] Pausing task ${taskId}`);
    const queueIdx = this.queue.indexOf(taskId);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
      taskConfig.item.status = "paused";
      this.emit("statusChange", { taskId, status: "paused" });
      this.emitQueueUpdate();
      return true;
    }
    if (taskConfig.process) {
      if (process.platform !== "win32") {
        try {
          taskConfig.process.kill("SIGSTOP");
          taskConfig.item.status = "paused";
          this.emit("statusChange", { taskId, status: "paused" });
          return true;
        } catch (err) {
          Logger.warn("[DownloadService] SIGSTOP failed, sending graceful interrupt", err);
        }
      }
      taskConfig.process.kill("SIGINT");
    }
    taskConfig.item.status = "paused";
    this.emit("statusChange", { taskId, status: "paused" });
    return true;
  }
  /**
   * Resume paused download
   */
  async resumeDownload(taskId) {
    const taskConfig = this.tasks.get(taskId);
    if (!taskConfig) return false;
    taskConfig.isPaused = false;
    Logger.info(`[DownloadService] Resuming task ${taskId}`);
    if (taskConfig.process && process.platform !== "win32") {
      try {
        taskConfig.process.kill("SIGCONT");
        taskConfig.item.status = "active";
        this.emit("statusChange", { taskId, status: "active" });
        return true;
      } catch (err) {
        Logger.warn("[DownloadService] SIGCONT failed, creating new resume task", err);
      }
    }
    if (this.activeDownloadCount >= this.maxConcurrentDownloads) {
      taskConfig.item.status = "queued";
      this.queue.push(taskId);
      this.emit("statusChange", { taskId, status: "queued" });
      this.emitQueueUpdate();
    } else {
      this.activeDownloadCount++;
      taskConfig.item.status = "active";
      this.emit("statusChange", { taskId, status: "active" });
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
  async cancelDownload(taskId) {
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
      taskConfig.process.kill("SIGKILL");
    }
    taskConfig.item.status = "error";
    taskConfig.item.errorMessage = "Download cancelled";
    this.emit("statusChange", { taskId, status: "error" });
    this.tasks.delete(taskId);
    return true;
  }
  /**
   * Retry failed download
   */
  async retryDownload(taskId) {
    const taskConfig = this.tasks.get(taskId);
    if (!taskConfig) return false;
    taskConfig.isCancelled = false;
    taskConfig.isPaused = false;
    taskConfig.retryCount = 0;
    taskConfig.item.errorMessage = void 0;
    if (this.activeDownloadCount >= this.maxConcurrentDownloads) {
      taskConfig.item.status = "queued";
      this.queue.push(taskId);
      this.emit("statusChange", { taskId, status: "queued" });
      this.emitQueueUpdate();
    } else {
      this.activeDownloadCount++;
      taskConfig.item.status = "active";
      this.emit("statusChange", { taskId, status: "active" });
      this.spawnDownloadProcess(
        taskConfig,
        taskConfig.options.outputPath || AppPaths.getDefaultDownloadsPath()
      );
    }
    return true;
  }
  async getActiveDownloads() {
    return Array.from(this.tasks.values()).map((t) => t.item);
  }
  getTaskConfig(taskId) {
    return this.tasks.get(taskId);
  }
  // --- Parsing Helpers ---
  parseSpeedToBytes(speedStr) {
    const clean = speedStr.trim();
    const val = parseFloat(clean);
    if (isNaN(val)) return 0;
    if (clean.includes("GiB/s") || clean.includes("GB/s")) return val * 1024 * 1024 * 1024;
    if (clean.includes("MiB/s") || clean.includes("MB/s")) return val * 1024 * 1024;
    if (clean.includes("KiB/s") || clean.includes("KB/s")) return val * 1024;
    return val;
  }
  parseSizeToBytes(sizeStr) {
    const clean = sizeStr.trim();
    const val = parseFloat(clean);
    if (isNaN(val)) return 0;
    if (clean.includes("GiB") || clean.includes("GB")) return val * 1024 * 1024 * 1024;
    if (clean.includes("MiB") || clean.includes("MB")) return val * 1024 * 1024;
    if (clean.includes("KiB") || clean.includes("KB")) return val * 1024;
    return val;
  }
  parseEtaToSeconds(etaStr) {
    const parts = etaStr.split(":").map((p) => parseInt(p, 10));
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }
};

// electron/ipc/download.ts
function registerDownloadIPC() {
  const downloadService = DownloadService.getInstance();
  import_electron.ipcMain.handle("download:start", async (_event, url, options) => {
    try {
      Logger.info(`[IPC] download:start requested for ${url}`);
      return await downloadService.startDownload(url, options);
    } catch (err) {
      Logger.error("[IPC] download:start failed", err);
      throw err;
    }
  });
  import_electron.ipcMain.handle("download:pause", async (_event, taskId) => {
    Logger.info(`[IPC] download:pause for task ${taskId}`);
    return await downloadService.pauseDownload(taskId);
  });
  import_electron.ipcMain.handle("download:resume", async (_event, taskId) => {
    Logger.info(`[IPC] download:resume for task ${taskId}`);
    return await downloadService.resumeDownload(taskId);
  });
  import_electron.ipcMain.handle("download:cancel", async (_event, taskId) => {
    Logger.info(`[IPC] download:cancel for task ${taskId}`);
    return await downloadService.cancelDownload(taskId);
  });
  import_electron.ipcMain.handle("download:retry", async (_event, taskId) => {
    Logger.info(`[IPC] download:retry for task ${taskId}`);
    return await downloadService.retryDownload(taskId);
  });
  import_electron.ipcMain.handle("download:getActive", async () => {
    return await downloadService.getActiveDownloads();
  });
}

// electron/ipc/metadata.ts
var import_electron2 = require("electron");

// services/MetadataService.ts
var MetadataService = class _MetadataService {
  constructor() {
  }
  static getInstance() {
    if (!_MetadataService.instance) {
      _MetadataService.instance = new _MetadataService();
    }
    return _MetadataService.instance;
  }
  async extractMetadata(url) {
    return DownloadService.getInstance().extractMetadata(url);
  }
};

// electron/ipc/metadata.ts
function registerMetadataIPC() {
  const metadataService = MetadataService.getInstance();
  import_electron2.ipcMain.handle("metadata:extract", async (_event, url) => {
    try {
      Logger.info(`[IPC] metadata:extract requested for ${url}`);
      return await metadataService.extractMetadata(url);
    } catch (err) {
      Logger.error(`[IPC] metadata:extract failed for ${url}`, err);
      throw err;
    }
  });
}

// electron/ipc/history.ts
var import_electron3 = require("electron");
function registerHistoryIPC() {
  const historyService = HistoryService.getInstance();
  import_electron3.ipcMain.handle("history:get", async () => {
    return await historyService.getHistory();
  });
  import_electron3.ipcMain.handle("history:add", async (_event, item) => {
    Logger.info(`[IPC] history:add for item ${item.id}`);
    await historyService.addToHistory(item);
    return true;
  });
  import_electron3.ipcMain.handle("history:remove", async (_event, id) => {
    Logger.info(`[IPC] history:remove for item ${id}`);
    return await historyService.removeFromHistory(id);
  });
  import_electron3.ipcMain.handle("history:clear", async () => {
    Logger.info("[IPC] history:clear requested");
    await historyService.clearHistory();
    return true;
  });
}

// electron/ipc/settings.ts
var import_electron4 = require("electron");

// services/SettingsService.ts
var SettingsService = class _SettingsService {
  constructor() {
    this.settings = {
      blurIntensity: "ultra",
      frostOpacity: 6,
      edgeLuminance: 30,
      ambientTheme: "aurora",
      ambientMovement: true,
      springPhysics: true,
      soundEffects: true,
      glowIntensity: 80
    };
  }
  static getInstance() {
    if (!_SettingsService.instance) {
      _SettingsService.instance = new _SettingsService();
    }
    return _SettingsService.instance;
  }
  async getSettings() {
    return { ...this.settings };
  }
  async saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    return { ...this.settings };
  }
};

// electron/ipc/settings.ts
function registerSettingsIPC() {
  const settingsService = SettingsService.getInstance();
  import_electron4.ipcMain.handle("settings:get", async () => {
    return await settingsService.getSettings();
  });
  import_electron4.ipcMain.handle("settings:save", async (_event, settings) => {
    Logger.info("[IPC] settings:save requested");
    return await settingsService.saveSettings(settings);
  });
}

// electron/main.ts
var mainWindow = null;
var isDev = process.env.NODE_ENV !== "production" && !import_electron5.app.isPackaged;
function createMainWindow() {
  Logger.info(`Initializing Logos Media Window (isDev: ${isDev})`);
  const win = new import_electron5.BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    title: "Logos Media",
    titleBarStyle: "hiddenInset",
    vibrancy: "under-window",
    visualEffectState: "active",
    backgroundColor: "#0a0a0a",
    show: false,
    webPreferences: {
      preload: import_node_path3.default.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  win.once("ready-to-show", () => {
    win.show();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:") || url.startsWith("http:")) {
      import_electron5.shell.openExternal(url);
    }
    return { action: "deny" };
  });
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
    win.loadURL(devServerUrl).catch((err) => {
      Logger.error("Failed to load dev server URL, falling back to dist", err);
      win.loadFile(import_node_path3.default.join(__dirname, "../dist/index.html"));
    });
  } else {
    win.loadFile(import_node_path3.default.join(__dirname, "../dist/index.html"));
  }
  return win;
}
function registerAllIPC() {
  registerDownloadIPC();
  registerMetadataIPC();
  registerHistoryIPC();
  registerSettingsIPC();
  import_electron5.ipcMain.handle("media:export", async (_event, taskId, suggestedFilename) => {
    const item = DownloadService.getInstance().getTaskConfig(taskId)?.item;
    if (!item?.outputPath) {
      throw new Error("The completed media file is no longer available to export.");
    }
    try {
      await import_promises.default.access(item.outputPath);
    } catch {
      throw new Error("The completed media file could not be found.");
    }
    const { canceled, filePath } = await import_electron5.dialog.showSaveDialog({
      title: "Save downloaded media",
      defaultPath: import_node_path3.default.join(import_electron5.app.getPath("downloads"), suggestedFilename),
      buttonLabel: "Save video",
      filters: [{ name: "Media files", extensions: ["mp4", "mkv", "mov", "webm", "mp3", "m4a", "wav", "flac", "aac", "opus"] }]
    });
    if (canceled || !filePath) return { canceled: true };
    await import_promises.default.copyFile(item.outputPath, filePath);
    return { canceled: false, filePath };
  });
  const downloadService = DownloadService.getInstance();
  downloadService.on("progress", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("download:progress", data);
    }
  });
  Logger.info("All Electron IPC handlers registered successfully.");
}
import_electron5.app.whenReady().then(() => {
  registerAllIPC();
  mainWindow = createMainWindow();
  import_electron5.app.on("activate", () => {
    if (import_electron5.BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});
import_electron5.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron5.app.quit();
  }
});
