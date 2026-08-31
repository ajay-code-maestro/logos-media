import path from 'node:path';
import os from 'node:os';

/**
 * Standard cross-platform path helpers for Electron main process
 */
export const AppPaths = {
  getAppRoot(): string {
    return process.cwd();
  },

  getUserDataPath(): string {
    return path.join(os.homedir(), '.logos-media');
  },

  getDefaultDownloadsPath(): string {
    return path.join(os.homedir(), 'Downloads', 'LogosMedia');
  },

  getTempPath(): string {
    return path.join(os.tmpdir(), 'logos-media-temp');
  },

  getLogPath(): string {
    return path.join(this.getUserDataPath(), 'logs');
  },

  getPreloadPath(): string {
    // In production or compiled mode
    return path.join(__dirname, 'preload.cjs');
  }
};
