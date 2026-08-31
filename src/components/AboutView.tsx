import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import {
  Sparkles,
  Layers,
  Sun,
  Eye,
  Activity,
  CheckCircle2,
  Code,
  Sliders,
  Box,
  Compass,
} from 'lucide-react';

export const AboutView = () => {
  // Interactive sandbox state
  const [enableBlur, setEnableBlur] = useState(true);
  const [enableEdgeLight, setEnableEdgeLight] = useState(true);
  const [enableInnerBezel, setEnableInnerBezel] = useState(true);
  const [enableGradientSweep, setEnableGradientSweep] = useState(true);
  const [enableSpring, setEnableSpring] = useState(true);

  const pillars = [
    {
      title: '1. Refraction & Sub-surface Scattering',
      icon: <Layers size={18} className="text-cyan-300" />,
      desc: 'Instead of flat opacity, we use backdrop-blur-3xl layered over a subtle 5% white wash (bg-white/5). This diffuses background light and sharp edge artifacts just like genuine optical crystal.',
      code: 'bg-white/5 backdrop-blur-3xl',
    },
    {
      title: '2. Directional Edge Luminance',
      icon: <Sun size={18} className="text-amber-300" />,
      desc: 'Simulating an overhead light source, the top and left borders (border-t-white/30 border-l-white/30) are significantly brighter than bottom/right edges (border-white/20). This provides tactile edge illumination.',
      code: 'border border-white/20 border-t-white/30 border-l-white/30',
    },
    {
      title: '3. Inner Bezel & Inset Shadows',
      icon: <Box size={18} className="text-purple-300" />,
      desc: 'An inner inset shadow creates a 1px chamfered rim around the glass perimeter. It models the optical thickness of the glass pane, preventing the element from looking paper-thin.',
      code: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]',
    },
    {
      title: '4. Physical Weight & Spring Kinematics',
      icon: <Activity size={18} className="text-emerald-300" />,
      desc: 'Apple interfaces feel physically compressible. We pair high stiffness (320-400) and damping (20-22) spring curves for immediate, organic tactile response without floaty latency.',
      code: 'transition={{ type: "spring", stiffness: 320, damping: 22 }}',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8"
    >
      {/* Introduction Header */}
      <GlassCard className="p-6 md:p-8" hover={false}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-cyan-300 shrink-0">
            <Sparkles size={24} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                macOS & VisionOS Liquid Glass Architecture
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Design Spec
              </span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-3xl">
              Achieving true "Liquid Glass" goes far beyond simple CSS alpha opacity. By layering high-density backdrop diffusion filters, directional edge illumination, inner chamfer bezels, and spring kinematics, we produce optical depth native to Apple’s premium operating systems.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Interactive Optical Layer Sandbox */}
      <GlassCard className="p-6 md:p-8 space-y-6" hover={false}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-cyan-300" />
            <h3 className="text-base font-semibold text-white">
              Interactive Layer Deconstruction Sandbox
            </h3>
          </div>
          <span className="text-xs text-white/40">
            Toggle optical passes to inspect the difference
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-2.5">
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors">
              <span className="text-xs font-medium text-white/90">
                1. Backdrop Diffusion (Blur)
              </span>
              <input
                type="checkbox"
                checked={enableBlur}
                onChange={(e) => setEnableBlur(e.target.checked)}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors">
              <span className="text-xs font-medium text-white/90">
                2. Overhead Edge Lighting
              </span>
              <input
                type="checkbox"
                checked={enableEdgeLight}
                onChange={(e) => setEnableEdgeLight(e.target.checked)}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors">
              <span className="text-xs font-medium text-white/90">
                3. Inner Bezel Chamfer Shadow
              </span>
              <input
                type="checkbox"
                checked={enableInnerBezel}
                onChange={(e) => setEnableInnerBezel(e.target.checked)}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors">
              <span className="text-xs font-medium text-white/90">
                4. Sub-surface Specular Gradient
              </span>
              <input
                type="checkbox"
                checked={enableGradientSweep}
                onChange={(e) => setEnableGradientSweep(e.target.checked)}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors">
              <span className="text-xs font-medium text-white/90">
                5. Spring Physics on Hover
              </span>
              <input
                type="checkbox"
                checked={enableSpring}
                onChange={(e) => setEnableSpring(e.target.checked)}
                className="accent-cyan-400 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {/* Live Preview Slab */}
          <div className="lg:col-span-7 relative p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-black border border-white/10 overflow-hidden flex items-center justify-center min-h-[260px]">
            {/* Background floating colorful shape behind test slab */}
            <div className="absolute w-32 h-32 rounded-full bg-cyan-400/40 blur-xl top-4 left-6 animate-pulse" />
            <div className="absolute w-28 h-28 rounded-full bg-pink-500/40 blur-xl bottom-4 right-6 animate-bounce" />

            {/* Test Glass Slab */}
            <motion.div
              whileHover={enableSpring ? { scale: 1.05, y: -4 } : {}}
              whileTap={enableSpring ? { scale: 0.96 } : {}}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              className={`relative z-10 p-6 rounded-[24px] w-full max-w-sm cursor-pointer transition-all duration-300 ${
                enableBlur ? 'backdrop-blur-3xl bg-white/10' : 'bg-black/60'
              } ${
                enableEdgeLight
                  ? 'border border-white/20 border-t-white/40 border-l-white/40'
                  : 'border border-white/5'
              } ${
                enableGradientSweep
                  ? 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/15 before:to-transparent before:pointer-events-none before:rounded-[24px]'
                  : ''
              } shadow-[0_15px_35px_rgba(0,0,0,0.5)]`}
            >
              {/* Inner bezel */}
              {enableInnerBezel && (
                <div className="absolute inset-0 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] pointer-events-none" />
              )}

              <div className="relative z-10 space-y-3 text-center">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center text-white border border-white/30 shadow-xs">
                  <Compass size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Liquid Crystal Slab
                  </h4>
                  <p className="text-[11px] text-white/60 mt-1">
                    {enableBlur && enableEdgeLight && enableInnerBezel
                      ? '✨ Full VisionOS Native Glass'
                      : '⚠️ Some optical passes disabled'}
                  </p>
                </div>
                <div className="pt-1">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/15 text-white border border-white/20">
                    Hover & Tap to test spring
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </GlassCard>

      {/* 4 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillars.map((p, idx) => (
          <GlassCard key={idx} className="p-6 space-y-3" hover={false}>
            <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
              {p.icon}
              <span>{p.title}</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">{p.desc}</p>
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 text-[11px] font-mono text-cyan-300/90 truncate">
              {p.code}
            </div>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
};
