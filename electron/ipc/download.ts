import { ipcMain } from 'electron';
import { DownloadService } from '../../services/DownloadService';
import { DownloadOptions } from '../../types';
import { Logger } from '../../utils/logger';

export function registerDownloadIPC() {
  const downloadService = DownloadService.getInstance();

  ipcMain.handle('download:start', async (_event, url: string, options?: DownloadOptions) => {
    try {
      Logger.info(`[IPC] download:start requested for ${url}`);
      return await downloadService.startDownload(url, options);
    } catch (err: any) {
      Logger.error('[IPC] download:start failed', err);
      throw err;
    }
  });

  ipcMain.handle('download:pause', async (_event, taskId: string) => {
    Logger.info(`[IPC] download:pause for task ${taskId}`);
    return await downloadService.pauseDownload(taskId);
  });

  ipcMain.handle('download:resume', async (_event, taskId: string) => {
    Logger.info(`[IPC] download:resume for task ${taskId}`);
    return await downloadService.resumeDownload(taskId);
  });

  ipcMain.handle('download:cancel', async (_event, taskId: string) => {
    Logger.info(`[IPC] download:cancel for task ${taskId}`);
    return await downloadService.cancelDownload(taskId);
  });

  ipcMain.handle('download:retry', async (_event, taskId: string) => {
    Logger.info(`[IPC] download:retry for task ${taskId}`);
    return await downloadService.retryDownload(taskId);
  });

  ipcMain.handle('download:getActive', async () => {
    return await downloadService.getActiveDownloads();
  });
}
