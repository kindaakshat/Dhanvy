'use client';

import React, { useState } from 'react';
import { Bot, User, Shield, CreditCard, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

export function InteractiveHeroVisual() {
  const [activeStage, setActiveStage] = useState<'intent' | 'agent' | 'leo' | 'rail'>('leo');
  const [activeLeoSubcheck, setActiveLeoSubcheck] = useState<string>('Mandate');

  const leoSubchecks = [
    { name: 'Identity', desc: 'Cryptographic public-key verification & agent registration' },
    { name: 'Capability', desc: 'Hardware-level enforcement of permitted actions & zero escalation' },
    { name: 'Mandate', desc: 'Hard mathematical bounds: ₹5,000 max single tx, approved merchants' },
    { name: 'Intent', desc: 'Semantic divergence verification between user prompt & agent payload' },
    { name: 'Risk', desc: 'Deterministic multi-factor score: amount, velocity, history (0–100)' },
    { name: 'Decision', desc: 'Final deterministic verdict: APPROVED, BLOCKED, or REVIEW' },
  ];

  return (
    <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-2xl text-slate-100 relative overflow-hidden">
      {/* Background subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-5 mb-6 relative z-10">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Authorization Architecture Topology
          </span>
          <h3 className="text-sm font-semibold text-white mt-0.5">
            Real-Time Transaction Pipeline
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-medium">Pipeline Live</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Sub-15ms Latency</span>
        </div>
      </div>

      {/* Flow Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 relative z-10">
        {/* Stage 1: User Intent */}
        <div
          onClick={() => setActiveStage('intent')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeStage === 'intent'
              ? 'bg-slate-800/90 border-slate-600 shadow-md ring-1 ring-slate-600'
              : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 01</span>
            <div className="p-1.5 rounded-md bg-slate-800 text-slate-300">
              <User className="w-3.5 h-3.5" />
            </div>
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
            User Intent
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
            &ldquo;Buy a Logitech keyboard from Amazon under ₹5,000.&rdquo;
          </p>
          <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <span className="text-emerald-400 font-bold">Max Ceiling:</span> ₹5,000
          </div>
        </div>

        {/* Stage 2: AI Agent */}
        <div
          onClick={() => setActiveStage('agent')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeStage === 'agent'
              ? 'bg-slate-800/90 border-slate-600 shadow-md ring-1 ring-slate-600'
              : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 02</span>
            <div className="p-1.5 rounded-md bg-slate-800 text-slate-300">
              <Bot className="w-3.5 h-3.5" />
            </div>
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
            AI Agent
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
            Proposes action: Logitech K380 @ Amazon for ₹3,999.
          </p>
          <div className="mt-3 text-[10px] text-amber-400 flex items-center gap-1 font-mono">
            <span>Probabilistic output</span>
          </div>
        </div>

        {/* Stage 3: LEO (Control Layer) - Highlighted */}
        <div
          onClick={() => setActiveStage('leo')}
          className={`lg:col-span-1 p-4 rounded-xl border transition-all cursor-pointer ${
            activeStage === 'leo'
              ? 'bg-slate-800 border-blue-500/80 shadow-lg ring-1 ring-blue-500/40'
              : 'bg-slate-950/80 border-slate-700 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-blue-400 uppercase font-semibold">
              Stage 03 • Control
            </span>
            <div className="p-1.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>LEO Engine</span>
          </h4>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Deterministic evaluation against active mathematical policies.
          </p>
          <div className="mt-3 text-[10px] text-emerald-400 flex items-center gap-1 font-mono font-semibold">
            <span>Deterministic gate</span>
          </div>
        </div>

        {/* Stage 4: Payment Rail */}
        <div
          onClick={() => setActiveStage('rail')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeStage === 'rail'
              ? 'bg-slate-800/90 border-slate-600 shadow-md ring-1 ring-slate-600'
              : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 04</span>
            <div className="p-1.5 rounded-md bg-slate-800 text-slate-300">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
            Payment Rail
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
            Razorpay Test Mode executes settlement only if authorized.
          </p>
          <div className="mt-3 text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
            <span>Zero pre-auth leakage</span>
          </div>
        </div>
      </div>

      {/* Deep-Dive Inspection Panel inside LEO */}
      <div className="mt-6 pt-6 border-t border-slate-800 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
              Inside LEO: 6 Deterministic Evaluation Checkpoints
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            Click a checkpoint to inspect
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {leoSubchecks.map((chk) => {
            const isSelected = activeLeoSubcheck === chk.name;
            return (
              <button
                key={chk.name}
                onClick={() => setActiveLeoSubcheck(chk.name)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-blue-950/60 border-blue-500/60 text-white'
                    : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono">{chk.name}</span>
                  <CheckCircle2
                    className={`w-3 h-3 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Checkpoint Detail */}
        {activeLeoSubcheck && (
          <div className="mt-3 p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-bold">[{activeLeoSubcheck} Policy]:</span>
              <span className="text-slate-300">
                {leoSubchecks.find((c) => c.name === activeLeoSubcheck)?.desc}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0 self-start sm:self-auto">
              ENFORCED DETERMINISTICALLY
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
