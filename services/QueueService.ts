import { DownloadItem } from '../types/index';

export interface IQueueService {
  enqueue(item: DownloadItem): void;
  dequeue(): DownloadItem | undefined;
  getQueue(): DownloadItem[];
  setMaxConcurrentDownloads(limit: number): void;
}

export class QueueService implements IQueueService {
  private static instance: QueueService;
  private queue: DownloadItem[] = [];
  private maxConcurrent = 3;

  private constructor() {}

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  public enqueue(item: DownloadItem): void {
    this.queue.push(item);
  }

  public dequeue(): DownloadItem | undefined {
    return this.queue.shift();
  }

  public getQueue(): DownloadItem[] {
    return [...this.queue];
  }

  public setMaxConcurrentDownloads(limit: number): void {
    this.maxConcurrent = Math.max(1, limit);
  }
}
