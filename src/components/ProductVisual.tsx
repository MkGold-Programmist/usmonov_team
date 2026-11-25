import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface ProductVisualProps {
  imageKey: string;
  alt: string;
  category?: string;
  className?: string;
  fit?: 'cover' | 'contain';
}

export const UsmonovTeamEmblem: React.FC<{ className?: string }> = ({
  className = 'w-8 h-8',
}) => (
  <svg
    viewBox="0 0 44 44"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    {/* Warm Espresso Shield & Chronometer Ring */}
    <circle cx="22" cy="22" r="20" fill="#1C1917" stroke="#C2410C" strokeWidth="2" />
    <circle cx="22" cy="22" r="15.5" stroke="#D97706" strokeWidth="1" strokeDasharray="3 2.5" />
    {/* Crown / Stopwatch Top */}
    <rect x="19" y="1" width="6" height="3" rx="1.5" fill="#C2410C" />
    {/* Handcrafted "U" & Clock Hands Motif */}
    <path
      d="M15 15V23.5C15 27.366 18.134 30.5 22 30.5C25.866 30.5 29 27.366 29 23.5V15"
      stroke="#FAF6F0"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <path
      d="M22 14V22L26.5 19"
      stroke="#F59E0B"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="22" cy="22" r="2" fill="#C2410C" />
  </svg>
);

export const ProductVisual: React.FC<ProductVisualProps> = ({
  imageKey,
  alt,
  category = 'UsmonovTeam',
  className,
  fit,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageKey]);

  const resolvedFit =
    fit ??
    (imageKey.startsWith('/assets/aistudio/') || imageKey.startsWith('/uploads/products/')
      ? 'contain'
      : 'cover');
  const resolvedClass =
    className ??
    (resolvedFit === 'contain'
      ? 'w-full h-full object-contain p-2.5 bg-white transition-transform duration-300 group-hover:scale-[1.03]'
      : 'w-full h-full object-cover');

  if (imageKey === 'studio_rashguard') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#F3EDE2] p-4 select-none">
        <svg viewBox="0 0 200 180" className="w-4/5 h-4/5" aria-label={alt}>
          <path
            d="M60 22 L82 16 C92 26 108 26 118 16 L140 22 L176 58 L156 80 L138 56 L138 158 L62 158 L62 56 L44 80 L24 58 Z"
            fill="#292524"
            stroke="#C2410C"
            strokeWidth="2.5"
          />
          <path d="M82 16 L62 56 M118 16 L138 56" stroke="#44403C" strokeWidth="2" />
          <text
            x="100"
            y="88"
            textAnchor="middle"
            fill="#FAF6F0"
            fontSize="10.5"
            fontWeight="700"
            letterSpacing="1.5"
          >
            USMONOVTEAM
          </text>
          <text
            x="100"
            y="102"
            textAnchor="middle"
            fill="#F59E0B"
            fontSize="7"
            fontWeight="600"
            letterSpacing="2"
          >
            CRAFT & SPORT
          </text>
          <rect x="62" y="148" width="76" height="5" fill="#C2410C" />
        </svg>
      </div>
    );
  }

  if (imageKey === 'studio_wraps') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#F3EDE2] p-4 select-none">
        <svg viewBox="0 0 200 180" className="w-4/5 h-4/5" aria-label={alt}>
          <ellipse cx="78" cy="60" rx="36" ry="15" fill="#9A3412" stroke="#EA580C" strokeWidth="1.5" />
          <path d="M42 60 V125 C42 134 114 134 114 125 V60" fill="#C2410C" stroke="#7C2D12" strokeWidth="2" />
          <ellipse cx="78" cy="60" rx="20" ry="8" fill="#7C2D12" />
          <rect x="48" y="84" width="60" height="20" rx="3" fill="#1C1917" />
          <text x="78" y="97" textAnchor="middle" fill="#FAF6F0" fontSize="6.8" fontWeight="700">
            USMONOVTEAM
          </text>

          <ellipse cx="130" cy="72" rx="36" ry="15" fill="#292524" stroke="#57534E" strokeWidth="1.5" />
          <path d="M94 72 V136 C94 145 166 145 166 136 V72" fill="#1C1917" stroke="#292524" strokeWidth="2" />
          <rect x="104" y="96" width="52" height="20" rx="3" fill="#FAF6F0" />
          <text x="130" y="109" textAnchor="middle" fill="#B45309" fontSize="8" fontWeight="700">
            COTTON 4.5M
          </text>
        </svg>
      </div>
    );
  }

  if (imgError || !imageKey) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#F3EDE2] p-4 text-center">
        <Shield className="w-9 h-9 text-[#C2410C] mb-2 opacity-80" />
        <span className="text-xs font-semibold text-[#1C1917] line-clamp-2">{alt}</span>
        <span className="text-[11px] text-[#78716C] mt-0.5">{category}</span>
      </div>
    );
  }

  return (
    <img
      src={imageKey}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className={resolvedClass}
    />
  );
};
