import React from 'react';
import { useRef, useState } from 'react';
import { cn } from '../../lib/utils.js';

export function ThreeDCard({ children, className = '' }) {
  const ref = useRef(null);
  const [transform, setTransform] = useState('');
  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y / rect.height) - 0.5) * -12;
    const rotateY = ((x / rect.width) - 0.5) * 12;
    setTransform(`perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`);
  };
  const reset = () => setTransform('perspective(900px) rotateX(0deg) rotateY(0deg)');
  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ transform, transition: 'transform 0.15s ease' }}
      className={cn('will-change-transform', className)}
    >
      {children}
    </div>
  );
}
