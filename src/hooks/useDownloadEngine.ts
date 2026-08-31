import { useState, useEffect, useCallback } from 'react';
import {
  DownloadItem,
  DownloadOptions,
  VideoMetadata,
  GlassSettings,
} from '../types';
import { ElectronClient, isElectronEnv } from '../services/electronBridge';

export function useDownloadEngine() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [historyItems, setHistoryItems] = useState<DownloadItem[]>([]);
  const [settings, setSettings] = useState<GlassSettings>({
    blurIntensity: 'ultra',
    frostOpacity: 6,
    edgeLuminance: 30,
    ambientTheme: 'aurora',
    ambientMovement: true,
    springPhysics: true,
    soundEffects: true,
    glowIntensity: 80,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const isElectron = isElectronEnv();

  // Load initial tasks, history, and settings from backend
  const refreshState = useCallback(async () => {
    try {
      const [activeList, histList, loadedSettings] = await Promise.all([
        ElectronClient.download.getActive(),
        ElectronClient.history.get(),
        ElectronClient.settings.get(),
      ]);

      if (activeList && activeList.length > 0) {
        setDownloads(activeList);
      }
      if (histList) {
        setHistoryItems(histList);
      }
      if (loadedSettings) {
        setSettings(loadedSettings);
      }
    } catch (err) {
      console.error('[useDownloadEngine] Failed to refresh state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Subscribe to real-time IPC download progress events
  useEffect(() => {
    const unsubscribe = ElectronClient.download.onProgress?.((data) => {
      setDownloads((prev) =>
        prev.map((item) => {
          if (item.id !== data.taskId) return item;

          const isDone = data.progress >= 100;
          return {
            ...item,
            progress: data.progress,
            speed: data.speed,
            speedBytes: (data as any).speedBytes ?? item.speedBytes,
            eta: data.eta,
            etaSeconds: (data as any).etaSeconds ?? item.etaSeconds,
            downloadedSize: (data as any).downloadedBytes ?? (data.progress / 100) * item.totalSize,
            totalSize: (data as any).totalBytes ?? item.totalSize,
            completedChunks: (data as any).completedChunks ?? Math.floor((data.progress / 100) * item.chunks),
            status: data.status || (isDone ? 'completed' : item.status),
            completedAt: isDone ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : item.completedAt,
          };
        })
      );

      // A completed browser job is already the real file; only refresh history.
      if (data.progress >= 100) {
        ElectronClient.history.get().then((hist) => {
          if (hist) setHistoryItems(hist);
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Actions connecting to real backend
  const startDownload = useCallback(
    async (url: string, options: DownloadOptions = {}): Promise<DownloadItem> => {
      try {
        const item = await ElectronClient.download.start(url, options);
        setDownloads((prev) => {
          const exists = prev.some((d) => d.id === item.id);
          if (exists) {
            return prev.map((d) => (d.id === item.id ? item : d));
          }
          return [item, ...prev];
        });
        return item;
      } catch (err) {
        console.error('[useDownloadEngine] startDownload failed:', err);
        throw err;
      }
    },
    []
  );

  const pauseDownload = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const res = await ElectronClient.download.pause(taskId);
      setDownloads((prev) =>
        prev.map((item) =>
          item.id === taskId
            ? { ...item, status: 'paused', speed: '0 KB/s', speedBytes: 0 }
            : item
        )
      );
      return res;
    } catch (err) {
      console.error('[useDownloadEngine] pauseDownload error:', err);
      return false;
    }
  }, []);

  const resumeDownload = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const res = await ElectronClient.download.resume(taskId);
      setDownloads((prev) =>
        prev.map((item) =>
          item.id === taskId
            ? { ...item, status: 'active', speed: 'Connecting...', speedBytes: 0 }
            : item
        )
      );
      return res;
    } catch (err) {
      console.error('[useDownloadEngine] resumeDownload error:', err);
      return false;
    }
  }, []);

  const cancelDownload = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const res = await ElectronClient.download.cancel(taskId);
      setDownloads((prev) => prev.filter((item) => item.id !== taskId));
      return res;
    } catch (err) {
      console.error('[useDownloadEngine] cancelDownload error:', err);
      return false;
    }
  }, []);

  const retryDownload = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const res = await ElectronClient.download.retry(taskId);
      setDownloads((prev) =>
        prev.map((item) =>
          item.id === taskId
            ? {
                ...item,
                status: 'active',
                progress: 0,
                downloadedSize: 0,
                speed: 'Connecting...',
                errorMessage: undefined,
              }
            : item
        )
      );
      return res;
    } catch (err) {
      console.error('[useDownloadEngine] retryDownload error:', err);
      return false;
    }
  }, []);

  const pauseAll = useCallback(async () => {
    const activeTasks = downloads.filter((d) => d.status === 'active');
    await Promise.all(activeTasks.map((t) => ElectronClient.download.pause(t.id)));
    setDownloads((prev) =>
      prev.map((item) =>
        item.status === 'active'
          ? { ...item, status: 'paused', speed: '0 KB/s', speedBytes: 0 }
          : item
      )
    );
  }, [downloads]);

  const resumeAll = useCallback(async () => {
    const pausedTasks = downloads.filter((d) => d.status === 'paused');
    await Promise.all(pausedTasks.map((t) => ElectronClient.download.resume(t.id)));
    setDownloads((prev) =>
      prev.map((item) =>
        item.status === 'paused'
          ? { ...item, status: 'active', speed: 'Connecting...', speedBytes: 0 }
          : item
      )
    );
  }, [downloads]);

  const clearCompleted = useCallback(async () => {
    setDownloads((prev) => prev.filter((item) => item.status !== 'completed'));
  }, []);

  const extractMetadata = useCallback(async (url: string): Promise<VideoMetadata> => {
    return ElectronClient.metadata.extract(url);
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<GlassSettings>) => {
    const saved = await ElectronClient.settings.save(newSettings);
    setSettings((prev) => ({ ...prev, ...saved }));
    return saved;
  }, []);

  const clearHistory = useCallback(async () => {
    await ElectronClient.history.clear();
    setHistoryItems([]);
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    await ElectronClient.history.remove(id);
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Live aggregate bandwidth speed calculation
  const totalSpeedBytes = downloads
    .filter((d) => d.status === 'active')
    .reduce((acc, curr) => acc + (curr.speedBytes || 0), 0);

  const aggregateSpeedFormatted =
    totalSpeedBytes > 0
      ? `${((totalSpeedBytes / (1024 * 1024)) * 8).toFixed(1)} Mbps`
      : '0.0 Mbps';

  return {
    downloads,
    historyItems,
    settings,
    loading,
    isElectron,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    pauseAll,
    resumeAll,
    clearCompleted,
    extractMetadata,
    updateSettings,
    clearHistory,
    removeFromHistory,
    aggregateSpeed: aggregateSpeedFormatted,
  };
}
