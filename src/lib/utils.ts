import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 KB/s';
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours === 0) return `${mins}m ${secs}s`;
  return `${hours}h ${remMins}m`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 80);
}

/**
 * Exports and saves the actual .mp4 / .mp3 media file directly to the user's laptop/computer disk
 */
export async function exportMediaToDisk(item: {
  id: string;
  title: string;
  sourceUrl: string;
  codec?: string;
  resolution?: string;
  thumb?: string;
}) {
  const isAudio = item.codec?.toLowerCase().includes('mp3') || item.codec?.toLowerCase().includes('flac') || item.codec?.toLowerCase().includes('aac') || item.codec?.toLowerCase().includes('wav');
  const ext = isAudio ? 'mp3' : 'mp4';
  const filename = `${sanitizeFilename(item.title || 'video_download')}.${ext}`;

  // Desktop builds use the operating system's native Save As dialog.
  if (typeof window !== 'undefined' && window.electronAPI?.exportFile) {
    const result = await window.electronAPI.exportFile(item.id, filename);
    return { success: !result.canceled, canceled: result.canceled, filename, filePath: result.filePath };
  }

  const downloadUrl = `/api/download-file/${item.id}`;
  const browserWindow = window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName: string;
      types: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>;
  };

  // Chromium's File System Access API gives the browser build the same explicit
  // save-location choice. localhost is treated as a secure context.
  if (browserWindow.showSaveFilePicker) {
    try {
      const handle = await browserWindow.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: isAudio ? 'Audio file' : 'Video file',
          accept: { [isAudio ? 'audio/mpeg' : 'video/mp4']: [`.${ext}`] },
        }],
      });
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('The completed media file could not be downloaded.');
      const writable = await handle.createWritable();
      await writable.write(await response.blob());
      await writable.close();
      return { success: true, canceled: false, filename };
    } catch (error: any) {
      if (error?.name === 'AbortError') return { success: false, canceled: true, filename };
      throw error;
    }
  }

  // Other browsers fall back to their normal download handling, which may be
  // configured by the user to ask for a location.
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  return { success: true, filename };
}
