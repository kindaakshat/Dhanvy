'use client';

import React from 'react';
import Link from 'next/link';
import { LeoBrand } from '@/components/LeoBrand';
import { ShieldCheck, Activity } from 'lucide-react';

export function LiquidFooter() {
  return (
    <footer className="relative bg-white/40 backdrop-blur-xl border-t border-purple-100/60 pt-16 pb-12 mt-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-purple-100/50">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <LeoBrand size="lg" theme="light" />
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
              The control layer for autonomous payments. Making agentic commerce payments reliable, bounded, and mathematically verifiable.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs font-mono text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LEO Authorization Gateway • Operational</span>
            </div>
          </div>

          {/* Engine Links */}
          <div className="space-y-3 text-xs font-medium">
            <div className="font-mono text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              Governance Engine
            </div>
            <ul className="space-y-2 text-slate-600">
              <li>
                <Link href="/mandates" className="hover:text-indigo-600 transition-colors">
                  Mandate Ceilings
                </Link>
              </li>
              <li>
                <Link href="/attack-lab" className="hover:text-indigo-600 transition-colors">
                  Attack Simulation Lab
                </Link>
              </li>
              <li>
                <Link href="/audit" className="hover:text-indigo-600 transition-colors">
                  SHA-256 Audit Trail
                </Link>
              </li>
              <li>
                <Link href="/approvals" className="hover:text-indigo-600 transition-colors">
                  Human Review Queue
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Links */}
          <div className="space-y-3 text-xs font-medium">
            <div className="font-mono text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              Platform & Tools
            </div>
            <ul className="space-y-2 text-slate-600">
              <li>
                <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">
                  Control Center
                </Link>
              </li>
              <li>
                <Link href="/simulator" className="hover:text-indigo-600 transition-colors">
                  Transaction Simulator
                </Link>
              </li>
              <li>
                <Link href="/agent" className="hover:text-indigo-600 transition-colors">
                  Shopping Agent Demo
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-indigo-600 transition-colors">
                  System Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Deterministic Financial Authorization • Zero Pre-Auth Leakage</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} LEO. Autonomous Commerce Security.
          </div>
        </div>
      </div>
    </footer>
  );
}
