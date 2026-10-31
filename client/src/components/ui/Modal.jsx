import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { FiX } from 'react-icons/fi';
import { cn } from '../../lib/utils.js';

const sizeMap = {
  sm: 'max-w-[420px]',
  md: 'max-w-[600px]',
  lg: 'max-w-[800px]',
  xl: 'max-w-[1000px]',
  default: 'max-w-[640px]',
};

/**
 * Global Full-Browser Centered Modal System
 * Rendered via ReactDOM.createPortal directly into document.body
 * Centered strictly relative to the complete browser viewport (100vw x 100dvh)
 */
export function Modal({
  title,
  description,
  badge,
  close,
  children,
  size = 'default',
  className = '',
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer,
}) {
  const backdropRef = useRef(null);
  const dialogRef = useRef(null);
  const closingRef = useRef(false);

  // Smooth exit animation before calling close
  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (!backdropRef.current || !dialogRef.current) {
      close?.();
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      close?.();
      return;
    }

    gsap.to(dialogRef.current, {
      opacity: 0,
      scale: 0.96,
      y: 10,
      duration: 0.18,
      ease: 'power2.in',
    });

    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        close?.();
      },
    });
  }, [close]);

  // Entrance animation & body scroll lock
  useEffect(() => {
    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    // GSAP entrance
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && backdropRef.current && dialogRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.22, ease: 'power2.out' }
      );
      gsap.fromTo(
        dialogRef.current,
        { opacity: 0, scale: 0.95, y: 16 },
        { opacity: 1, scale: 1, y: 0, duration: 0.26, ease: 'power2.out' }
      );
    }

    // Escape key listener
    const onKeyDown = (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeOnEscape, handleClose]);

  if (typeof document === 'undefined') return null;

  const modalElement = (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] w-screen h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-[#070D1E]/75 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === backdropRef.current) {
          handleClose();
        }
      }}
      role="presentation"
      style={{ margin: 0 }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-modal-title"
        className={cn(
          'relative w-full max-h-[88dvh] flex flex-col rounded-2xl border border-app-border bg-app-surface text-app-text shadow-modal my-auto transition-colors',
          sizeMap[size] || sizeMap.default,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-app-border p-5 sm:p-6 pb-4">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2.5">
              {badge && (
                <span className="rounded-full bg-brand-gold/15 px-2.5 py-0.5 text-[11px] font-semibold text-brand-gold uppercase tracking-wider">
                  {badge}
                </span>
              )}
              <h3 id="global-modal-title" className="text-lg font-bold text-app-text tracking-tight sm:text-xl">
                {title}
              </h3>
            </div>
            {description && (
              <p className="text-xs text-app-text-muted leading-relaxed sm:text-sm">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-secondary hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <FiX size={19} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>

        {/* Optional Global Modal Footer */}
        {footer && (
          <div className="border-t border-app-border bg-app-secondary/30 px-5 py-4 sm:px-6 flex items-center justify-end gap-3 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}

/**
 * Standard Reusable Form Controls for the Midnight Executive Design System
 */
export function FormField({ label, required, description, error, children, className = '' }) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-xs font-medium text-app-text', className)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1">
          {label}
          {required && <span className="text-rose-500 font-bold">*</span>}
        </span>
      </div>
      {children}
      {description && <p className="text-[11px] text-app-text-muted leading-normal">{description}</p>}
      {error && <span className="text-[11px] font-medium text-rose-500">{error}</span>}
    </label>
  );
}

export function FormInput({ className = '', ...props }) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-text-muted/60 transition-all focus:border-app-accent focus:ring-2 focus:ring-app-ring focus:outline-none disabled:opacity-50 disabled:bg-app-secondary/40',
        className
      )}
      {...props}
    />
  );
}

export function FormSelect({ className = '', children, ...props }) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text transition-all focus:border-app-accent focus:ring-2 focus:ring-app-ring focus:outline-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FormTextarea({ className = '', ...props }) {
  return (
    <textarea
      className={cn(
        'w-full min-h-[84px] rounded-lg border border-app-border bg-app-surface p-3 text-sm text-app-text placeholder:text-app-text-muted/60 transition-all focus:border-app-accent focus:ring-2 focus:ring-app-ring focus:outline-none disabled:opacity-50 resize-y',
        className
      )}
      {...props}
    />
  );
}

export function ModalFooter({ onCancel, cancelLabel = 'Cancel', submitLabel = 'Submit', busy = false, submitDisabled = false, submitVariant = 'default' }) {
  return (
    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-app-border mt-4 w-full">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-10 rounded-lg border border-app-border bg-transparent px-4 py-2 text-sm font-medium text-app-text hover:bg-app-secondary focus:outline-none focus:ring-2 focus:ring-app-ring transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        disabled={busy || submitDisabled}
        className={cn(
          'h-10 rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-app-ring disabled:opacity-50 inline-flex items-center justify-center gap-2',
          submitVariant === 'destructive'
            ? 'bg-rose-600 hover:bg-rose-700'
            : 'bg-app-accent hover:bg-app-accent-hover'
        )}
      >
        {busy ? (
          <>
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Processing…</span>
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
