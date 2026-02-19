import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white',
  secondary: 'bg-slate-700/80 hover:bg-slate-600/80 text-slate-200 backdrop-blur-sm border border-white/10',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  gold: 'text-white border border-amber-500/30 hover:border-amber-400/50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-8 py-3.5 text-lg tracking-wide',
};

export function Button({ variant = 'primary', size = 'md', className = '', style, ...props }: ButtonProps) {
  const isGold = variant === 'gold';

  return (
    <button
      className={`rounded-lg font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      style={{
        ...(isGold ? {
          background: 'linear-gradient(135deg, #b8860b, #daa520, #d4af37, #b8860b)',
          boxShadow: '0 2px 12px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
        } : {}),
        ...style,
      }}
      {...props}
    />
  );
}
