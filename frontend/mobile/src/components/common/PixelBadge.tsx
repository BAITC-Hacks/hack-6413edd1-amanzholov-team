import React from 'react';
import { CheckCircle2, Users, AlertTriangle, Lock, HelpCircle } from 'lucide-react';
import { VerificationStatus } from '../../types/career';

interface PixelBadgeProps {
  status: VerificationStatus | 'selected' | 'open';
  label?: string;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const PixelBadge: React.FC<PixelBadgeProps> = ({
  status,
  label,
  count,
  size = 'md',
  className = '',
}) => {
  let config = {
    bg: 'bg-[#223324]',
    border: 'border-[#4e7d51]',
    text: 'text-[#d6edd8]',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#73ad77] shrink-0" />,
    defaultLabel: 'Verified',
  };

  if (status === 'verified') {
    // Soft moss / clover garden green
    config = {
      bg: 'bg-[#223324]',
      border: 'border-[#4e7d51]',
      text: 'text-[#d6edd8]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#73ad77] shrink-0" />,
      defaultLabel: count ? `Verified (${count})` : 'Verified',
    };
  } else if (status === 'peer_endorsed') {
    // Soft tranquil mountain lake blue
    config = {
      bg: 'bg-[#1e2e3b]',
      border: 'border-[#466e8c]',
      text: 'text-[#cfe2f0]',
      icon: <Users className="w-3.5 h-3.5 text-[#6b9cc2] shrink-0" />,
      defaultLabel: count ? `Peer Endorsed (${count})` : 'Peer Endorsed',
    };
  } else if (status === 'self_reported') {
    // Warm harvest wheat / tea-stained straw
    config = {
      bg: 'bg-[#33281c]',
      border: 'border-[#7d603a]',
      text: 'text-[#f5e3cd]',
      icon: <HelpCircle className="w-3.5 h-3.5 text-[#c79c5f] shrink-0" />,
      defaultLabel: 'Self-Reported',
    };
  } else if (status === 'warning') {
    // Soft autumn terracotta clay
    config = {
      bg: 'bg-[#38231e]',
      border: 'border-[#8f4a3c]',
      text: 'text-[#f7d9d2]',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-[#d16c58] shrink-0" />,
      defaultLabel: 'Gap Alert',
    };
  } else if (status === 'locked') {
    // Weathered timber slate
    config = {
      bg: 'bg-[#2b2521]',
      border: 'border-[#4a4038]',
      text: 'text-[#b0a59c]',
      icon: <Lock className="w-3.5 h-3.5 text-[#8f8277] shrink-0" />,
      defaultLabel: 'Locked',
    };
  } else if (status === 'selected') {
    // Warm beeswax glow
    config = {
      bg: 'bg-[#382a17]',
      border: 'border-[#c78b30]',
      text: 'text-[#fae5b6]',
      icon: <span className="w-2 h-2 rounded-full bg-[#e3a344] shrink-0" />,
      defaultLabel: 'Selected',
    };
  }

  const textToRender = label || config.defaultLabel;
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs';

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-sans font-medium rounded-xs border ${config.bg} ${config.border} ${config.text} ${padding} shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] shrink-0 ${className}`}
    >
      {config.icon}
      <span className="leading-none whitespace-nowrap">{textToRender}</span>
    </div>
  );
};
