import React from 'react';
import { Trophy, Check, ArrowRight } from 'lucide-react';
import { PixelButton } from '../common/PixelButton';

interface LevelUpModalProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  statChanges: { label: string; from: string; to: string }[];
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  title,
  subtitle,
  statChanges,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#261f1a] border-2 border-[#b88235] p-5 rounded-xs shadow-[0_0_35px_rgba(184,130,53,0.4)] text-center relative select-none">
        {/* Pixel Sparkle Icon in Warm Amber */}
        <div className="mx-auto w-14 h-14 rounded-full bg-[#3d2f20] border-2 border-[#d9983b] flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(217,152,59,0.3)]">
          <Trophy className="w-7 h-7 text-[#fad287] stroke-[2.2]" />
        </div>

        <span className="text-[10px] font-pixel px-2 py-0.5 rounded-xs bg-[#3d2713] border border-[#a66d21] text-[#fae5b6] uppercase tracking-widest">
          QUEST ACCREDITATION
        </span>

        <h3 className="font-pixel text-xl text-[#fcebc8] font-bold mt-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {title}
        </h3>

        <p className="text-xs text-[#cfc1b0] font-sans mt-1">
          {subtitle}
        </p>

        {/* Stat Changes */}
        <div className="my-4 space-y-2">
          {statChanges.map((stat, i) => (
            <div
              key={i}
              className="p-2 rounded-xs bg-[#1a1411] border border-[#4d3a2a] flex items-center justify-between text-xs"
            >
              <span className="text-[#c9baa8] font-sans">{stat.label}</span>
              <div className="flex items-center gap-1.5 font-mono font-bold">
                <span className="text-[#8c7b6d]">{stat.from}</span>
                <ArrowRight className="w-3 h-3 text-[#e0a443]" />
                <span className="text-[#7ec283]">{stat.to}</span>
              </div>
            </div>
          ))}
        </div>

        <PixelButton
          variant="primary"
          size="md"
          fullWidth
          onClick={onClose}
          icon={<Check className="w-4 h-4 text-[#2b1706] stroke-[3]" />}
        >
          CLAIM REWARD & RESUME
        </PixelButton>
      </div>
    </div>
  );
};
