import React from 'react';
import Link from 'next/link';

interface LeoBrandProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  theme?: 'light' | 'dark';
  href?: string;
}

export function LeoBrand({
  size = 'md',
  showTagline = false,
  theme = 'light',
  href = '/',
}: LeoBrandProps) {
  const isDark = theme === 'dark';

  const sizeClasses = {
    sm: 'text-base tracking-tight',
    md: 'text-xl tracking-tight',
    lg: 'text-2xl tracking-tighter',
    xl: 'text-3xl tracking-tighter',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  }[size];

  const content = (
    <div className="inline-flex items-center gap-2.5 select-none group">
      {/* Minimal geometric authorization-gate symbol */}
      <div
        className={`flex items-center justify-center rounded-md transition-colors ${iconSizes} ${
          isDark
            ? 'bg-white text-black'
            : 'bg-slate-900 text-white group-hover:bg-slate-800'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5"
        >
          {/* Authorization gate minimal glyph: an L integrated with an authorization barrier */}
          <path d="M6 4v16h12" />
          <path d="M14 8l4 4-4 4" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-bold font-sans ${sizeClasses} leading-none ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          LEO
        </span>
        {showTagline && (
          <span
            className={`text-[10px] tracking-wider uppercase font-mono mt-0.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Autonomous Payment Control
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
}
