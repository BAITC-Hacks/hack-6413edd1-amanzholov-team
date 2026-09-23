import React from 'react';
import { Lock } from 'lucide-react';
import { soundFx } from '../../utils/audio';

export type ButtonVariant = 'primary' | 'secondary' | 'emerald' | 'danger' | 'parchment';
export type ButtonState = 'default' | 'pressed' | 'disabled' | 'locked' | 'selected';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  state?: ButtonState;
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  variant = 'primary',
  state = 'default',
  children,
  icon,
  size = 'md',
  fullWidth = false,
  onClick,
  className = '',
  disabled,
  ...props
}) => {
  const isLocked = state === 'locked';
  const isDisabled = disabled || state === 'disabled' || isLocked;
  const isSelected = state === 'selected';

  // Stardew Valley warm palette: honey amber, timber oak, soft moss green, warm parchment
  let variantStyles = '';
  if (variant === 'primary') {
    // Warm beeswax / honey golden button
    variantStyles =
      'bg-gradient-to-b from-[#e3a344] via-[#d69234] to-[#b8731f] text-[#281706] font-bold border-2 border-[#824c16] shadow-[inset_1px_1px_0px_#fbe09e,inset_-2px_-2px_0px_#6e3b0f,0_3px_0px_#3d1f06] hover:brightness-105 active:translate-y-0.5 active:shadow-[inset_1px_1px_0px_#6e3b0f,0_1px_0px_#3d1f06]';
  } else if (variant === 'emerald') {
    // Soft moss / clover garden green
    variantStyles =
      'bg-gradient-to-b from-[#5c8f60] via-[#4e7d51] to-[#3a613d] text-[#fbf7ea] font-bold border-2 border-[#2b4c2e] shadow-[inset_1px_1px_0px_#99caa0,inset_-2px_-2px_0px_#223a24,0_3px_0px_#142416] hover:brightness-105 active:translate-y-0.5 active:shadow-[inset_1px_1px_0px_#223a24,0_1px_0px_#142416]';
  } else if (variant === 'secondary') {
    // Warm carved timber wood button
    variantStyles =
      'bg-gradient-to-b from-[#523d2e] via-[#433023] to-[#332317] text-[#f6eddc] border-2 border-[#6d4f39] shadow-[inset_1px_1px_0px_#805f47,inset_-2px_-2px_0px_#22160d,0_3px_0px_#140d07] hover:bg-[#4a3627] active:translate-y-0.5 active:shadow-[inset_1px_1px_0px_#22160d,0_1px_0px_#140d07]';
  } else if (variant === 'parchment') {
    // Soft warm tea-stained parchment scroll
    variantStyles =
      'bg-gradient-to-b from-[#fffbf2] via-[#f7eedc] to-[#ebdcc4] text-[#362618] font-bold border-2 border-[#946e47] shadow-[inset_1px_1px_0px_#fff,inset_-2px_-2px_0px_#b8946e,0_3px_0px_#543a21] hover:bg-[#f3e5ce] active:translate-y-0.5';
  } else if (variant === 'danger') {
    // Soft terracotta / warm autumn clay
    variantStyles =
      'bg-gradient-to-b from-[#c26551] to-[#9e4634] text-[#fff5f2] border-2 border-[#6b2c20] shadow-[inset_1px_1px_0px_#e89f8f,inset_-2px_-2px_0px_#541e15,0_3px_0px_#2e0e08]';
  }

  if (isDisabled && !isLocked) {
    variantStyles =
      'bg-[#38312b]/80 text-[#8c7f75] border-2 border-[#4d443c]/60 cursor-not-allowed shadow-none opacity-60';
  } else if (isLocked) {
    variantStyles =
      'bg-[#2d2722] text-[#91857c] border-2 border-[#473c34] cursor-not-allowed shadow-[0_2px_0_#14100d]';
  }

  if (isSelected) {
    variantStyles += ' ring-2 ring-[#e3a344] ring-offset-2 ring-offset-[#1f1915]';
  }

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs min-h-[36px]',
    md: 'px-3.5 py-2 text-sm min-h-[44px]',
    lg: 'px-5 py-3 text-base min-h-[50px]',
  }[size];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    soundFx.playSelect();
    onClick?.(e);
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xs select-none transition-all duration-75 cursor-pointer font-pixel tracking-wide ${sizeStyles} ${variantStyles} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {isLocked && <Lock className="w-3.5 h-3.5 text-[#d69642] shrink-0" />}
      {icon && !isLocked && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
};
