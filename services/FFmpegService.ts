export interface ConversionOptions {
  inputPath: string;
  outputPath: string;
  format: 'mp4' | 'mkv' | 'mov' | 'mp3' | 'flac';
  codec?: string;
  bitrate?: string;
  spatialVideoConversion?: boolean;
}

export interface IFFmpegService {
  isAvailable(): Promise<boolean>;
  convert(options: ConversionOptions, onProgress?: (progress: number) => void): Promise<string>;
}

export class FFmpegService implements IFFmpegService {
  private static instance: FFmpegService;

  private constructor() {}

  public static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  public async isAvailable(): Promise<boolean> {
    // Stub - will verify ffmpeg static binary in Phase 3
    return true;
  }

  public async convert(options: ConversionOptions, onProgress?: (progress: number) => void): Promise<string> {
    // Stub - will run ffmpeg transcoding process in Phase 3
    if (onProgress) onProgress(100);
    return options.outputPath;
  }
}
