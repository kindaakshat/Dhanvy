'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LeoBrand } from '@/components/LeoBrand';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  Menu,
  X,
  Shield,
  Bot,
  Terminal,
  FileCheck,
  Repeat,
  Binary,
  Layers,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

export function LiquidNav() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'liquid-glass-nav py-3'
          : 'bg-white/40 backdrop-blur-md border-b border-white/20 py-4 sm:py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-10">
          <LeoBrand size="md" href="/" />

          {/* Desktop Nav Items with Hover Flyouts */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-700">
            {/* Product Mega Menu */}
            <div
              className="relative group"
              onMouseEnter={() => setActiveMenu('product')}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 px-3 py-2 rounded-lg hover:text-slate-950 hover:bg-white/60 transition-colors">
                <span>Product</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:rotate-180" />
              </button>

              {activeMenu === 'product' && (
                <div className="absolute top-full left-0 mt-1.5 w-80 p-3 rounded-2xl liquid-glass-card shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="space-y-1">
                    <Link
                      href="/mandates"
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/80 transition-all text-slate-800 hover:text-slate-950"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Mandate Engine</div>
                        <div className="text-[11px] text-slate-500">
                          Ceilings, velocity limits & temporal scopes
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/attack-lab"
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/80 transition-all text-slate-800 hover:text-slate-950"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Attack Simulation Lab</div>
                        <div className="text-[11px] text-slate-500">
                          Live adversarial test vectors & defense proofs
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/audit"
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/80 transition-all text-slate-800 hover:text-slate-950"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Binary className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">SHA-256 Audit Trail</div>
                        <div className="text-[11px] text-slate-500">
                          Cryptographically chained forensic logs
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Solutions Link */}
            <div
              className="relative group"
              onMouseEnter={() => setActiveMenu('solutions')}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 px-3 py-2 rounded-lg hover:text-slate-950 hover:bg-white/60 transition-colors">
                <span>Solutions</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:rotate-180" />
              </button>

              {activeMenu === 'solutions' && (
                <div className="absolute top-full left-0 mt-1.5 w-80 p-3 rounded-2xl liquid-glass-card shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="space-y-1">
                    <Link
                      href="/agent"
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/80 transition-all text-slate-800 hover:text-slate-950"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Autonomous Procurement</div>
                        <div className="text-[11px] text-slate-500">
                          Restocking supplies without human friction
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/approvals"
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/80 transition-all text-slate-800 hover:text-slate-950"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Human-in-the-Loop</div>
                        <div className="text-[11px] text-slate-500">
                          Policy escalations for high-value orders
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Developers Link */}
            <Link
              href="/simulator"
              className="px-3 py-2 rounded-lg hover:text-slate-950 hover:bg-white/60 transition-colors"
            >
              Developers
            </Link>

            {/* Resources Link */}
            <Link
              href="/audit"
              className="px-3 py-2 rounded-lg hover:text-slate-950 hover:bg-white/60 transition-colors"
            >
              Resources
            </Link>
          </nav>
        </div>

        {/* Right CTAs */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-700 hover:text-slate-950 px-3 py-1.5 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold text-white liquid-glass-button shadow-md"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <div className="flex sm:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-700 hover:text-slate-950"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="sm:hidden liquid-glass-card border-t border-white/50 px-6 py-5 space-y-4 shadow-xl">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-800">
            <Link
              href="/mandates"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 hover:text-indigo-600"
            >
              Mandate Engine
            </Link>
            <Link
              href="/attack-lab"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 hover:text-indigo-600"
            >
              Attack Simulation Lab
            </Link>
            <Link
              href="/simulator"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 hover:text-indigo-600"
            >
              Transaction Simulator
            </Link>
            <Link
              href="/audit"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 hover:text-indigo-600"
            >
              Cryptographic Audit
            </Link>
          </nav>
          <div className="pt-3 border-t border-slate-200/60 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="text-center py-2 text-sm font-medium text-slate-700"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="text-center py-2.5 rounded-full text-xs font-semibold text-white liquid-glass-button"
            >
              Launch Dashboard →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
