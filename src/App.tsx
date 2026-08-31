import React, { useState } from 'react';
import { AppLayout } from './components/AppLayout';
import { DashboardView } from './components/DashboardView';
import { DownloadsView } from './components/DownloadsView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { AboutView } from './components/AboutView';
import { InspectorModal } from './components/InspectorModal';
import { MediaPreviewModal } from './components/MediaPreviewModal';
import { AnalyzeModal } from './components/AnalyzeModal';
import { DownloadItem, NavTab, AmbientTheme, GlassSettings, DownloadOptions } from './types';
import { useDownloadEngine } from './hooks/useDownloadEngine';

export default function App() {
  // Navigation & Modal State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingItem, setInspectingItem] = useState<DownloadItem | null>(null);
  const [previewingItem, setPreviewingItem] = useState<DownloadItem | null>(null);
  const [analyzeUrl, setAnalyzeUrl] = useState<string | null>(null);

  // Real backend IPC engine hook
  const {
    downloads,
    historyItems,
    settings,
    loading,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    pauseAll,
    resumeAll,
    clearCompleted,
    updateSettings,
    clearHistory,
    removeFromHistory,
    aggregateSpeed,
  } = useDownloadEngine();

  const [ambientTheme, setAmbientTheme] = useState<AmbientTheme>(settings.ambientTheme || 'aurora');

  const handlePauseResume = async (id: string) => {
    const item = downloads.find((d) => d.id === id);
    if (!item) return;
    if (item.status === 'active') {
      await pauseDownload(id);
    } else {
      await resumeDownload(id);
    }
  };

  const handleCycleTheme = () => {
    const themes: AmbientTheme[] = [
      'aurora',
      'monochrome',
      'deep-ocean',
      'sunset',
      'vision-glow',
    ];
    const currentIndex = themes.indexOf(ambientTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setAmbientTheme(nextTheme);
    updateSettings({ ambientTheme: nextTheme });
  };

  const handleUpdateSettings = async (newSettings: Partial<GlassSettings>) => {
    if (newSettings.ambientTheme) {
      setAmbientTheme(newSettings.ambientTheme);
    }
    await updateSettings(newSettings);
  };

  const handleResetSettings = async () => {
    const defaultSettings: GlassSettings = {
      blurIntensity: 'ultra',
      frostOpacity: 6,
      edgeLuminance: 30,
      ambientTheme: 'aurora',
      ambientMovement: true,
      springPhysics: true,
      soundEffects: true,
      glowIntensity: 80,
    };
    setAmbientTheme('aurora');
    await updateSettings(defaultSettings);
  };

  const handleStartDownloadFromModal = async (url: string, options: DownloadOptions) => {
    await startDownload(url, options);
    setActiveTab('downloads');
  };

  const activeCount = downloads.filter((d) => d.status === 'active').length;
  const completedCount = downloads.filter((d) => d.status === 'completed').length;

  // Combine completed active items with persistent history
  const combinedHistory = [
    ...downloads.filter((d) => d.status === 'completed'),
    ...historyItems.filter((h) => !downloads.some((d) => d.id === h.id)),
  ];

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      ambientTheme={ambientTheme}
      onCycleTheme={handleCycleTheme}
      networkSpeed={aggregateSpeed}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      activeCount={activeCount}
      completedCount={completedCount}
      settings={settings}
    >
      {activeTab === 'dashboard' && (
        <DashboardView
          items={downloads}
          onPauseResume={handlePauseResume}
          onCancel={cancelDownload}
          onInspect={setInspectingItem}
          onPreview={setPreviewingItem}
          onRetry={retryDownload}
          onAnalyzeUrl={(url) => setAnalyzeUrl(url)}
          onStartDownload={handleStartDownloadFromModal}
          onPauseAll={pauseAll}
          onResumeAll={resumeAll}
          networkSpeed={aggregateSpeed}
          settings={settings}
        />
      )}

      {activeTab === 'downloads' && (
        <DownloadsView
          items={downloads}
          onPauseResume={handlePauseResume}
          onCancel={cancelDownload}
          onInspect={setInspectingItem}
          onPreview={setPreviewingItem}
          onRetry={retryDownload}
          onPauseAll={pauseAll}
          onResumeAll={resumeAll}
          onClearCompleted={clearCompleted}
          searchQuery={searchQuery}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView
          items={combinedHistory}
          onPreview={setPreviewingItem}
          onInspect={setInspectingItem}
          onDelete={removeFromHistory}
          onClearAll={clearHistory}
          searchQuery={searchQuery}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsView
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetSettings={handleResetSettings}
        />
      )}

      {activeTab === 'about' && <AboutView />}

      {/* Stream Inspector Modal */}
      <InspectorModal
        item={inspectingItem}
        isOpen={Boolean(inspectingItem)}
        onClose={() => setInspectingItem(null)}
      />

      {/* Media Player Preview Modal */}
      <MediaPreviewModal
        item={previewingItem}
        isOpen={Boolean(previewingItem)}
        onClose={() => setPreviewingItem(null)}
      />

      {/* URL Stream Analyzer Modal */}
      <AnalyzeModal
        url={analyzeUrl || ''}
        isOpen={Boolean(analyzeUrl)}
        onClose={() => setAnalyzeUrl(null)}
        onStartDownload={handleStartDownloadFromModal}
      />
    </AppLayout>
  );
}
