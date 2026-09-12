'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Bot,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileCheck,
  CreditCard,
  Hash,
  Activity,
} from 'lucide-react';

interface ScenarioData {
  id: 'legitimate' | 'blocked';
  label: string;
  agentName: string;
  agentRole: string;
  trustScore: number;
  prompt: string;
  item: string;
  amount: number;
  ceiling: number;
  merchant: string;
  merchantStatus: 'Authorized' | 'Unauthorized';
  intentDrift: number;
  driftThreshold: number;
  verdict: 'APPROVED' | 'BLOCKED';
  reasonCode: string;
  railAction: string;
  hash: string;
  latencyMs: number;
  checkpointsPassed: number;
}

const SCENARIOS: Record<'legitimate' | 'blocked', ScenarioData> = {
  legitimate: {
    id: 'legitimate',
    label: 'Compliant Purchase',
    agentName: 'ProcureBot-v4',
    agentRole: 'Supply Operations',
    trustScore: 98.4,
    prompt: 'Order 10x Cat6 Ethernet Cables under ₹2,000',
    item: '10-Pack RJ45 Cat6 Patch Cables (2m)',
    amount: 1499,
    ceiling: 2000,
    merchant: 'Amazon Business India',
    merchantStatus: 'Authorized',
    intentDrift: 0.02,
    driftThreshold: 0.15,
    verdict: 'APPROVED',
    reasonCode: 'ALL_CHECKPOINTS_PASSED',
    railAction: 'Dispatched to Razorpay (order_TL_9420)',
    hash: '0x8f7a90b...e41c',
    latencyMs: 8.7,
    checkpointsPassed: 17,
  },
  blocked: {
    id: 'blocked',
    label: 'Intent Drift Attack',
    agentName: 'ProcureBot-v4',
    agentRole: 'Supply Operations',
    trustScore: 42.1,
    prompt: 'Order 10x Cat6 Ethernet Cables under ₹2,000',
    item: 'Gaming Laptop RTX 4070 High-Perf',
    amount: 72999,
    ceiling: 2000,
    merchant: 'TechHub Global Outlet',
    merchantStatus: 'Unauthorized',
    intentDrift: 0.89,
    driftThreshold: 0.15,
    verdict: 'BLOCKED',
    reasonCode: 'INTENT_DRIFT_AND_CEILING_BREACH',
    railAction: 'Zero Rail Call • Halted at Gate',
    hash: '0x2c4e19f...99aa',
    latencyMs: 6.2,
    checkpointsPassed: 3,
  },
};

export function LiquidHero() {
  const [activeTab, setActiveTab] = useState<'legitimate' | 'blocked'>('legitimate');
  const scenario = SCENARIOS[activeTab];

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-36 pb-20 sm:pb-28 px-6 sm:px-8">
      {/* Full-bleed soft gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none -z-10 liquid-mesh-hero" />

      {/* Modern diffused radial lighting orbs */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2 w-[680px] h-[380px] rounded-full pointer-events-none -z-10 blur-3xl opacity-60"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(167, 139, 250, 0.25), rgba(129, 140, 248, 0.2), transparent 70%)',
        }}
      />
      <div
        className="absolute top-64 right-8 w-[400px] h-[320px] rounded-full pointer-events-none -z-10 blur-3xl opacity-45"
        style={{
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.28), rgba(196, 181, 253, 0.15), transparent 70%)',
        }}
      />

      <div className="max-w-4xl mx-auto text-center space-y-7">
        {/* Stat line above headline in muted gray-purple */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/75 backdrop-blur-md border border-purple-200/50 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
          </span>
          <span className="text-xs font-medium tracking-tight text-slate-600">
            Zero leakage across <strong className="text-slate-900 font-semibold">14,280+</strong> transactions verified
          </span>
        </div>

        {/* Oversized two-tone headline */}
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-bold tracking-tight text-[#0a0f1d] leading-[1.05]">
            The control layer for
          </h1>
          <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-bold tracking-tight leading-[1.05] bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            autonomous payments.
          </h1>
        </div>

        {/* High-contrast subhead */}
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          AI agents are making purchases on behalf of users. LEO provides the deterministic financial boundary — enforcing mathematical mandates and halting unauthorized execution before funds ever move.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-white font-semibold text-sm liquid-glass-button group"
          >
            <span>Get started with LEO</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-full text-slate-700 hover:text-slate-950 font-semibold text-sm liquid-glass-secondary"
          >
            <span>Explore control center</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </Link>
        </div>

        {/* Subtitle live status */}
        <div className="pt-1 flex items-center justify-center gap-2 text-xs text-slate-500 font-normal">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-700">LEO Gateway: Operational</span>
          <span className="text-slate-300">•</span>
          <span>17 Deterministic Checkpoints</span>
          <span className="text-slate-300">•</span>
          <span>Settlement Rail Connected</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FLOATING GLASS CARD: Live Authorization Decision Packet   */}
      {/* ========================================================= */}
      <div className="mt-14 sm:mt-16 max-w-4xl mx-auto">
        <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 transition-all duration-300 relative shadow-[0_16px_48px_rgba(80,60,200,0.08)]">
          {/* Glowing accent corner */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-200/35 via-indigo-100/20 to-transparent rounded-tr-3xl pointer-events-none" />

          {/* Header Row: Live indicator + Scenario Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/60">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-slate-200/80 shadow-xs">
                <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span className="text-xs font-semibold text-slate-800 tracking-wide uppercase">
                  Live Decision Packet #8842
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{scenario.latencyMs}ms verification latency</span>
              </div>
            </div>

            {/* Interactive Scenario Toggle Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 text-xs font-medium self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('legitimate')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'legitimate'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Legitimate Purchase</span>
              </button>
              <button
                onClick={() => setActiveTab('blocked')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'blocked'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Simulated Attack</span>
              </button>
            </div>
          </div>

          {/* Packet Details Grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left Column: Agent & Mandate Intent (5 cols) */}
            <div className="md:col-span-5 space-y-3.5">
              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Autonomous Agent
                  </span>
                  <span className="flex items-center gap-1 text-indigo-700 text-xs font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100/60">
                    <Bot className="w-3.5 h-3.5" />
                    {scenario.agentName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                  <span>{scenario.agentRole}</span>
                  <span className="font-medium text-slate-700">
                    Trust Score: <strong className={scenario.trustScore > 60 ? 'text-emerald-600' : 'text-rose-600'}>{scenario.trustScore}</strong>
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Human Mandate Intent
                  </span>
                  <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xs font-medium text-slate-800 bg-slate-50/90 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                  &ldquo;{scenario.prompt}&rdquo;
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Spend Ceiling Cap:</span>
                  <span className="font-bold text-slate-900 font-mono-tabular">
                    ₹{scenario.ceiling.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Real-time Evaluation & Verdict (7 cols) */}
            <div className="md:col-span-7 space-y-3.5">
              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Proposed Transaction vs Mandate
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    Checkpoints: <strong className="text-slate-900">{scenario.checkpointsPassed}/17</strong>
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    <span className="text-slate-500 font-medium">Target Item:</span>
                    <span className="font-semibold text-slate-900 truncate max-w-[210px]">
                      {scenario.item}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                      <span className="text-slate-500 text-[11px] font-medium">Cart Amount</span>
                      <span className={`text-base font-bold font-mono-tabular ${scenario.amount > scenario.ceiling ? 'text-rose-600' : 'text-slate-950'}`}>
                        ₹{scenario.amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                      <span className="text-slate-500 text-[11px] font-medium">Semantic Drift</span>
                      <span className={`text-sm font-semibold ${scenario.intentDrift > scenario.driftThreshold ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {scenario.intentDrift.toFixed(2)} <span className="text-xs font-normal text-slate-400">(max {scenario.driftThreshold})</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    <span className="text-slate-500 font-medium">Merchant Scope:</span>
                    <span className={`font-semibold ${scenario.merchantStatus === 'Authorized' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {scenario.merchant} ({scenario.merchantStatus})
                    </span>
                  </div>
                </div>
              </div>

              {/* Verdict Banner */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  scenario.verdict === 'APPROVED'
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/90 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      scenario.verdict === 'APPROVED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-rose-600 text-white shadow-xs'
                    }`}
                  >
                    {scenario.verdict === 'APPROVED' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold tracking-wider uppercase">
                      VERDICT: {scenario.verdict}
                    </div>
                    <div className="text-xs font-medium opacity-85">
                      {scenario.railAction}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 self-end sm:self-center font-mono">
                  SHA-256: <code className="text-slate-700 font-semibold">{scenario.hash}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
