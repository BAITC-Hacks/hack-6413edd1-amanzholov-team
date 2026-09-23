import React from 'react';

interface XpProgressBarProps {
  current: number;
  max: number;
  label?: string;
  percentage?: number;
  color?: 'blue' | 'emerald' | 'amber' | 'purple';
  height?: 'sm' | 'md' | 'lg';
  showValues?: boolean;
  className?: string;
}

export const XpProgressBar: React.FC<XpProgressBarProps> = ({
  current,
  max,
  label,
  percentage,
  color = 'blue',
  height = 'md',
  showValues = true,
  className = '',
}) => {
  const rawPercentage = percentage ?? (max > 0 ? Math.round((current / max) * 100) : 0);
  const calculatedPercent = Number.isFinite(rawPercentage) ? Math.max(0, Math.min(100, rawPercentage)) : 0;

  const heightClasses = {
    sm: 'h-2',
    md: 'h-3.5',
    lg: 'h-5',
  }[height];

  // Soft, pleasant, non-neon gradients inspired by Stardew Valley
  const gradientColors = {
    emerald: 'from-[#659d6a] via-[#508053] to-[#3b613e] border-[#7cb882]',
    amber: 'from-[#e5aa4b] via-[#d19133] to-[#ad6f1a] border-[#f5cc82]',
    blue: 'from-[#6791ad] via-[#4e7591] to-[#37556c] border-[#8cb7d4]',
    purple: 'from-[#916b99] via-[#754d7d] to-[#593661] border-[#ba96c2]',
  }[color];

  return (
    <div className={`w-full ${className}`}>
      {(label || showValues) && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-sans font-medium">
          {label && <span className="text-[#ebd9c1] font-pixel tracking-wide">{label}</span>}
          {showValues && (
            <span className="text-[#baa48d] font-mono tabular-nums text-[11px]">
              {calculatedPercent}%{' '}
              {max > 100 ? `(${current.toLocaleString()} / ${max.toLocaleString()} XP)` : ''}
            </span>
          )}
        </div>
      )}

      {/* Wooden Trough Frame */}
      <div
        className="w-full bg-[#1c1612] border-2 border-[#573b25] p-0.5 rounded-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] relative overflow-hidden"
      >
        <div
          className={`relative ${heightClasses} rounded-none bg-gradient-to-r ${gradientColors} transition-all duration-500 ease-out border-r`}
          style={{ width: `${calculatedPercent}%` }}
        >
          {/* Subtle top glare */}
          <div className="absolute inset-x-0 top-0 h-[30%] bg-white/25" />
          {/* Soft pixel wood/cloth texture */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.4) 50%)',
              backgroundSize: '6px 100%',
            }}
          />
        </div>
      </div>
    </div>
  );
};

interface SkillPipsProps {
  level: number;
  maxLevel?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'emerald' | 'gold' | 'blue';
  className?: string;
}

export const SkillPips: React.FC<SkillPipsProps> = ({
  level,
  maxLevel = 5,
  size = 'md',
  variant = 'emerald',
  className = '',
}) => {
  const pips = Array.from({ length: maxLevel }, (_, i) => i < level);

  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  // Cozy gentle gem colors
  const filledColor = {
    emerald: 'bg-[#588d5c] border-[#81bd86] shadow-[0_0_4px_rgba(100,165,105,0.5)]',
    gold: 'bg-[#d9983b] border-[#fad384] shadow-[0_0_4px_rgba(230,165,65,0.5)]',
    blue: 'bg-[#5984a3] border-[#8cbcdb] shadow-[0_0_4px_rgba(95,145,180,0.5)]',
  }[variant];

  return (
    <div className={`flex items-center gap-1 shrink-0 ${className}`}>
      {pips.map((isFilled, idx) => (
        <div
          key={idx}
          className={`${sizeClasses} rotate-45 border transition-transform duration-200 ${
            isFilled
              ? `${filledColor}`
              : 'bg-[#211a15] border-[#453427] shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)]'
          }`}
          title={`Proficiency ${idx + 1} of ${maxLevel}`}
        />
      ))}
      <span className="text-xs font-mono font-bold text-[#e0cfba] ml-1.5 tabular-nums">
        {level}/{maxLevel}
      </span>
    </div>
  );
};
