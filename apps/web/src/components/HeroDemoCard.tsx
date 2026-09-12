'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Bot,
  User,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export function HeroDemoCard() {
  const [step, setStep] = useState<number>(3); // 3 = fully evaluated

  const checks = [
    { label: 'Authorized agent', pass: true, detail: 'ShoppingAgent-01 (Trust 94/100)' },
    { label: 'Amazon allowed', pass: true, detail: 'Merchant in authorized list' },
    { label: 'Electronics allowed', pass: true, detail: 'Category matches policy' },
    { label: '₹3,999 ≤ ₹5,000', pass: true, detail: 'Within single-tx ceiling' },
    { label: 'Intent matches', pass: true, detail: 'Divergence delta = 0.0%' },
    { label: 'Risk acceptable', pass: true, detail: 'Score: 12/100 (Threshold 40)' },
  ];

  const handleReset = () => {
    setStep(1);
    setTimeout(() => setStep(2), 600);
    setTimeout(() => setStep(3), 1200);
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-6 md:p-7 shadow-xl shadow-slate-100 relative">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
            Live Authorization Simulation
          </span>
        </div>
        <button
          onClick={handleReset}
          className="text-xs font-mono text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Replay
        </button>
      </div>

      <div className="space-y-4">
        {/* User Request */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <User className="w-3 h-3 text-slate-400" />
            <span>User Request</span>
          </div>
          <p className="text-xs font-medium text-slate-900 font-mono">
            &ldquo;Buy me a Logitech keyboard under ₹5,000.&rdquo;
          </p>
        </div>

        {/* Agent Proposes */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <Bot className="w-3 h-3 text-blue-500" />
              <span>Agent Proposes</span>
            </div>
            <span className="text-xs font-bold font-mono-tabular text-slate-900">
              ₹3,999
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-700">
            <span>Logitech K380 Multi-Device</span>
            <span className="text-slate-500">Merchant: Amazon</span>
          </div>
        </div>

        {/* LEO Evaluation */}
        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold tracking-wide uppercase font-mono">
                LEO Evaluates
              </span>
            </div>
            {step >= 3 ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                APPROVED
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                EVALUATING...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
            {checks.map((chk, idx) => (
              <div
                key={chk.label}
                className={`flex items-center gap-1.5 transition-opacity duration-300 ${
                  step >= 2 || idx < 3 ? 'opacity-100 text-emerald-300' : 'opacity-30 text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{chk.label}</span>
              </div>
            ))}
          </div>

          {/* Payment Outcome */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              <span>Razorpay Test Mode:</span>
            </div>
            <span className="text-emerald-400 font-bold">
              {step >= 3 ? 'Order #TL_DEMO_998124 Created' : 'Inhibiting settlement...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
