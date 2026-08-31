import { motion } from 'motion/react';
import React, { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  primary?: boolean;
  variant?: 'default' | 'primary' | 'destructive' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  id?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const GlassButton = ({
  children,
  onClick,
  primary = false,
  variant = 'default',
  size = 'md',
  className,
  disabled = false,
  id,
  ...props
}: GlassButtonProps) => {
  const resolvedVariant = primary ? 'primary' : variant;

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs rounded-full gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-full gap-2',
    lg: 'px-7 py-3 text-base rounded-full gap-2.5',
    icon: 'p-2.5 rounded-full aspect-square justify-center',
  }[size];

  const variantClasses = {
    default:
      'bg-white/5 text-white/90 shadow-sm border border-white/10 hover:bg-white/15 hover:border-white/20 active:bg-white/20',
    primary:
      'bg-white text-black font-semibold shadow-[0_4px_20px_rgba(255,255,255,0.25)] hover:bg-white/95 active:bg-white/80 border border-white/40',
    destructive:
      'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 active:bg-red-500/35',
    ghost:
      'bg-transparent text-white/70 hover:text-white hover:bg-white/10 border border-transparent',
    icon:
      'bg-white/5 text-white/80 border border-white/10 hover:bg-white/15 hover:text-white',
  }[resolvedVariant];

  return (
    <motion.button
      id={id}
      whileHover={disabled ? {} : { scale: 1.02, backgroundColor: resolvedVariant === 'primary' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.12)' }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 backdrop-blur-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none",
        sizeClasses,
        variantClasses,
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};
