import React from 'react';

interface PixelCardProps {
  children: React.ReactNode;
  variant?: 'stone' | 'gold' | 'emerald' | 'parchment' | 'dark';
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const PixelCard: React.FC<PixelCardProps> = ({
  children,
  variant = 'stone',
  className = '',
  onClick,
  interactive = false,
}) => {
  let styleClasses = '';

  if (variant === 'stone') {
    // Warm carved timber oak box with soft wood border & brass nails
    styleClasses =
      'bg-[#28211b] border-2 border-[#5c3e27] shadow-[inset_1px_1px_0px_#7d5638,inset_-2px_-2px_0px_#17120e,0_4px_10px_rgba(0,0,0,0.35)] text-[#f0e3d2]';
  } else if (variant === 'gold') {
    // Warm honey beeswax & polished cedar panel
    styleClasses =
      'bg-[#2e2317] border-2 border-[#c28834] shadow-[inset_1px_1px_0px_#f5c97d,inset_-2px_-2px_0px_#6b4513,0_4px_12px_rgba(180,120,40,0.2)] text-[#faeed9]';
  } else if (variant === 'emerald') {
    // Soft moss garden & conservatory panel
    styleClasses =
      'bg-[#202b21] border-2 border-[#4d7d51] shadow-[inset_1px_1px_0px_#7cb080,inset_-2px_-2px_0px_#162417,0_4px_10px_rgba(35,55,35,0.25)] text-[#ebf5ec]';
  } else if (variant === 'parchment') {
    // Soft warm tea-stained parchment paper
    styleClasses =
      'bg-[#fdf7ec] border-2 border-[#8f6841] shadow-[inset_1px_1px_0px_#fffefa,inset_-2px_-2px_0px_#c2a78a,0_4px_10px_rgba(40,28,18,0.2)] text-[#2d1e13]';
  } else if (variant === 'dark') {
    // Cozy evening fireside slate
    styleClasses =
      'bg-[#1e1915] border-2 border-[#423326] shadow-[inset_1px_1px_0px_rgba(255,255,255,0.04),0_3px_8px_rgba(0,0,0,0.4)] text-[#ded1c0]';
  }

  const interactiveClasses = interactive
    ? 'cursor-pointer hover:brightness-105 active:scale-[0.99] transition-all'
    : '';

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xs p-4 ${styleClasses} ${interactiveClasses} ${className}`}
    >
      {/* 4-corner warm brass nail studs */}
      {variant !== 'parchment' && (
        <>
          <span className="absolute top-1 left-1 w-1 h-1 bg-[#d99f49]/60 pointer-events-none rounded-xs" />
          <span className="absolute top-1 right-1 w-1 h-1 bg-[#d99f49]/60 pointer-events-none rounded-xs" />
          <span className="absolute bottom-1 left-1 w-1 h-1 bg-[#d99f49]/60 pointer-events-none rounded-xs" />
          <span className="absolute bottom-1 right-1 w-1 h-1 bg-[#d99f49]/60 pointer-events-none rounded-xs" />
        </>
      )}
      {children}
    </div>
  );
};
