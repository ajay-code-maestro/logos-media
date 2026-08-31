import { VideoMetadata } from '../types/index';
import { DownloadService } from './DownloadService';

export interface IMetadataService {
  extractMetadata(url: string): Promise<VideoMetadata>;
}

export class MetadataService implements IMetadataService {
  private static instance: MetadataService;

  private constructor() {}

  public static getInstance(): MetadataService {
    if (!MetadataService.instance) {
      MetadataService.instance = new MetadataService();
    }
    return MetadataService.instance;
  }

  public async extractMetadata(url: string): Promise<VideoMetadata> {
    return DownloadService.getInstance().extractMetadata(url);
  }
}

