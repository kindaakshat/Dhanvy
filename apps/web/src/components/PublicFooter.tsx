import React from 'react';
import Link from 'next/link';
import { LeoBrand } from './LeoBrand';
import { CreditCard, ExternalLink } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-slate-900">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <LeoBrand size="lg" theme="dark" />
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              The control layer for autonomous payments. Making agentic commerce payments reliable, bounded, and mathematically verifiable.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span>Current integration: Razorpay Test Mode</span>
              </div>
            </div>
          </div>

          {/* Links Column 1: Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4 font-mono">
              Product
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#product" className="hover:text-white transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="#solutions" className="hover:text-white transition-colors">
                  Autonomous Commerce
                </Link>
              </li>
              <li>
                <Link href="#demo" className="hover:text-white transition-colors">
                  Interactive Demo
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Control Center
                </Link>
              </li>
              <li>
                <Link href="/agent" className="hover:text-white transition-colors">
                  Shopping Agent
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Security & Engine */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4 font-mono">
              Security
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#security" className="hover:text-white transition-colors">
                  Threat Matrix
                </Link>
              </li>
              <li>
                <Link href="/attack-lab" className="hover:text-white transition-colors">
                  Attack Lab
                </Link>
              </li>
              <li>
                <Link href="/audit" className="hover:text-white transition-colors">
                  SHA-256 Audit Chain
                </Link>
              </li>
              <li>
                <Link href="/mandates" className="hover:text-white transition-colors">
                  Financial Mandates
                </Link>
              </li>
              <li>
                <Link href="/approvals" className="hover:text-white transition-colors">
                  Human Review Queue
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Developers */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4 font-mono">
              Developers
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#developers" className="hover:text-white transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/simulator" className="hover:text-white transition-colors">
                  Transaction Simulator
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/kindaakshat/Dhanvy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <Link href="/settings" className="hover:text-white transition-colors">
                  System Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-medium">LEO Network: Operational</span>
            <span className="text-slate-600">|</span>
            <span>Razorpay Settlement Rail Ready</span>
          </div>

          <div className="flex items-center gap-6">
            <span>&copy; {new Date().getFullYear()} LEO. All rights reserved.</span>
            <span>Fintech Infrastructure</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
