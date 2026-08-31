import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface GlassProgressBarProps {
  progress: number;
  className?: string;
  glow?: boolean;
  status?: 'active' | 'paused' | 'completed' | 'queued' | 'error';
}

export const GlassProgressBar = ({
  progress,
  className,
  glow = true,
  status = 'active',
}: GlassProgressBarProps) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const statusGlow = {
    active: 'bg-white/50 shadow-[0_0_16px_rgba(255,255,255,0.4)]',
    paused: 'bg-amber-300/60 shadow-[0_0_16px_rgba(255,170,0,0.3)]',
    completed: 'bg-emerald-400/80 shadow-[0_0_16px_rgba(48,209,88,0.4)]',
    error: 'bg-red-400/80 shadow-[0_0_16px_rgba(255,69,58,0.4)]',
  }[status];

  return (
    <div
      className={cn(
        "relative h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/10 p-[1px]",
        className
      )}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clampedProgress}%` }}
        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        className={cn(
          "h-full rounded-full backdrop-blur-sm relative overflow-hidden transition-colors duration-300",
          statusGlow
        )}
      >
        {/* Optical refraction light sweep animation */}
        {status === 'active' && clampedProgress > 0 && clampedProgress < 100 && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              repeat: Infinity,
              duration: 2.2,
              ease: 'linear',
            }}
            className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-12"
          />
        )}
      </motion.div>
    </div>
  );
};
