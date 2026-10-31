import React from 'react';
import { cn } from '../../lib/utils.js';

export function Spotlight({ className = '', fill = 'rgba(144, 101, 239, 0.22)' }) {
  return (
    <svg
      className={cn('pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 blur-3xl', className)}
      width="1000"
      height="1000"
      viewBox="0 0 1000 1000"
      fill="none"
      aria-hidden="true"
    >
      <g filter="url(#filter-spotlight)">
        <ellipse cx="500" cy="500" rx="380" ry="260" fill={fill} />
      </g>
      <defs>
        <filter id="filter-spotlight" x="-100" y="-100" width="1200" height="1200" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="110" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </svg>
  );
}
