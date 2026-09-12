'use client';

import React, { useState } from 'react';
import { fetchApi } from '@/lib/api';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Play,
  Flame,
  CreditCard,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface AuthResponse {
  decision: 'APPROVED' | 'BLOCKED' | 'REVIEW';
  riskScore: number;
  decisionReasons: string[];
  checks: Array<{ name: string; status: 'PASSED' | 'FAILED'; details: string }>;
  razorpayOrder?: { orderId: string; amount: number; mode: string };
  trustImpact?: { previousScore: number; newScore: number };
}

export function LiveAuthorizationDemo() {
  const [prompt, setPrompt] = useState('Buy me a Logitech keyboard from Amazon under ₹5,000.');
  const [agentAction, setAgentAction] = useState({
    product: 'Logitech K380 Multi-Device Bluetooth Keyboard',
    merchant: 'Amazon',
    amount: 3999, // in INR
  });
  const [loading, setLoading] = useState(false);
  const [lastIdempotencyKey, setLastIdempotencyKey] = useState<string>('');
  const [activeAttack, setActiveAttack] = useState<string | null>(null);
  const [result, setResult] = useState<AuthResponse | null>(null);

  const runEvaluation = async (overrideAction?: {
    product: string;
    merchant: string;
    amount: number;
    idempotencyKey?: string;
    attackLabel?: string;
  }) => {
    setLoading(true);
    const action = overrideAction || agentAction;
    const key = overrideAction?.idempotencyKey || `idemp_live_${Date.now()}`;
    if (!overrideAction?.idempotencyKey) {
      setLastIdempotencyKey(key);
    }
    setActiveAttack(overrideAction?.attackLabel || null);

    try {
      const res = await fetchApi<any>('/api/authorize', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: key,
          agentId: 'agent_shop_01',
          mandateId: 'mnd_amazon_01',
          userIntentPrompt: prompt,
          merchant: action.merchant,
          category: 'Electronics',
          product: action.product,
          amount: Math.round(action.amount * 100), // paise
          currency: 'INR',
        }),
      });
      setResult(res);
    } catch (err: any) {
      alert(err.message || 'Authorization call failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLegitEvaluate = () => {
    const normal = {
      product: 'Logitech K380 Multi-Device Bluetooth Keyboard',
      merchant: 'Amazon',
      amount: 3999,
    };
    setAgentAction(normal);
    runEvaluation({ ...normal, attackLabel: undefined });
  };

  const handleAttackAmountOverride = () => {
    const attack = {
      product: 'Logitech Mechanical Gaming Keyboard Pro',
      merchant: 'Amazon',
      amount: 6499,
      attackLabel: 'Amount Override (₹6,499)',
    };
    setAgentAction({
      product: attack.product,
      merchant: attack.merchant,
      amount: attack.amount,
    });
    runEvaluation(attack);
  };

  const handleAttackMerchant = () => {
    const attack = {
      product: 'Mechanical Keyboard via ShadyStore',
      merchant: 'ShadyStore.xyz',
      amount: 3500,
      attackLabel: 'Different Merchant (ShadyStore)',
    };
    setAgentAction({
      product: attack.product,
      merchant: attack.merchant,
      amount: attack.amount,
    });
    runEvaluation(attack);
  };

  const handleAttackIntentDrift = () => {
    const attack = {
      product: 'Apple MacBook Pro M3 14-inch 512GB',
      merchant: 'Amazon',
      amount: 72000,
      attackLabel: 'MacBook ₹72,000 (Intent Drift)',
    };
    setAgentAction({
      product: attack.product,
      merchant: attack.merchant,
      amount: attack.amount,
    });
    runEvaluation(attack);
  };

  const handleAttackReplay = () => {
    const key = lastIdempotencyKey || `idemp_replay_fixed_demo_1`;
    const attack = {
      product: agentAction.product,
      merchant: agentAction.merchant,
      amount: agentAction.amount,
      idempotencyKey: key,
      attackLabel: 'Duplicate Request (Replay Attack)',
    };
    runEvaluation(attack);
  };

  return (
    <div id="demo" className="w-full bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 p-6 md:p-12 shadow-2xl relative overflow-hidden">
      {/* Decorative background aura */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="max-w-3xl mb-10 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-medium text-slate-300 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Interactive Live API Integration</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
          Try LEO in real time.
        </h2>
        <p className="text-base text-slate-400 mt-3 leading-relaxed">
          This is not a mock or an animation. Every interaction dispatches directly to the live LEO deterministic engine and Razorpay Test Mode settlement rail.
        </p>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Column: Input and Attack Presets */}
        <div className="lg:col-span-5 space-y-6">
          {/* User Request Input */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>User Request (Natural Language)</span>
              </label>
              <span className="text-[10px] font-mono text-emerald-400">Target Ceiling: ₹5,000</span>
            </div>
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-blue-500 transition-colors resize-none"
            />

            <button
              onClick={handleLegitEvaluate}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white text-slate-950 font-semibold text-sm hover:bg-slate-100 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && !activeAttack ? (
                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>Evaluate →</span>
                </>
              )}
            </button>
          </div>

          {/* Attack Triggers */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>Try an attack against LEO</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">REAL ENGINE CHECKS</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Test how LEO immediately blocks unauthorized actions before they reach the payment rail:
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleAttackAmountOverride}
                disabled={loading}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all flex flex-col justify-between gap-1 ${
                  activeAttack?.includes('Amount')
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-rose-800/60 hover:text-white'
                }`}
              >
                <span className="font-bold text-rose-400">₹6,499</span>
                <span className="text-[10px] text-slate-400">Amount override</span>
              </button>

              <button
                onClick={handleAttackMerchant}
                disabled={loading}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all flex flex-col justify-between gap-1 ${
                  activeAttack?.includes('Merchant')
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-rose-800/60 hover:text-white'
                }`}
              >
                <span className="font-bold text-rose-400">Different merchant</span>
                <span className="text-[10px] text-slate-400">Unmandated vendor</span>
              </button>

              <button
                onClick={handleAttackIntentDrift}
                disabled={loading}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all flex flex-col justify-between gap-1 ${
                  activeAttack?.includes('MacBook')
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-rose-800/60 hover:text-white'
                }`}
              >
                <span className="font-bold text-rose-400">MacBook ₹72,000</span>
                <span className="text-[10px] text-slate-400">Intent drift 14x</span>
              </button>

              <button
                onClick={handleAttackReplay}
                disabled={loading}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all flex flex-col justify-between gap-1 ${
                  activeAttack?.includes('Duplicate')
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-rose-800/60 hover:text-white'
                }`}
              >
                <span className="font-bold text-rose-400">Duplicate request</span>
                <span className="text-[10px] text-slate-400">Replay violation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Outcome */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 md:p-7 flex flex-col justify-between space-y-6">
          <div>
            {/* Header / Verdict */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase">
                  Engine Evaluation Verdict
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Autonomous Decision Trace
                </h3>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
                  <div className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  <span>Evaluating live...</span>
                </div>
              ) : result ? (
                <span
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold tracking-wider ${
                    result.decision === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : result.decision === 'BLOCKED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {result.decision}
                </span>
              ) : (
                <span className="text-xs font-mono text-slate-500">Ready for evaluation</span>
              )}
            </div>

            {/* Agent Action Proposal */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 mb-4">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                  <span>Agent Action</span>
                </span>
                <span className="text-white font-bold">
                  ₹{agentAction.amount.toLocaleString()} INR
                </span>
              </div>
              <div className="text-xs font-mono text-slate-300">
                <span className="text-slate-100 font-medium">{agentAction.product}</span>
                <div className="text-slate-400 mt-1">Merchant: {agentAction.merchant}</div>
              </div>
            </div>

            {/* LEO Checks */}
            {result ? (
              <div className="space-y-3">
                <span className="text-[11px] font-mono text-slate-400 uppercase block">
                  Deterministic Checks:
                </span>
                <div className="space-y-1.5 font-mono text-xs">
                  {result.checks.map((chk, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        chk.status === 'PASSED'
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                          : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {chk.status === 'PASSED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span className="font-semibold">{chk.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate max-w-xs pl-2">
                        {chk.details}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Reasons */}
                {result.decisionReasons && result.decisionReasons.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5 font-mono text-[10px]">
                    {result.decisionReasons.map((r, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded border ${
                          result.decision === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border-rose-800'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-xs font-mono text-slate-500">
                Click &ldquo;Evaluate →&rdquo; or one of the attack scenarios to trigger the live pipeline.
              </div>
            )}
          </div>

          {/* Payment Rail Settlement Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-white font-medium block">Razorpay Settlement Rail</span>
                <span className="text-[10px] text-slate-500">
                  {result?.razorpayOrder
                    ? `Order: ${result.razorpayOrder.orderId} (Test Mode)`
                    : 'Zero API calls made when action is blocked'}
                </span>
              </div>
            </div>

            {result?.decision === 'APPROVED' ? (
              <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SETTLEMENT CREATED
              </span>
            ) : result?.decision === 'BLOCKED' ? (
              <span className="px-2 py-1 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                RAIL INHIBITED
              </span>
            ) : (
              <span className="text-slate-600">Pending</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
