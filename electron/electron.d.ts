import { IElectronAPI } from '../types/index';

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}

// Ensure this is treated as a module
export {};
