'use client';

import React from 'react';
import Link from 'next/link';
import { PlayCircle, Terminal } from 'lucide-react';
import { UserProfileDropdown } from './UserProfileDropdown';

interface HeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, badge, actions }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-10 px-8 py-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-950">{title}</h1>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-700">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {actions || (
            <>
              <Link
                href="/simulator"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Run Simulator</span>
              </Link>
              <Link
                href="/attack-lab"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-white shadow-xs transition-all"
              >
                <Terminal className="w-3.5 h-3.5 text-slate-300" />
                <span>Attack Lab</span>
              </Link>
            </>
          )}

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <UserProfileDropdown variant="header" />
        </div>
      </div>
    </header>
  );
}
