'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { fetchApi } from '@/lib/api';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Zap,
  ArrowRight,
  Shield,
  Layers,
  Terminal,
  Activity,
  Check,
  XCircle,
  Copy,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface GatewayConfig {
  providerType: string;
  activeScenario: string;
  latencyMs: number;
  failureCode: string;
  isRealMoney: boolean;
  supportedProviders: string[];
  tagline: string;
}

interface GatewaySimulateResult {
  transactionId: string;
  idempotencyKey: string;
  merchant: string;
  product: string;
  amountPaise: number;
  amountInr: string;
  currency: string;
  gatewayResult: {
    providerTxnId: string;
    orderId?: string;
    rrn: string;
    status: 'SUCCESS' | 'TIMEOUT' | 'FAILED' | 'DUPLICATE' | 'REVERSED';
    amountPaise: number;
    currency: string;
    provider: string;
    timestamp: string;
    latencyMs: number;
    receiptNumber: string;
    vpa?: string;
    authCode?: string;
    errorCode?: string;
    errorMessage?: string;
    isDuplicatePrevented?: boolean;
    reversalId?: string;
  };
  reversalResult?: {
    reversalId: string;
    originalProviderTxnId: string;
    rrn: string;
    status: string;
    amountRefundedPaise: number;
    currency: string;
    timestamp: string;
  } | null;
  flow: Array<{
    stage: string;
    action: string;
    timestamp: string;
  }>;
}

const SCENARIO_BUTTONS = [
  {
    id: 'SUCCESS',
    name: '1. Successful Payment',
    desc: 'Clean authorization and settlement with 12-digit NPCI RRN and timestamp.',
    badge: 'SUCCESS',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    icon: CheckCircle2,
  },
  {
    id: 'TIMEOUT',
    name: '2. Gateway Timeout',
    desc: 'Upstream banking gateway timeout; tests fail-closed safety and retry handling.',
    badge: 'TIMEOUT',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    icon: Clock,
  },
  {
    id: 'FAILURE',
    name: '3. Payment Failure',
    desc: 'Bank issuer decline (e.g. ISSUER_DECLINED) with explainable error codes.',
    badge: 'FAILURE',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
    icon: AlertTriangle,
  },
  {
    id: 'DUPLICATE',
    name: '4. Duplicate Request',
    desc: 'Gateway-level idempotency protection returning original result without re-charging rails.',
    badge: 'IDEMPOTENT',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: RotateCcw,
  },
  {
    id: 'REVERSAL',
    name: '5. Payment + Reversal',
    desc: 'Successful payment followed by immediate simulated post-settlement clawback.',
    badge: 'REVERSED',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    btnClass: 'bg-purple-600 hover:bg-purple-700 text-white',
    icon: RefreshCw,
  },
];

export default function GatewayLabPage() {
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>('SUCCESS');
  const [simResult, setSimResult] = useState<GatewaySimulateResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('SUCCESS');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(399900); // ₹3,999 in paise
  const [customMerchant, setCustomMerchant] = useState<string>('Amazon India');
  const [customProduct, setCustomProduct] = useState<string>('Logitech K380 Multi-Device Wireless Keyboard');

  const loadConfig = async () => {
    try {
      const data = await fetchApi<any>('/api/gateway/config');
      setConfig(data);
      setActiveScenario(data.activeScenario);
    } catch (err) {
      console.error('Failed to load gateway config:', err);
    }
  };

  useEffect(() => {
    loadConfig();
    // Run an initial simulation of Scenario 1 so the page opens with rich live data
    handleRunScenario('SUCCESS');
  }, []);

  const handleUpdateGlobalScenario = async (newScenario: string) => {
    try {
      const res = await fetchApi<any>('/api/gateway/config', {
        method: 'POST',
        body: JSON.stringify({ scenario: newScenario }),
      });
      setActiveScenario(res.activeScenario);
      loadConfig();
    } catch (err) {
      console.error('Failed to update gateway scenario:', err);
    }
  };

  const handleRunScenario = async (scenario: string) => {
    setIsRunning(true);
    setSelectedScenarioId(scenario);
    try {
      const res = await fetchApi<any>('/api/gateway/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario,
          merchant: customMerchant,
          product: customProduct,
          amount: customAmount,
          currency: 'INR',
        }),
      });
      setSimResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SETTLED &bull; SUCCESS
          </span>
        );
      case 'TIMEOUT':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            GATEWAY TIMEOUT
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            ISSUER DECLINED
          </span>
        );
      case 'DUPLICATE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            DUPLICATE PREVENTED
          </span>
        );
      case 'REVERSED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            PAYMENT REVERSED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <AppShell>
      <Header
        title="Payment Gateway Simulator & Provider Abstraction"
        subtitle="Clean PaymentProvider interface isolating the LEO reliability layer from payment rails. Simulates authentic UPI/NPCI RRNs, timeouts, issuer declines, and clawbacks."
        badge="PAYMENT RAILS ABSTRACTION"
      />

      <main className="p-8 space-y-8 max-w-7xl">
        {/* TOP CALLOUT: ZERO REAL MONEY NOTICE */}
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-blue-900 shadow-xs">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold">Prototype Sandbox Notice:</span> We are{' '}
              <strong>NOT</strong> moving real money. All settlements simulate authentic Indian banking rail responses (12-digit RRNs, UPI VPAs, and network latencies) through a pluggable{' '}
              <code className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">PaymentProvider</code>{' '}
              abstraction.
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold bg-blue-200/70 text-blue-800 px-2.5 py-1 rounded-full shrink-0">
            PLUGGABLE PROVIDER READY
          </span>
        </div>

        {/* 1. 4-TIER ARCHITECTURAL FLOW DIAGRAM */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600">
                SYSTEM ARCHITECTURE
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Decoupled Payment Execution Flow
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">ZERO REWRITE GUARANTEE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">1. Origin</span>
              <h4 className="text-xs font-bold text-slate-900">AI Agent Request</h4>
              <p className="text-[11px] text-slate-600">
                Initiates purchase intent with product, amount, and reference.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-1">
              <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase">2. Reliability Layer</span>
              <h4 className="text-xs font-bold text-slate-900">LEO Governance</h4>
              <p className="text-[11px] text-slate-600">
                Deterministic mandate validation, capability checks & risk scoring.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1">
              <span className="text-[10px] font-mono text-blue-600 font-bold uppercase">3. Interface</span>
              <h4 className="text-xs font-bold text-slate-900">PaymentProvider Contract</h4>
              <p className="text-[11px] text-slate-600">
                Abstract interface decoupling governance from payment rails.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1">
              <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase">4. Rail Execution</span>
              <h4 className="text-xs font-bold text-slate-900">Simulated Gateway</h4>
              <p className="text-[11px] text-slate-600">
                Generates 12-digit RRN, handles timeouts, declines, and clawbacks.
              </p>
            </div>
          </div>
        </div>

        {/* 2. CONFIGURABLE DEMO SCENARIOS BAR */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configurable Hackathon Demo Scenarios</h3>
              <p className="text-xs text-slate-500">
                Click any scenario below to trigger an instant execution through the PaymentProvider contract
              </p>
            </div>

            {/* Global Scenario Active Indicator */}
            {config && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Active Global Default:</span>
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white text-[11px]">
                  {activeScenario}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {SCENARIO_BUTTONS.map((s) => {
              const isSelected = selectedScenarioId === s.id;
              const Icon = s.icon;

              return (
                <button
                  key={s.id}
                  disabled={isRunning}
                  onClick={() => handleRunScenario(s.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${s.badgeColor}`}>
                        {s.badge}
                      </span>
                      <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{s.name}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between w-full">
                    <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1">
                      Run Demo &rarr;
                    </span>
                    {activeScenario === s.id && (
                      <span className="text-[10px] font-mono text-emerald-600 font-bold">&bull; Active Rail</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. SIMULATION EXECUTION RESULTS PLAYGROUND */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Payment Receipt & Bank Rail Metadata */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-950 text-slate-100 border border-slate-800 space-y-6 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                  GATEWAY RECEIPT & RAIL DATA
                </span>
              </div>
              {simResult && getStatusBadge(simResult.gatewayResult.status)}
            </div>

            {isRunning ? (
              <div className="py-20 text-center space-y-3 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                <p className="text-xs font-mono">Dispatched to PaymentProvider interface... simulating network rails</p>
              </div>
            ) : simResult ? (
              <div className="space-y-5">
                {/* Amount & Merchant Header */}
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white font-mono-tabular tracking-tight">
                      ₹{simResult.amountInr}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {simResult.merchant} &bull; {simResult.product}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-mono block">Latency</span>
                    <span className="text-sm font-mono font-bold text-indigo-300">
                      {simResult.gatewayResult.latencyMs}ms
                    </span>
                  </div>
                </div>

                {/* Primary Banking Identifiers Grid */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block">NPCI / Bank RRN</span>
                    <span className="text-white font-bold tracking-wider text-sm">
                      {simResult.gatewayResult.rrn}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">Provider Txn ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-300 truncate max-w-[130px]">
                        {simResult.gatewayResult.providerTxnId}
                      </span>
                      <button
                        onClick={() => handleCopy(simResult.gatewayResult.providerTxnId, 'txnId')}
                        className="text-slate-500 hover:text-white cursor-pointer"
                      >
                        {copiedKey === 'txnId' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">Merchant UPI VPA</span>
                    <span className="text-indigo-300">{simResult.gatewayResult.vpa || 'merchant@icici'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">Settlement Rail</span>
                    <span className="text-slate-300">{simResult.gatewayResult.provider} GATEWAY</span>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Gateway Order Reference</span>
                    <span className="text-slate-400 text-[11px] truncate block">
                      {simResult.gatewayResult.orderId || simResult.gatewayResult.providerTxnId}
                    </span>
                  </div>
                </div>

                {/* Reversal Callout (if Scenario 5) */}
                {simResult.reversalResult && (
                  <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-500/40 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Automated Post-Settlement Reversal
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-900 text-purple-200">
                        {simResult.reversalResult.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-purple-200">
                      <div>
                        <span className="text-purple-400 text-[10px] block">Reversal ID</span>
                        <span>{simResult.reversalResult.reversalId}</span>
                      </div>
                      <div>
                        <span className="text-purple-400 text-[10px] block">Amount Returned</span>
                        <span className="font-bold">₹{(simResult.reversalResult.amountRefundedPaise / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error / Failure Details (if Timeout or Failure) */}
                {simResult.gatewayResult.errorCode && (
                  <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-xs space-y-1 text-rose-200">
                    <div className="flex items-center gap-2 font-bold text-rose-300">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{simResult.gatewayResult.errorCode}</span>
                    </div>
                    <p className="text-[11px] text-rose-300/90 leading-relaxed">
                      {simResult.gatewayResult.errorMessage}
                    </p>
                  </div>
                )}

                {/* Duplicate Prevented Banner */}
                {simResult.gatewayResult.isDuplicatePrevented && (
                  <div className="p-4 rounded-2xl bg-blue-950/80 border border-blue-500/40 text-xs space-y-1 text-blue-200">
                    <div className="flex items-center gap-2 font-bold text-blue-300">
                      <RotateCcw className="w-4 h-4" />
                      <span>Idempotency Protection Active</span>
                    </div>
                    <p className="text-[11px] text-blue-300/90 leading-relaxed">
                      {simResult.gatewayResult.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right Panel: Transaction Lifecycle & Interface Trace */}
          <div className="lg:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">4-Stage Lifecycle Timeline</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">REAL-TIME AUDIT</span>
            </div>

            {simResult ? (
              <div className="space-y-4">
                <div className="space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {simResult.flow.map((step, idx) => (
                    <div key={idx} className="relative space-y-0.5 text-xs">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{step.stage}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(step.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-mono">{step.action}</p>
                    </div>
                  ))}
                </div>

                {/* Raw Protocol JSON Preview */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      PaymentProvider Response Payload
                    </span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(simResult.gatewayResult, null, 2), 'rawPayload')}
                      className="text-[10px] font-mono text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'rawPayload' ? 'Copied!' : 'Copy JSON'}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto max-h-56">
                    {JSON.stringify(simResult.gatewayResult, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs">
                Select a scenario to inspect the complete lifecycle trace.
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
