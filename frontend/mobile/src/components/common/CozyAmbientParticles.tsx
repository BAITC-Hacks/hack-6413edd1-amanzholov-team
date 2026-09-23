import React, { useMemo } from 'react';

interface ParticleLeaf {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
  type: 'golden' | 'autumn' | 'clover' | 'ochre';
  scale: number;
}

interface DustMote {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
  size: number;
  color: string;
  glowColor: string;
}

export const CozyAmbientParticles: React.FC = () => {
  // Pre-calculate deterministic particle paths for silky smooth layout & zero re-renders
  const leaves: ParticleLeaf[] = useMemo(
    () => [
      { id: 1, left: '8%', top: '-2%', delay: '0s', duration: '15s', type: 'golden', scale: 0.95 },
      { id: 2, left: '32%', top: '-5%', delay: '3.5s', duration: '17s', type: 'autumn', scale: 0.85 },
      { id: 3, left: '58%', top: '-3%', delay: '7.2s', duration: '14s', type: 'clover', scale: 0.9 },
      { id: 4, left: '82%', top: '-6%', delay: '1.8s', duration: '18s', type: 'ochre', scale: 1.05 },
      { id: 5, left: '20%', top: '22%', delay: '5.6s', duration: '16s', type: 'golden', scale: 0.8 },
      { id: 6, left: '74%', top: '35%', delay: '9.4s', duration: '19s', type: 'autumn', scale: 0.9 },
      { id: 7, left: '44%', top: '55%', delay: '4.1s', duration: '15.5s', type: 'clover', scale: 0.75 },
    ],
    []
  );

  const motes: DustMote[] = useMemo(
    () => [
      { id: 1, left: '14%', top: '28%', delay: '0.5s', duration: '8s', size: 3, color: '#fed982', glowColor: 'rgba(254,217,130,0.55)' },
      { id: 2, left: '26%', top: '64%', delay: '2.8s', duration: '10s', size: 2.5, color: '#f7c06d', glowColor: 'rgba(247,192,109,0.5)' },
      { id: 3, left: '68%', top: '18%', delay: '1.4s', duration: '9s', size: 3.5, color: '#ffd591', glowColor: 'rgba(255,213,145,0.6)' },
      { id: 4, left: '86%', top: '52%', delay: '4.2s', duration: '11s', size: 2, color: '#fed982', glowColor: 'rgba(254,217,130,0.45)' },
      { id: 5, left: '42%', top: '82%', delay: '3.1s', duration: '8.5s', size: 3, color: '#bfe6be', glowColor: 'rgba(191,230,190,0.45)' },
      { id: 6, left: '55%', top: '40%', delay: '6.0s', duration: '12s', size: 2.5, color: '#fed982', glowColor: 'rgba(254,217,130,0.5)' },
      { id: 7, left: '78%', top: '86%', delay: '5.1s', duration: '9.5s', size: 2, color: '#ffd591', glowColor: 'rgba(255,213,145,0.5)' },
      { id: 8, left: '9%', top: '78%', delay: '7.3s', duration: '10.5s', size: 3, color: '#f7c06d', glowColor: 'rgba(247,192,109,0.5)' },
    ],
    []
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden z-15 select-none"
    >
      {/* Floating Warm Dust Motes */}
      {motes.map((mote) => (
        <div
          key={`mote-${mote.id}`}
          className="absolute animate-dust-mote rounded-full"
          style={{
            left: mote.left,
            top: mote.top,
            width: `${mote.size}px`,
            height: `${mote.size}px`,
            backgroundColor: mote.color,
            boxShadow: `0 0 6px 1px ${mote.glowColor}`,
            animationDelay: mote.delay,
            animationDuration: mote.duration,
          }}
        />
      ))}

      {/* Drifting Autumn & Clover Leaves */}
      {leaves.map((leaf) => (
        <div
          key={`leaf-${leaf.id}`}
          className="absolute animate-leaf-fall opacity-0"
          style={{
            left: leaf.left,
            top: leaf.top,
            animationDelay: leaf.delay,
            animationDuration: leaf.duration,
            transform: `scale(${leaf.scale})`,
          }}
        >
          {leaf.type === 'golden' && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
              {/* Pixel Art Golden Leaf */}
              <rect x="5" y="1" width="3" height="3" fill="#f0ae43" />
              <rect x="3" y="4" width="7" height="4" fill="#d99330" />
              <rect x="2" y="6" width="9" height="3" fill="#b8751e" />
              <rect x="5" y="8" width="4" height="3" fill="#9c5f13" />
              <rect x="6" y="11" width="2" height="2" fill="#6e3e08" />
              <rect x="6" y="5" width="2" height="3" fill="#ffe08b" opacity="0.6" />
            </svg>
          )}

          {leaf.type === 'autumn' && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
              {/* Pixel Art Russet Maple Leaf */}
              <rect x="6" y="1" width="2" height="3" fill="#d45d39" />
              <rect x="4" y="3" width="6" height="3" fill="#ba4827" />
              <rect x="2" y="5" width="10" height="4" fill="#9e371a" />
              <rect x="4" y="8" width="6" height="3" fill="#7d2911" />
              <rect x="6" y="11" width="2" height="2" fill="#521706" />
              <rect x="6" y="4" width="2" height="3" fill="#f28d6d" opacity="0.6" />
            </svg>
          )}

          {leaf.type === 'clover' && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
              {/* Pixel Art Green Clover Spore */}
              <rect x="4" y="2" width="3" height="3" fill="#6ba870" />
              <rect x="7" y="2" width="3" height="3" fill="#55915a" />
              <rect x="3" y="5" width="8" height="3" fill="#447d49" />
              <rect x="5" y="8" width="4" height="3" fill="#305e34" />
              <rect x="6" y="10" width="2" height="3" fill="#1f4222" />
              <rect x="5" y="4" width="2" height="2" fill="#a4d9a8" opacity="0.6" />
            </svg>
          )}

          {leaf.type === 'ochre' && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
              {/* Pixel Art Amber Oak Leaf */}
              <rect x="5" y="2" width="3" height="3" fill="#c49749" />
              <rect x="3" y="4" width="7" height="4" fill="#a87c30" />
              <rect x="4" y="7" width="5" height="3" fill="#8a6120" />
              <rect x="5" y="10" width="3" height="2" fill="#5c3f10" />
              <rect x="6" y="11" width="1" height="2" fill="#3d2807" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
};
