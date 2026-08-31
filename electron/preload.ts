import { contextBridge, ipcRenderer } from 'electron';
import type { DownloadOptions, DownloadItem, VideoMetadata, GlassSettings, FileExportResult } from '../types';

/**
 * Preload script securely bridging Main Process to Renderer via contextBridge.
 * Follows strict security mandates: contextIsolation: true, nodeIntegration: false, sandbox: true.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  exportFile: (taskId: string, suggestedFilename: string): Promise<FileExportResult> =>
    ipcRenderer.invoke('media:export', taskId, suggestedFilename),
  download: {
    start: (url: string, options?: DownloadOptions): Promise<DownloadItem> =>
      ipcRenderer.invoke('download:start', url, options),
    pause: (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('download:pause', taskId),
    resume: (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('download:resume', taskId),
    cancel: (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('download:cancel', taskId),
    retry: (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('download:retry', taskId),
    getActive: (): Promise<DownloadItem[]> =>
      ipcRenderer.invoke('download:getActive'),
    onProgress: (callback: (data: { taskId: string; progress: number; speed: string; eta: string }) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on('download:progress', listener);
      return () => {
        ipcRenderer.removeListener('download:progress', listener);
      };
    },
  },
  metadata: {
    extract: (url: string): Promise<VideoMetadata> =>
      ipcRenderer.invoke('metadata:extract', url),
  },
  history: {
    get: (): Promise<DownloadItem[]> =>
      ipcRenderer.invoke('history:get'),
    add: (item: DownloadItem): Promise<boolean> =>
      ipcRenderer.invoke('history:add', item),
    remove: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('history:remove', id),
    clear: (): Promise<boolean> =>
      ipcRenderer.invoke('history:clear'),
  },
  settings: {
    get: (): Promise<GlassSettings> =>
      ipcRenderer.invoke('settings:get'),
    save: (settings: Partial<GlassSettings>): Promise<GlassSettings> =>
      ipcRenderer.invoke('settings:save', settings),
  },
});
