import { motion } from 'motion/react';
import React, { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  intensity?: 'subtle' | 'standard' | 'heavy';
  interactive?: boolean;
  onClick?: () => void;
  id?: string;
  key?: React.Key;
}

export const GlassCard = ({
  children,
  className,
  hover = true,
  intensity = 'standard',
  interactive = false,
  onClick,
  id,
  ...props
}: GlassCardProps) => {
  const intensityBg = {
    subtle: 'bg-white/[0.03]',
    standard: 'bg-white/[0.06]',
    heavy: 'bg-white/[0.12]',
  }[intensity];

  return (
    <motion.div
      id={id}
      whileHover={hover ? { scale: 1.01, y: -2 } : {}}
      whileTap={interactive ? { scale: 0.99 } : {}}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-[24px]",
        intensityBg,
        "backdrop-blur-3xl",
        "border border-white/20 border-t-white/30 border-l-white/30",
        "shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:via-white/[0.02] before:to-transparent before:pointer-events-none",
        interactive && "cursor-pointer",
        className
      )}
      {...props}
    >
      {/* Inner Bezel Effect for native Apple optical refraction */}
      <div className="absolute inset-0 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] pointer-events-none" />
      <div className="relative z-10 h-full flex flex-col">{children}</div>
    </motion.div>
  );
};
