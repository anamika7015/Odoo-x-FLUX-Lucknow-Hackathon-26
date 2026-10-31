import React from 'react';
import { cn } from '../../lib/utils.js';

export function Spotlight({ className = '', fill = 'rgba(129,140,248,0.25)' }) {
  return (
    <svg className={cn('pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 blur-3xl', className)} width="900" height="900" viewBox="0 0 900 900" fill="none">
      <g filter="url(#filter)">
        <ellipse cx="450" cy="450" rx="320" ry="220" fill={fill} />
      </g>
      <defs><filter id="filter"><feGaussianBlur stdDeviation="90" /></filter></defs>
    </svg>
  );
}
