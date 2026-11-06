import React from 'react';

interface EcoTraceLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const EcoTraceLogo: React.FC<EcoTraceLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-sm' },
    md: { box: 'w-10 h-10', text: 'text-lg' },
    lg: { box: 'w-14 h-14', text: 'text-2xl' },
    xl: { box: 'w-20 h-20', text: 'text-3xl' },
  };

  const { box, text } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Precision Vector Emblem matching official EcoTrace-CLI logo */}
      <div className={`relative flex items-center justify-center rounded-xl bg-[#121615] border border-emerald-500/20 shadow-lg shadow-emerald-950/40 p-1 ${box}`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Subtle glow filter */}
          <defs>
            <filter id="ecoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="leafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
            <linearGradient id="bracketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>

          {/* Terminal / Container bracket frame contours */}
          {/* Top Left Bracket */}
          <path
            d="M 28 32 L 20 32 L 20 48"
            stroke="url(#bracketGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Top Right Bracket */}
          <path
            d="M 80 48 L 80 32 L 68 32"
            stroke="url(#bracketGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Bottom Container Base */}
          <path
            d="M 20 54 L 20 70 C 20 78, 30 82, 40 82 L 72 82 C 78 82, 80 76, 80 70 L 80 54"
            stroke="url(#bracketGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Left Arrow Bracket < */}
          <path
            d="M 22 52 L 12 56 L 22 60"
            stroke="#22c55e"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Right Arrow Bracket > */}
          <path
            d="M 78 52 L 88 56 L 78 60"
            stroke="#22c55e"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Growing Green Leaf arising from the center */}
          <path
            d="M 52 52 C 50 34, 38 18, 22 14 C 20 28, 26 44, 44 46 C 47 46.5, 49 48, 50 51 Z"
            fill="url(#leafGrad)"
            filter="url(#ecoGlow)"
          />
          {/* Leaf vein */}
          <path
            d="M 24 16 C 33 26, 42 36, 48 48"
            stroke="#14532d"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* The Stem looping organically down */}
          <path
            d="M 50 50 C 53 58, 48 76, 32 76 C 24 76, 20 70, 24 64 C 27 58, 44 54, 58 54 C 70 54, 76 60, 76 68 C 76 74, 70 78, 62 78 L 48 78"
            stroke="#22c55e"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Letter "E" */}
          <path
            d="M 34 46 L 26 46 L 26 64 L 34 64 M 26 55 L 32 55"
            stroke="#22c55e"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Letter "C" */}
          <path
            d="M 46 47 C 41 46, 36 50, 36 55 C 36 60, 41 64, 46 63"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Letter "O" */}
          <path
            d="M 68 55 C 68 50, 73 47, 78 47 C 83 47, 88 50, 88 55 C 88 60, 83 63, 78 63 C 73 63, 68 60, 68 55 Z"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`font-mono font-bold tracking-tight text-white ${text}`}>
              EcoTrace<span className="text-emerald-400">-CLI</span>
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
              v1.0.0
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono tracking-wide">
            Kiroween Skeleton Crew • Logistics Carbon Auditor
          </span>
        </div>
      )}
    </div>
  );
};
