import { DownloadItem } from '../types';

export interface IHistoryService {
  getHistory(): Promise<DownloadItem[]>;
  addToHistory(item: DownloadItem): Promise<void>;
  removeFromHistory(id: string): Promise<boolean>;
  clearHistory(): Promise<void>;
}

export class HistoryService implements IHistoryService {
  private static instance: HistoryService;
  private history: DownloadItem[] = [];

  private constructor() {}

  public static getInstance(): HistoryService {
    if (!HistoryService.instance) {
      HistoryService.instance = new HistoryService();
    }
    return HistoryService.instance;
  }

  public async getHistory(): Promise<DownloadItem[]> {
    return [...this.history];
  }

  public async addToHistory(item: DownloadItem): Promise<void> {
    this.history.unshift(item);
  }

  public async removeFromHistory(id: string): Promise<boolean> {
    const prevLen = this.history.length;
    this.history = this.history.filter((i) => i.id !== id);
    return this.history.length < prevLen;
  }

  public async clearHistory(): Promise<void> {
    this.history = [];
  }
}
