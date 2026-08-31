import { ipcMain } from 'electron';
import { MetadataService } from '../../services/MetadataService';
import { Logger } from '../../utils/logger';

export function registerMetadataIPC() {
  const metadataService = MetadataService.getInstance();

  ipcMain.handle('metadata:extract', async (_event, url: string) => {
    try {
      Logger.info(`[IPC] metadata:extract requested for ${url}`);
      return await metadataService.extractMetadata(url);
    } catch (err: any) {
      Logger.error(`[IPC] metadata:extract failed for ${url}`, err);
      throw err;
    }
  });
}
