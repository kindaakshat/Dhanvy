'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { fetchApi } from '@/lib/api';
import {
  Settings,
  Shield,
  CreditCard,
  Server,
  CheckCircle2,
  Lock,
  Sliders,
} from 'lucide-react';

export default function SettingsPage() {
  const [health, setHealth] = useState<any | null>(null);

  useEffect(() => {
    fetchApi<any>('/api/health')
      .then((data) => setHealth(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <AppShell>
      <Header
        title="System Settings"
        subtitle="Configure risk thresholds, governance policies, and verify Razorpay Test Mode integration health."
        badge="GOVERNANCE POLICY"
      />

      <main className="p-8 space-y-8 max-w-5xl text-xs">
        {/* API Health & Environment Status Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">LEO System Health & Runtime</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
              {health?.status || 'OPERATIONAL'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px]">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">ENGINE SPECIFICATION:</span>
              <span className="text-slate-900 font-bold">LEO Deterministic Pipeline</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">RAIL INTEGRATION:</span>
              <span className="text-blue-600 font-bold">{health?.mode || 'RAZORPAY TEST MODE'}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">DATABASE ENGINE:</span>
              <span className="text-emerald-700 font-bold">Prisma ORM (Zero-Leak)</span>
            </div>
          </div>
        </div>

        {/* Risk Thresholds Policy Bands */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Deterministic Risk Policy Bands</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800">AUTOMATIC APPROVAL</span>
                <span className="font-mono text-emerald-800 font-bold text-xs">0 – 39</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Transactions with zero policy violations and healthy agent trust proceed automatically to Razorpay Test order generation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-800">HUMAN ESCALATION</span>
                <span className="font-mono text-amber-800 font-bold text-xs">40 – 69</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Transactions with moderate risk or exceeding the mandate review threshold require manual SecOps supervisor sign-off.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-800">HARD BLOCK</span>
                <span className="font-mono text-rose-800 font-bold text-xs">70 – 100</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Transactions violating financial ceilings, unmandated merchants, intent drift, or unauthorized capabilities are blocked with zero rail leakage.
              </p>
            </div>
          </div>
        </div>

        {/* Security Isolation Notice */}
        <div className="p-6 rounded-2xl bg-slate-950 text-white border border-slate-800 space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-white font-bold">
            <Lock className="w-4 h-4 text-blue-400" />
            <span>Cryptographic & Payment Security Isolation</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-[11px] list-disc pl-5 leading-relaxed font-mono">
            <li>Razorpay API keys and secrets reside strictly on backend environment variables.</li>
            <li>No frontend client bundle ever receives or handles secret credentials.</li>
            <li>Audit trail is sealed with SHA-256 linear hash chaining; any tampering invalidates the hash verification.</li>
            <li>Autonomous agents cannot inspect or alter their own mandate or capability records.</li>
          </ul>
        </div>
      </main>
    </AppShell>
  );
}
