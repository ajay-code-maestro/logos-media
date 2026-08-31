import React from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { GlassSettings, AmbientTheme } from '../types';
import {
  SlidersHorizontal,
  Sparkles,
  Layers,
  Sun,
  Eye,
  Activity,
  Volume2,
  RefreshCw,
  Palette,
  Check,
} from 'lucide-react';

interface SettingsViewProps {
  settings: GlassSettings;
  onUpdateSettings: (newSettings: Partial<GlassSettings>) => void;
  onResetSettings: () => void;
}

export const SettingsView = ({
  settings,
  onUpdateSettings,
  onResetSettings,
}: SettingsViewProps) => {
  const themes: { id: AmbientTheme; label: string; desc: string; preview: string }[] = [
    {
      id: 'monochrome',
      label: 'Apple Titanium Graphite',
      desc: 'Subtle slate & frosted quartz for pure macOS look',
      preview: 'from-zinc-400/30 to-zinc-800/30',
    },
    {
      id: 'aurora',
      label: 'VisionOS Aurora',
      desc: 'Cyan & deep violet ambient plasma rays',
      preview: 'from-cyan-400 to-purple-600',
    },
    {
      id: 'deep-ocean',
      label: 'Deep Oceanic Glass',
      desc: 'Cobalt blue and underwater refraction currents',
      preview: 'from-blue-600 to-teal-400',
    },
    {
      id: 'sunset',
      label: 'Solar Dusk Glow',
      desc: 'Amber, coral and twilight violet illumination',
      preview: 'from-amber-400 to-rose-600',
    },
    {
      id: 'vision-glow',
      label: 'Quantum Emerald',
      desc: 'Vibrant neon green & matrix quantum flare',
      preview: 'from-emerald-400 to-teal-500',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-cyan-300">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Liquid Optics Calibration
              </h2>
              <p className="text-xs text-white/50">
                Tune backdrop-blur layers, edge luminance, refraction blobs, and spring physics.
              </p>
            </div>
          </div>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onResetSettings}
            className="text-xs text-white/60 hover:text-white"
          >
            <RefreshCw size={12} className="mr-1.5" />
            Reset Defaults
          </GlassButton>
        </div>
      </GlassCard>

      {/* Ambient Lighting Theme Matrix */}
      <GlassCard className="p-6 space-y-4" hover={false}>
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Palette size={16} className="text-cyan-400" />
          <span>Ambient Lighting & Refraction Environment</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themes.map((t) => {
            const isSelected = settings.ambientTheme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onUpdateSettings({ ambientTheme: t.id })}
                className={`p-4 rounded-2xl cursor-pointer border transition-all duration-200 flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-white/15 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)] text-white'
                    : 'bg-white/[0.03] border-white/5 text-white/70 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${t.preview} inline-block shadow-xs`}
                    />
                    <span className="text-sm font-semibold text-white">
                      {t.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40">{t.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-cyan-400 border-cyan-300 text-black'
                      : 'border-white/20'
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Optical Shader Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Blur & Frost Intensity */}
        <GlassCard className="p-6 space-y-5" hover={false}>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Layers size={16} className="text-purple-300" />
            <span>Layered Diffusion Density</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Frosting Opacity (White Diffuse)</span>
              <span className="font-mono text-cyan-300 font-semibold">{settings.frostOpacity}%</span>
            </div>
            <input
              type="range"
              min={2}
              max={25}
              value={settings.frostOpacity}
              onChange={(e) => onUpdateSettings({ frostOpacity: Number(e.target.value) })}
              className="w-full accent-cyan-400 bg-white/10 rounded-full h-1.5 cursor-pointer"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Edge Luminance (Bezel Highlights)</span>
              <span className="font-mono text-cyan-300 font-semibold">{settings.edgeLuminance}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              value={settings.edgeLuminance}
              onChange={(e) => onUpdateSettings({ edgeLuminance: Number(e.target.value) })}
              className="w-full accent-cyan-400 bg-white/10 rounded-full h-1.5 cursor-pointer"
            />
          </div>
        </GlassCard>

        {/* Physics & Motion Dynamics */}
        <GlassCard className="p-6 space-y-4" hover={false}>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Activity size={16} className="text-emerald-300" />
            <span>Spring Dynamics & Interactivity</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors">
              <div>
                <div className="text-xs font-semibold text-white">
                  Ambient Blobs Motion
                </div>
                <div className="text-[11px] text-white/40">
                  Continuous floating refraction waves
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.ambientMovement}
                onChange={(e) => onUpdateSettings({ ambientMovement: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 rounded-sm cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors">
              <div>
                <div className="text-xs font-semibold text-white">
                  Apple Spring Weight
                </div>
                <div className="text-[11px] text-white/40">
                  Stiffness 320 / Damping 22 physics
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.springPhysics}
                onChange={(e) => onUpdateSettings({ springPhysics: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 rounded-sm cursor-pointer"
              />
            </label>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
};
