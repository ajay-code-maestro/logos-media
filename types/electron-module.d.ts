declare module 'electron' {
  export const app: {
    isPackaged: boolean;
    whenReady: () => Promise<void>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    quit: () => void;
    getPath: (name: string) => string;
  };

  export interface BrowserWindowOptions {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    title?: string;
    titleBarStyle?: 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';
    vibrancy?: string;
    visualEffectState?: 'active' | 'inactive' | 'followWindow';
    backgroundColor?: string;
    show?: boolean;
    webPreferences?: {
      preload?: string;
      contextIsolation?: boolean;
      nodeIntegration?: boolean;
      sandbox?: boolean;
      webSecurity?: boolean;
    };
  }

  export class BrowserWindow {
    constructor(options?: BrowserWindowOptions);
    webContents: {
      setWindowOpenHandler: (handler: (details: { url: string }) => { action: 'allow' | 'deny' }) => void;
      openDevTools: () => void;
      send: (channel: string, ...args: any[]) => void;
    };
    static getAllWindows(): BrowserWindow[];
    loadURL(url: string): Promise<void>;
    loadFile(filePath: string): Promise<void>;
    show(): void;
    isDestroyed(): boolean;
    once(event: string, listener: (...args: any[]) => void): void;
    on(event: string, listener: (...args: any[]) => void): void;
  }

  export const shell: {
    openExternal: (url: string) => Promise<void>;
    showItemInFolder: (fullPath: string) => void;
  };

  export const dialog: {
    showSaveDialog: (options: {
      title?: string;
      defaultPath?: string;
      buttonLabel?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<{ canceled: boolean; filePath?: string }>;
  };

  export const ipcMain: {
    handle: (channel: string, listener: (event: any, ...args: any[]) => any) => void;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    removeHandler: (channel: string) => void;
  };

  export const ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    removeListener: (channel: string, listener: (...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
  };

  export const contextBridge: {
    exposeInMainWorld: (apiKey: string, api: Record<string, any>) => void;
  };
}
