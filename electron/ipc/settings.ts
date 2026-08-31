import { ipcMain } from 'electron';
import { SettingsService } from '../../services/SettingsService';
import { GlassSettings } from '../../types';
import { Logger } from '../../utils/logger';

export function registerSettingsIPC() {
  const settingsService = SettingsService.getInstance();

  ipcMain.handle('settings:get', async () => {
    return await settingsService.getSettings();
  });

  ipcMain.handle('settings:save', async (_event, settings: Partial<GlassSettings>) => {
    Logger.info('[IPC] settings:save requested');
    return await settingsService.saveSettings(settings);
  });
}
