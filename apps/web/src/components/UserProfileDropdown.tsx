'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  User as UserIcon, 
  LogOut, 
  Settings, 
  ShieldCheck, 
  ChevronDown, 
  Check, 
  Bot
} from 'lucide-react';

interface UserProfileDropdownProps {
  variant?: 'header' | 'sidebar';
}

export function UserProfileDropdown({ variant = 'header' }: UserProfileDropdownProps) {
  const { user, logout, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 animate-pulse text-xs text-slate-400">
        <div className="w-6 h-6 rounded-full bg-slate-200" />
        <span className="h-3 w-16 bg-slate-200 rounded" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/dashboard"
        className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs"
      >
        Dashboard
      </Link>
    );
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  if (variant === 'sidebar') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 transition-colors text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase shadow-xs shrink-0">
              {initials}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                <span>{user.name || 'User'}</span>
                {user.role === 'ADMIN' && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                    ADMIN
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-2xl bg-[#0e1424] border border-slate-700 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-2 border-b border-slate-800 mb-1">
              <div className="text-xs font-bold text-white truncate">{user.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-mono">Authenticated Session</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Account & Settings</span>
              </Link>
              <Link
                href="/agents"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <Bot className="w-3.5 h-3.5 text-slate-400" />
                <span>My Fleet Agents</span>
              </Link>
            </div>

            <div className="mt-1 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="font-semibold">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Header variant
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-xs transition-all"
        aria-label="User profile menu"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase shadow-xs">
          {initials}
        </div>
        <div className="text-left hidden md:block">
          <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 leading-tight">
            <span className="max-w-[120px] truncate">{user.name || 'Account'}</span>
            {user.role === 'ADMIN' && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                ADMIN
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">{user.email}</div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 p-2 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
            <div className="text-xs font-bold text-slate-900 truncate">{user.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Session
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {user.role}
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Account & Settings</span>
              </div>
            </Link>

            <Link
              href="/agents"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Bot className="w-3.5 h-3.5 text-slate-400" />
                <span>My Fleet Agents</span>
              </div>
            </Link>
          </div>

          <div className="mt-1 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
