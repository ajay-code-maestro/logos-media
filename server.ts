import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// In-memory media store mapping task IDs to local media files
interface MediaItem {
  id: string;
  title: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  createdAt: number;
}

const mediaStore = new Map<string, MediaItem>();

type BrowserDownloadStatus = 'active' | 'paused' | 'completed' | 'error';

interface BrowserDownloadJob {
  id: string;
  title: string;
  filename: string;
  filePath: string;
  mimeType: string;
  thumbnailUrl?: string;
  status: BrowserDownloadStatus;
  progress: number;
  speed: string;
  speedBytes: number;
  eta: string;
  etaSeconds: number;
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
  process?: ChildProcess;
  isCancelled: boolean;
}

const browserDownloads = new Map<string, BrowserDownloadJob>();

function getYtDlpPath(): string {
  if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;

  // GUI-launched applications do not always inherit a shell PATH on macOS.
  // Check the common installation locations before falling back to PATH.
  for (const candidate of ['/opt/homebrew/bin/yt-dlp', '/usr/local/bin/yt-dlp']) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return process.env.YTDLP_PATH || 'yt-dlp';
}

// Helper to sanitize filenames for cross-platform OS & Mac QuickTime
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 80);
}

function parseSize(value: string): number {
  const match = value.trim().match(/^([\d.]+)\s*([KMGTPE]?i?B)$/i);
  if (!match) return 0;
  const amount = Number.parseFloat(match[1]);
  const unit = match[2].toUpperCase().replace('IB', 'B');
  const power = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'].indexOf(unit);
  return power < 0 ? 0 : Math.round(amount * 1024 ** power);
}

function parseEta(value: string): number {
  const parts = value.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((seconds, part) => seconds * 60 + part, 0);
}

function publicDownloadJob(job: BrowserDownloadJob) {
  const { process: _process, isCancelled: _isCancelled, ...publicJob } = job;
  return publicJob;
}

function updateDownloadProgress(job: BrowserDownloadJob, output: string): void {
  for (const line of output.split('\n')) {
    // yt-dlp: [download]  23.4% of  18.22MiB at  2.10MiB/s ETA 00:07
    const match = line.match(/\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\s*[KMGTPE]?i?B)(?:\s+at\s+([\d.]+\s*[KMGTPE]?i?B\/s))?(?:\s+ETA\s+([\d:]+))?/i);
    if (!match) continue;

    const progress = Number.parseFloat(match[1]);
    const totalBytes = parseSize(match[2]);
    const speed = match[3] || 'Finalizing…';
    const speedBytes = match[3] ? parseSize(match[3].replace(/\/s$/i, '')) : 0;
    const eta = match[4] || (progress >= 100 ? 'Finalizing…' : 'Calculating…');

    job.progress = Number.isFinite(progress) ? progress : job.progress;
    job.totalBytes = totalBytes || job.totalBytes;
    job.downloadedBytes = job.totalBytes ? Math.round((job.progress / 100) * job.totalBytes) : job.downloadedBytes;
    job.speed = speed;
    job.speedBytes = speedBytes;
    job.eta = eta;
    job.etaSeconds = match[4] ? parseEta(match[4]) : 0;
  }
}

function startBrowserDownload({
  id,
  title,
  sourceUrl,
  thumb,
  format = 'mp4',
  resolution = '720p',
}: Record<string, string>): BrowserDownloadJob {
  const safeTitle = sanitizeFilename(title);
  const isAudio = ['mp3', 'aac', 'wav', 'm4a', 'flac', 'opus'].includes(format.toLowerCase());
  const ext = isAudio ? 'mp3' : 'mp4';
  const filename = `${safeTitle}.${ext}`;
  const targetPath = path.join(DOWNLOADS_DIR, `${id}.${ext}`);
  const maxHeight = /^\d{3,4}p$/.test(resolution) ? resolution.slice(0, -1) : '720';
  const args = isAudio
    ? [
        '--no-playlist', '--newline', '--no-colors', '--progress', '--retries', '3', '--fragment-retries', '3',
        '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0', '--output', targetPath, sourceUrl,
      ]
    : [
        '--no-playlist', '--newline', '--no-colors', '--progress', '--retries', '3', '--fragment-retries', '3',
        '--format', `bestvideo[height<=${maxHeight}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${maxHeight}][ext=mp4]/best`,
        '--merge-output-format', 'mp4', '--remux-video', 'mp4', '--output', targetPath, sourceUrl,
      ];

  const job: BrowserDownloadJob = {
    id, title, filename, filePath: targetPath, mimeType: isAudio ? 'audio/mpeg' : 'video/mp4', thumbnailUrl: thumb,
    status: 'active', progress: 0, speed: 'Connecting…', speedBytes: 0, eta: 'Waiting for yt-dlp…', etaSeconds: 0,
    downloadedBytes: 0, totalBytes: 0, isCancelled: false,
  };
  browserDownloads.set(id, job);

  const child = spawn(getYtDlpPath(), args, { windowsHide: true });
  job.process = child;
  let stderr = '';
  const handleOutput = (chunk: Buffer) => updateDownloadProgress(job, chunk.toString());
  child.stdout.on('data', handleOutput);
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    updateDownloadProgress(job, text);
  });
  child.on('error', (error) => {
    job.status = 'error';
    job.speed = '0 KB/s';
    job.speedBytes = 0;
    job.error = `Unable to start yt-dlp: ${error.message}`;
  });
  child.on('close', (code) => {
    job.process = undefined;
    if (job.isCancelled) {
      job.status = 'error';
      job.error = 'Download cancelled.';
      return;
    }
    if (job.status === 'paused') return;
    if (code === 0 && fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      job.status = 'completed';
      job.progress = 100;
      job.speed = '0 KB/s';
      job.speedBytes = 0;
      job.eta = 'Completed';
      job.etaSeconds = 0;
      job.totalBytes = stats.size;
      job.downloadedBytes = stats.size;
      mediaStore.set(id, {
        id, title, filename, filePath: targetPath, fileSize: stats.size,
        mimeType: job.mimeType, thumbnailUrl: thumb, createdAt: Date.now(),
      });
      return;
    }
    job.status = 'error';
    job.speed = '0 KB/s';
    job.speedBytes = 0;
    job.error = stderr.trim() || `yt-dlp exited with code ${code ?? 'unknown'}.`;
  });

  return job;
}

async function extractMetadataWithYtDlp(url: string) {
  return new Promise((resolve, reject) => {
    const child = spawn(getYtDlpPath(), [
      '--dump-single-json', '--no-playlist', '--skip-download', '--no-warnings', url,
    ], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}.`));
      try {
        const raw = JSON.parse(stdout);
        resolve({
          id: raw.id || '',
          title: raw.title || 'Untitled media',
          duration: raw.duration || 0,
          thumbnail: raw.thumbnail || raw.thumbnails?.at(-1)?.url || '',
          author: raw.uploader || raw.channel || raw.creator || 'Unknown publisher',
          fps: raw.fps || undefined,
          description: raw.description || '',
          formats: (raw.formats || []).map((format: any) => ({
            id: String(format.format_id || ''),
            resolution: format.resolution || (format.height ? `${format.height}p` : 'Audio'),
            format: format.ext || '',
            codec: format.vcodec && format.vcodec !== 'none' ? format.vcodec : format.acodec || '',
            vcodec: format.vcodec,
            acodec: format.acodec,
            filesize: format.filesize || format.filesize_approx || 0,
            fps: format.fps || undefined,
            tbr: format.tbr || undefined,
          })),
          subtitles: Object.entries(raw.subtitles || {}).map(([lang, entries]: [string, any]) => ({
            lang,
            name: entries?.[0]?.name || lang,
            ext: entries?.[0]?.ext || 'vtt',
          })),
          extractor: raw.extractor_key || raw.extractor || 'yt-dlp',
          webpageUrl: raw.webpage_url || url,
        });
      } catch {
        reject(new Error('yt-dlp returned unreadable metadata.'));
      }
    });
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Metadata comes from yt-dlp itself; no durations, formats, or file sizes are
// estimated in the browser UI.
app.get('/api/extract-metadata', async (req, res) => {
  const url = (req.query.url as string) || '';
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    return res.json(await extractMetadataWithYtDlp(url));
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'yt-dlp could not inspect this URL.' });
  }

  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    try {
      // 1. Fetch official YouTube oEmbed title and author
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      let title = `YouTube Stream [${videoId}]`;
      let author = 'YouTube Creator';
      let thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        title = oembed.title || title;
        author = oembed.author_name || author;
        thumbnail = oembed.thumbnail_url || thumbnail;
      }

      // Calculate realistic file sizes based on title and typical bitrates
      const isShort = url.includes('/shorts/');
      const duration = isShort ? 45 : 562; // ~9 mins 22 sec

      return res.json({
        id: videoId,
        title,
        author,
        duration,
        thumbnail,
        description: `Video broadcast by ${author}. Transcoded and formatted for QuickTime & universal playback.`,
        fps: 60,
        formats: [
          {
            id: '1080p-mp4',
            resolution: '1080p (Full HD)',
            format: 'mp4',
            codec: 'AVC / H.264',
            filesize: Math.round(duration * 1.8 * 1024 * 1024), // Realistic bitrate
            fps: 60,
            vcodec: 'avc1.64002a',
            acodec: 'aac',
            tbr: 8500,
          },
          {
            id: '720p-mp4',
            resolution: '720p (HD)',
            format: 'mp4',
            codec: 'AVC / H.264',
            filesize: Math.round(duration * 0.95 * 1024 * 1024), // Realistic bitrate
            fps: 60,
            vcodec: 'avc1.4d401f',
            acodec: 'aac',
            tbr: 4500,
          },
          {
            id: '480p-mp4',
            resolution: '480p (SD)',
            format: 'mp4',
            codec: 'AVC / H.264',
            filesize: Math.round(duration * 0.45 * 1024 * 1024),
            fps: 30,
            vcodec: 'avc1.4d401e',
            acodec: 'aac',
            tbr: 2200,
          },
        ],
        subtitles: [
          { lang: 'en', name: 'English', ext: 'vtt' },
          { lang: 'te', name: 'Telugu', ext: 'vtt' },
          { lang: 'hi', name: 'Hindi', ext: 'vtt' },
        ],
        extractor: 'Logos Engine (YouTube)',
        webpageUrl: `https://www.youtube.com/watch?v=${videoId}`,
      });
    } catch (err: any) {
      console.warn('Metadata fetch failed, returning parsed item:', err);
    }
  }

  // Generic fallback
  res.json({
    id: `stream-${Date.now()}`,
    title: 'Media Stream',
    author: 'Web Streamer',
    duration: 300,
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600',
    description: 'Extracted web stream source with multi-track codecs.',
    fps: 60,
    formats: [
      {
        id: '1080p-mp4',
        resolution: '1080p (Full HD)',
        format: 'mp4',
        codec: 'AVC / H.264',
        filesize: 180 * 1024 * 1024,
        fps: 60,
      },
      {
        id: '720p-mp4',
        resolution: '720p (HD)',
        format: 'mp4',
        codec: 'AVC / H.264',
        filesize: 95 * 1024 * 1024,
        fps: 60,
      },
    ],
  });
});

// Browser downloads are managed as real server-side jobs so the UI can poll
// yt-dlp's actual byte count, transfer rate, ETA, completion, and errors.
app.post('/api/downloads', (req, res) => {
  const { id, title, sourceUrl, thumb, format = 'mp4', resolution = '720p' } = req.body as Record<string, string>;
  if (!id || !title || !sourceUrl) {
    return res.status(400).json({ error: 'Missing required parameters (id, title, sourceUrl).' });
  }
  try {
    const parsedUrl = new URL(sourceUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported URL protocol');
  } catch {
    return res.status(400).json({ error: 'A valid HTTP(S) media URL is required.' });
  }

  const existing = browserDownloads.get(id);
  const job = existing || startBrowserDownload({ id, title, sourceUrl, thumb, format, resolution });
  return res.status(202).json({ job: publicDownloadJob(job) });
});

app.get('/api/downloads/:id', (req, res) => {
  const job = browserDownloads.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Download job not found.' });
  return res.json({ job: publicDownloadJob(job) });
});

app.post('/api/downloads/:id/pause', (req, res) => {
  const job = browserDownloads.get(req.params.id);
  if (!job || !job.process || job.status !== 'active') return res.status(409).json({ error: 'This download cannot be paused.' });
  if (process.platform === 'win32') return res.status(501).json({ error: 'Pause is not available on Windows.' });
  job.process.kill('SIGSTOP');
  job.status = 'paused';
  job.speed = '0 KB/s';
  job.speedBytes = 0;
  job.eta = 'Paused';
  return res.json({ job: publicDownloadJob(job) });
});

app.post('/api/downloads/:id/resume', (req, res) => {
  const job = browserDownloads.get(req.params.id);
  if (!job || !job.process || job.status !== 'paused') return res.status(409).json({ error: 'This download cannot be resumed.' });
  if (process.platform === 'win32') return res.status(501).json({ error: 'Resume is not available on Windows.' });
  job.process.kill('SIGCONT');
  job.status = 'active';
  job.speed = 'Resuming…';
  job.eta = 'Calculating…';
  return res.json({ job: publicDownloadJob(job) });
});

app.post('/api/downloads/:id/cancel', (req, res) => {
  const job = browserDownloads.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Download job not found.' });
  job.isCancelled = true;
  job.process?.kill('SIGINT');
  job.status = 'error';
  job.speed = '0 KB/s';
  job.speedBytes = 0;
  job.error = 'Download cancelled.';
  return res.json({ job: publicDownloadJob(job) });
});

// Stream real MP4 video with HTTP Range Support (Native QuickTime/Safari/Chrome compatible)
app.get('/api/video/:id', (req, res) => {
  const { id } = req.params;
  const targetMp4 = path.join(DOWNLOADS_DIR, `${id}.mp4`);
  const targetMp3 = path.join(DOWNLOADS_DIR, `${id}.mp3`);

  let targetFile = fs.existsSync(targetMp4)
    ? targetMp4
    : fs.existsSync(targetMp3)
    ? targetMp3
    : '';

  let mimeType = targetFile.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4';

  if (!fs.existsSync(targetFile)) {
    return res.status(404).send('Media file not generated yet');
  }

  const stat = fs.statSync(targetFile);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(targetFile, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(targetFile).pipe(res);
  }
});

// Direct Download to Laptop with proper Content-Disposition header
app.get('/api/download-file/:id', (req, res) => {
  const { id } = req.params;
  const targetMp4 = path.join(DOWNLOADS_DIR, `${id}.mp4`);
  const targetMp3 = path.join(DOWNLOADS_DIR, `${id}.mp3`);

  let targetPath = fs.existsSync(targetMp4)
    ? targetMp4
    : fs.existsSync(targetMp3)
    ? targetMp3
    : '';

  if (!fs.existsSync(targetPath)) {
    return res.status(404).send('File not found');
  }

  const meta = mediaStore.get(id);
  const ext = targetPath.endsWith('.mp3') ? 'mp3' : 'mp4';
  const downloadFilename = meta?.filename || `${sanitizeFilename(meta?.title || 'video')}.${ext}`;

  res.download(targetPath, downloadFilename, (err) => {
    if (err) {
      console.error('Download transfer error:', err);
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Logos Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
