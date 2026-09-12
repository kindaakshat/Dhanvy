'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LeoBrand } from './LeoBrand';
import { UserProfileDropdown } from './UserProfileDropdown';
import {
  LayoutDashboard,
  Bot,
  FileCheck,
  ArrowRightLeft,
  Flame,
  Binary,
  CheckSquare,
  AlertTriangle,
  PlayCircle,
  Settings,
  ShoppingBag,
  CreditCard,
  Globe,
  Repeat,
  Sparkles,
} from 'lucide-react';

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Mandates', href: '/mandates', icon: FileCheck },
  { name: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
];

const securityNav = [
  { name: 'Idempotency Lab', href: '/idempotency', icon: Repeat },
  { name: 'Attack Lab', href: '/attack-lab', icon: Flame },
  { name: 'Audit', href: '/audit', icon: Binary },
];

const operationsNav = [
  { name: 'Approvals', href: '/approvals', icon: CheckSquare },
  { name: 'Disputes', href: '/disputes', icon: AlertTriangle },
];

const simulationNav = [
  { name: 'Agent Simulator', href: '/simulator', icon: PlayCircle, badge: 'DEMO' },
  { name: 'Shopping Agent', href: '/agent', icon: ShoppingBag },
  { name: 'Gateway Lab', href: '/gateway', icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  const isNavActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 select-none h-screen z-20">
      <div className="overflow-y-auto">
        {/* Top Wordmark & Brand */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between">
          <LeoBrand size="md" theme="dark" href="/dashboard" />
          <Link
            href="/"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title="View Public Website"
          >
            <Globe className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Razorpay Test Mode Badge */}
        <div className="px-4 py-3 border-b border-slate-800/60">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300 uppercase">
                RAZORPAY TEST MODE
              </span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          </div>
        </div>

        {/* Hackathon Demo 3-Min Pitch Callout */}
        <div className="px-3 pt-3">
          <Link
            href="/demo"
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
              pathname === '/demo'
                ? 'bg-gradient-to-r from-indigo-900/80 to-blue-900/80 border-indigo-500 text-white shadow-md shadow-indigo-500/20 ring-1 ring-indigo-400/40'
                : 'bg-gradient-to-r from-indigo-950/40 to-blue-950/40 border-indigo-500/40 text-indigo-200 hover:border-indigo-400 hover:bg-indigo-900/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold tracking-tight">Hackathon Demo</div>
                <div className="text-[10px] text-slate-400 font-sans">Full 10-step guided flow</div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500 text-white shadow-xs shrink-0">
              3-MIN PITCH
            </span>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="px-3 py-4 space-y-6">
          {/* MAIN */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
              Main
            </div>
            <nav className="space-y-0.5">
              {mainNav.map((item) => {
                const active = isNavActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-blue-600/10 text-white border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* SECURITY */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
              Security
            </div>
            <nav className="space-y-0.5">
              {securityNav.map((item) => {
                const active = isNavActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-blue-600/10 text-white border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* OPERATIONS */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
              Operations
            </div>
            <nav className="space-y-0.5">
              {operationsNav.map((item) => {
                const active = isNavActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-blue-600/10 text-white border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* SIMULATION */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
              Simulation
            </div>
            <nav className="space-y-0.5">
              {simulationNav.map((item) => {
                const active = isNavActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-blue-600/10 text-white border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {(item as any).badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 tracking-wider">
                        {(item as any).badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* SETTINGS */}
          <div>
            <Link
              href="/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isNavActive('/settings')
                  ? 'bg-blue-600/10 text-white border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
              }`}
            >
              <Settings className={`w-4 h-4 ${isNavActive('/settings') ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom User Info & Status */}
      <div className="p-4 border-t border-slate-800 bg-[#070b16]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-emerald-400">System Operational</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">v2.0</span>
        </div>

        <UserProfileDropdown variant="sidebar" />
      </div>
    </aside>
  );
}
