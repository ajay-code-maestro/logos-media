import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { registerDownloadIPC } from './ipc/download';
import { registerMetadataIPC } from './ipc/metadata';
import { registerHistoryIPC } from './ipc/history';
import { registerSettingsIPC } from './ipc/settings';
import { DownloadService } from '../services/DownloadService';
import { Logger } from '../utils/logger';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function createMainWindow(): BrowserWindow {
  Logger.info(`Initializing Logos Media Window (isDev: ${isDev})`);

  const win = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    title: 'Logos Media',
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
    win.loadURL(devServerUrl).catch((err) => {
      Logger.error('Failed to load dev server URL, falling back to dist', err);
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return win;
}

function registerAllIPC() {
  registerDownloadIPC();
  registerMetadataIPC();
  registerHistoryIPC();
  registerSettingsIPC();

  ipcMain.handle('media:export', async (_event, taskId: string, suggestedFilename: string) => {
    const item = DownloadService.getInstance().getTaskConfig(taskId)?.item;
    if (!item?.outputPath) {
      throw new Error('The completed media file is no longer available to export.');
    }

    try {
      await fs.access(item.outputPath);
    } catch {
      throw new Error('The completed media file could not be found.');
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save downloaded media',
      defaultPath: path.join(app.getPath('downloads'), suggestedFilename),
      buttonLabel: 'Save video',
      filters: [{ name: 'Media files', extensions: ['mp4', 'mkv', 'mov', 'webm', 'mp3', 'm4a', 'wav', 'flac', 'aac', 'opus'] }],
    });

    if (canceled || !filePath) return { canceled: true };
    await fs.copyFile(item.outputPath, filePath);
    return { canceled: false, filePath };
  });

  // Forward DownloadService progress events directly to renderer window
  const downloadService = DownloadService.getInstance();
  downloadService.on('progress', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:progress', data);
    }
  });

  Logger.info('All Electron IPC handlers registered successfully.');
}

app.whenReady().then(() => {
  registerAllIPC();
  mainWindow = createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
