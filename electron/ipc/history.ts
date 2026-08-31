import { ipcMain } from 'electron';
import { HistoryService } from '../../services/HistoryService';
import { DownloadItem } from '../../types';
import { Logger } from '../../utils/logger';

export function registerHistoryIPC() {
  const historyService = HistoryService.getInstance();

  ipcMain.handle('history:get', async () => {
    return await historyService.getHistory();
  });

  ipcMain.handle('history:add', async (_event, item: DownloadItem) => {
    Logger.info(`[IPC] history:add for item ${item.id}`);
    await historyService.addToHistory(item);
    return true;
  });

  ipcMain.handle('history:remove', async (_event, id: string) => {
    Logger.info(`[IPC] history:remove for item ${id}`);
    return await historyService.removeFromHistory(id);
  });

  ipcMain.handle('history:clear', async () => {
    Logger.info('[IPC] history:clear requested');
    await historyService.clearHistory();
    return true;
  });
}
