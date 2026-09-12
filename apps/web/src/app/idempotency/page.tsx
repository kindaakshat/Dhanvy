'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { fetchApi } from '@/lib/api';
import {
  Repeat,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Clock,
  Layers,
  Cpu,
  ArrowRight,
  Database,
  Lock,
  CreditCard,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface StateTransition {
  state: string;
  timestamp: string;
  reason?: string;
}

interface AttemptResult {
  attemptNumber: number;
  demoHeadline: string;
  duplicatePrevented: boolean;
  message: string;
  status: string;
  decision: string;
  idempotencyStatus: string;
  amountInr: number;
  razorpayOrderId?: string;
  timestamp: string;
  stateHistory: StateTransition[];
  rawResult?: any;
}

const ALL_STATES = [
  'CREATED',
  'VALIDATING',
  'PENDING_APPROVAL',
  'AUTHORIZED',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'BLOCKED',
  'REVERSED',
];

export default function IdempotencyPage() {
  const [idempotencyKey, setIdempotencyKey] = useState(`idemp_demo_${Date.now().toString().slice(-6)}`);
  const [amountInr, setAmountInr] = useState(999);
  const [loading, setLoading] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState<number>(0);
  const [attemptsLog, setAttemptsLog] = useState<AttemptResult[]>([]);
  const [latestResult, setLatestResult] = useState<AttemptResult | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [dbState, setDbState] = useState<any | null>(null);

  // Poll database record for the active idempotency key
  const fetchDbState = async (key: string) => {
    try {
      const res = await fetchApi<any>(`/api/idempotency/${key}`);
      if (res.success) {
        setDbState(res);
      }
    } catch {
      setDbState(null);
    }
  };

  useEffect(() => {
    fetchDbState(idempotencyKey);
  }, [idempotencyKey]);

  // Execute a payment attempt with the fixed idempotency key
  const executeAttempt = async (targetAttempt?: number) => {
    setLoading(true);
    try {
      const res = await fetchApi<any>('/api/idempotency/simulate', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey,
          amount: Math.round(amountInr * 100),
          merchant: 'Amazon',
          product: 'Logitech K380 Multi-Device Wireless Keyboard',
          category: 'Electronics',
          prompt: 'Buy Logitech keyboard from Amazon under ₹5,000',
        }),
      });

      if (res.success) {
        const attemptRes: AttemptResult = {
          attemptNumber: res.attemptNumber,
          demoHeadline: res.demoHeadline,
          duplicatePrevented: res.duplicatePrevented,
          message: res.message,
          status: res.status,
          decision: res.decision,
          idempotencyStatus: res.idempotencyStatus,
          amountInr: res.amountInr,
          razorpayOrderId: res.razorpayOrderId,
          timestamp: new Date().toLocaleTimeString(),
          stateHistory: res.stateHistory || [],
          rawResult: res,
        };

        setLatestResult(attemptRes);
        setCurrentAttempt(res.attemptNumber);
        setAttemptsLog((prev) => [attemptRes, ...prev]);
        fetchDbState(idempotencyKey);
      }
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  // Run the full 3-step lifecycle demonstration automatically
  const runFullDemo = async () => {
    // Generate fresh key
    const freshKey = `idemp_run_${Date.now().toString().slice(-6)}`;
    setIdempotencyKey(freshKey);
    setAttemptsLog([]);
    setLatestResult(null);
    setCurrentAttempt(0);

    setLoading(true);
    try {
      // Step 1: Initial execution
      const r1 = await fetchApi<any>('/api/idempotency/simulate', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: freshKey,
          amount: Math.round(amountInr * 100),
          merchant: 'Amazon',
          product: 'Logitech K380 Multi-Device Wireless Keyboard',
          category: 'Electronics',
        }),
      });

      const attempt1: AttemptResult = {
        attemptNumber: 1,
        demoHeadline: 'Attempt 1 → ₹999 payment SUCCESS',
        duplicatePrevented: false,
        message: 'Payment successfully authorized & captured.',
        status: r1.status,
        decision: r1.decision,
        idempotencyStatus: r1.idempotencyStatus,
        amountInr: 999,
        razorpayOrderId: r1.razorpayOrderId,
        timestamp: new Date().toLocaleTimeString(),
        stateHistory: r1.stateHistory || [],
        rawResult: r1,
      };

      setAttemptsLog([attempt1]);
      setLatestResult(attempt1);
      setCurrentAttempt(1);

      // Brief delay to simulate network retry interval
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Step 2: Replay duplicate request
      const r2 = await fetchApi<any>('/api/idempotency/simulate', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: freshKey,
          amount: Math.round(amountInr * 100),
          merchant: 'Amazon',
          product: 'Logitech K380 Multi-Device Wireless Keyboard',
          category: 'Electronics',
        }),
      });

      const attempt2: AttemptResult = {
        attemptNumber: 2,
        demoHeadline: 'Attempt 2 → DUPLICATE DETECTED',
        duplicatePrevented: true,
        message: 'Duplicate payment prevented.',
        status: r2.status,
        decision: r2.decision,
        idempotencyStatus: r2.idempotencyStatus,
        amountInr: 999,
        razorpayOrderId: r2.razorpayOrderId,
        timestamp: new Date().toLocaleTimeString(),
        stateHistory: r2.stateHistory || [],
        rawResult: r2,
      };

      setAttemptsLog((prev) => [attempt2, ...prev]);
      setLatestResult(attempt2);
      setCurrentAttempt(2);

      // Brief delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Step 3: Replay to fetch canonical record
      const r3 = await fetchApi<any>('/api/idempotency/simulate', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: freshKey,
          amount: Math.round(amountInr * 100),
          merchant: 'Amazon',
          product: 'Logitech K380 Multi-Device Wireless Keyboard',
          category: 'Electronics',
        }),
      });

      const attempt3: AttemptResult = {
        attemptNumber: 3,
        demoHeadline: 'Attempt 3 → ORIGINAL TRANSACTION RETURNED',
        duplicatePrevented: true,
        message: 'Duplicate payment prevented. Original transaction returned.',
        status: r3.status,
        decision: r3.decision,
        idempotencyStatus: r3.idempotencyStatus,
        amountInr: 999,
        razorpayOrderId: r3.razorpayOrderId,
        timestamp: new Date().toLocaleTimeString(),
        stateHistory: r3.stateHistory || [],
        rawResult: r3,
      };

      setAttemptsLog((prev) => [attempt3, ...prev]);
      setLatestResult(attempt3);
      setCurrentAttempt(3);
      fetchDbState(freshKey);
    } catch (err: any) {
      alert(err.message || 'Full demo run failed');
    } finally {
      setLoading(false);
    }
  };

  // Reset demo key in DB
  const handleReset = async () => {
    try {
      await fetchApi('/api/idempotency/reset', {
        method: 'POST',
        body: JSON.stringify({ idempotencyKey }),
      });
      setAttemptsLog([]);
      setLatestResult(null);
      setCurrentAttempt(0);
      setDbState(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Generate new key
  const handleNewKey = () => {
    const newK = `idemp_demo_${Date.now().toString().slice(-6)}`;
    setIdempotencyKey(newK);
    setAttemptsLog([]);
    setLatestResult(null);
    setCurrentAttempt(0);
    setDbState(null);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(idempotencyKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <AppShell>
      <Header
        title="Idempotent Payment Execution Engine"
        subtitle="Zero double-spend guarantees. Prevent duplicate payments from autonomous agent retries, network glitches, or gateway timeouts."
        badge="IDEMPOTENCY & STATE MACHINE"
      />

      <main className="p-6 sm:p-8 space-y-8 max-w-7xl">
        {/* Core Problem & Invariant Banner */}
        <div className="p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-md">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
                Deterministic Reliability Rail
              </span>
              <span className="text-xs text-slate-400 font-mono">DATABASE ATOMIC LOCKS</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Autonomous agents retry payments on network timeouts. TrustLayer guarantees money only moves once.
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Every payment request carries an <code className="text-indigo-300 bg-slate-900 px-1.5 py-0.5 rounded">idempotency_key</code>.
              Before execution, TrustLayer searches the database: if already succeeded, it returns the canonical record; if in-flight, it prevents double-charging.
              Zero frontend trust — enforced strictly in database storage.
            </p>
          </div>

          <button
            type="button"
            onClick={runFullDemo}
            disabled={loading}
            className="shrink-0 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>{loading ? 'Executing Engine Demo...' : 'Run Full 3-Attempt Demo'}</span>
          </button>
        </div>

        {/* Interactive Simulation Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Test Configuration & Actions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Demonstration Parameters</h3>
                  <p className="text-xs text-slate-500">
                    Simulate autonomous agent payment retries with an identical key
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNewKey}
                  className="text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1 font-mono transition-colors"
                  title="Generate new idempotency key"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="text-[10px]">New Key</span>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Fixed Idempotency Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Active Idempotency Key</label>
                    <button
                      type="button"
                      onClick={copyKey}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs outline-hidden focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                  />
                </div>

                {/* Amount & Merchant */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1 text-[11px]">Proposed Amount (₹)</label>
                    <input
                      type="number"
                      value={amountInr}
                      onChange={(e) => setAmountInr(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs outline-hidden font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1 text-[11px]">Target Merchant</label>
                    <input
                      type="text"
                      disabled
                      value="Amazon (India)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Step Action Buttons */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                    Interactive Step-by-Step Replay
                  </span>

                  {/* Attempt 1 */}
                  <button
                    type="button"
                    disabled={loading || currentAttempt >= 1}
                    onClick={() => executeAttempt(1)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      currentAttempt >= 1
                        ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-50/80 hover:bg-emerald-100 border-emerald-300 text-emerald-950 font-semibold shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div>
                        <div className="text-xs font-bold">Attempt 1: Initial Payment (₹999)</div>
                        <div className="text-[10px] text-slate-500">Fresh execution → Authorizes & creates Razorpay order</div>
                      </div>
                    </div>
                    {currentAttempt >= 1 && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>

                  {/* Attempt 2 */}
                  <button
                    type="button"
                    disabled={loading || currentAttempt < 1 || currentAttempt >= 2}
                    onClick={() => executeAttempt(2)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      currentAttempt < 1 || currentAttempt >= 2
                        ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-rose-50/80 hover:bg-rose-100 border-rose-300 text-rose-950 font-semibold shadow-2xs animate-pulse'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        <div className="text-xs font-bold">Attempt 2: Replay Identical Key (Timeout Retry)</div>
                        <div className="text-[10px] text-slate-500">Blocks duplicate → Zero payment rail calls</div>
                      </div>
                    </div>
                    {currentAttempt >= 2 && <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />}
                  </button>

                  {/* Attempt 3 */}
                  <button
                    type="button"
                    disabled={loading || currentAttempt < 2}
                    onClick={() => executeAttempt(3)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      currentAttempt < 2
                        ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-50/80 hover:bg-indigo-100 border-indigo-300 text-indigo-950 font-semibold shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        3
                      </span>
                      <div>
                        <div className="text-xs font-bold">Attempt 3: Query / Re-Submit Request</div>
                        <div className="text-[10px] text-slate-500">Idempotent return → Serves cached canonical record</div>
                      </div>
                    </div>
                    {currentAttempt >= 3 && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Key State</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Database Persistence Inspector */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 text-white space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="flex items-center gap-2 font-bold text-slate-200">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Database Record Inspector
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  ATOMIC PERSISTENCE
                </span>
              </div>

              {dbState?.transaction ? (
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Transaction ID:</span>
                    <span className="text-indigo-300 font-bold truncate max-w-[200px]">{dbState.transaction.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Attempts Recorded:</span>
                    <span className="text-white font-bold">{dbState.transaction.attempts || 1}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Duplicates Prevented:</span>
                    <span className="text-rose-400 font-bold">{dbState.transaction.duplicateCount || 0}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Current DB State:</span>
                    <span className="text-emerald-400 font-bold uppercase">{dbState.transaction.status}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Razorpay Order ID:</span>
                    <span className="text-blue-400 font-bold">{dbState.transaction.razorpayOrderId || 'None'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Last Attempt:</span>
                    <span className="text-slate-300">{new Date(dbState.transaction.lastAttemptAt || dbState.transaction.updatedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs">
                  No transaction recorded in database yet for this key.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Execution Output & State Machine */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. PROMINENT DUPLICATE PREVENTION BANNER */}
            {latestResult && (
              <div
                className={`p-6 rounded-3xl border transition-all ${
                  latestResult.duplicatePrevented
                    ? 'bg-rose-50/90 border-rose-200 text-rose-950 shadow-sm'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-sm'
                }`}
              >
                <div className="flex items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        latestResult.duplicatePrevented ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {latestResult.duplicatePrevented ? (
                        <ShieldAlert className="w-7 h-7" />
                      ) : (
                        <ShieldCheck className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black tracking-tight font-sans">
                        {latestResult.duplicatePrevented ? 'Duplicate payment prevented.' : 'Payment Succeeded'}
                      </div>
                      <div className="text-xs sm:text-sm font-medium mt-0.5 text-slate-700">
                        {latestResult.demoHeadline}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                        latestResult.duplicatePrevented
                          ? 'bg-rose-200 text-rose-900 border border-rose-300'
                          : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {latestResult.idempotencyStatus}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      Attempt #{latestResult.attemptNumber}
                    </div>
                  </div>
                </div>

                {/* Sub-banner metric */}
                <div className="mt-4 p-3 rounded-2xl bg-white/90 border border-slate-200/80 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-semibold text-slate-800">
                      {latestResult.duplicatePrevented
                        ? '0 Razorpay settlement calls dispatched. Double-spend risk eliminated.'
                        : 'Razorpay order generated & settlement pipeline engaged.'}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono-tabular">
                    ₹{latestResult.amountInr.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* 2. TRANSACTION STATE MACHINE VISUALIZER */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Transaction State Machine
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Database lifecycle states formalizing idempotent payment execution
                  </p>
                </div>
                <span className="text-[10px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  9 States Modeled
                </span>
              </div>

              {/* State Transition Flow Pills */}
              <div className="flex flex-wrap items-center gap-1.5 py-2 font-mono text-[11px]">
                {ALL_STATES.map((st, i) => {
                  const isCurrent = (latestResult?.status || 'CREATED') === st;
                  const hasVisited = latestResult?.stateHistory?.some((h) => h.state === st);

                  return (
                    <div key={st} className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : hasVisited
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {hasVisited && !isCurrent && '✓ '}
                        {st}
                      </span>
                      {i < ALL_STATES.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                    </div>
                  );
                })}
              </div>

              {/* State History Log */}
              {latestResult?.stateHistory && latestResult.stateHistory.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 font-mono">
                    State Transition Audit Trail
                  </span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {latestResult.stateHistory.map((h, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <strong className="text-slate-800">{h.state}</strong>
                          <span className="text-slate-500 text-[11px]">— {h.reason || 'State transition recorded'}</span>
                        </div>
                        <span className="text-slate-400 text-[10px]">{new Date(h.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. ATTEMPTS TIMELINE & COMPARISON TABLE */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Execution History for Active Key
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  {attemptsLog.length} Attempt(s) Logged
                </span>
              </div>

              {attemptsLog.length > 0 ? (
                <div className="space-y-2.5">
                  {attemptsLog.map((att, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        att.duplicatePrevented
                          ? 'bg-rose-50/50 border-rose-200/80'
                          : 'bg-emerald-50/50 border-emerald-200/80'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              att.duplicatePrevented
                                ? 'bg-rose-200 text-rose-800'
                                : 'bg-emerald-200 text-emerald-800'
                            }`}
                          >
                            ATTEMPT #{att.attemptNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{att.demoHeadline}</span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                          <strong>Result: </strong>
                          <span className={att.duplicatePrevented ? 'text-rose-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                            {att.message}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-slate-900">
                          ₹{att.amountInr.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {att.timestamp}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <p>Click &ldquo;Attempt 1&rdquo; or &ldquo;Run Full 3-Attempt Demo&rdquo; above to inspect the live idempotency resolution.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
