import { GlassSettings } from '../types';

export interface ISettingsService {
  getSettings(): Promise<GlassSettings>;
  saveSettings(settings: Partial<GlassSettings>): Promise<GlassSettings>;
}

export class SettingsService implements ISettingsService {
  private static instance: SettingsService;
  private settings: GlassSettings = {
    blurIntensity: 'ultra',
    frostOpacity: 6,
    edgeLuminance: 30,
    ambientTheme: 'aurora',
    ambientMovement: true,
    springPhysics: true,
    soundEffects: true,
    glowIntensity: 80,
  };

  private constructor() {}

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  public async getSettings(): Promise<GlassSettings> {
    return { ...this.settings };
  }

  public async saveSettings(newSettings: Partial<GlassSettings>): Promise<GlassSettings> {
    this.settings = { ...this.settings, ...newSettings };
    return { ...this.settings };
  }
}
