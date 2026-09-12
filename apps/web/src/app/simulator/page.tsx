'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { fetchApi } from '@/lib/api';
import {
  PlayCircle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  CreditCard,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  Eye,
  Sliders,
  AlertTriangle,
  Lock,
  Flame,
  Layers,
  FileCode2,
  Copy,
  Check,
  Package,
  Repeat,
  DollarSign,
  Undo2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { VerificationPanel } from '@/components/VerificationPanel';
import { AgentTrustRegistry } from '@/components/AgentTrustRegistry';

interface DemoScenario {
  id: string;
  scenarioCode: string;
  name: string;
  badge: string;
  prompt: string;
  agentSpeech: string;
  merchant: string;
  product: string;
  category: string;
  amountInr: number;
  mandateCeilingInr: number;
  expectedOutcome: 'SUCCESS' | 'BLOCKED' | 'DUPLICATE_PREVENTED' | 'APPROVAL_REQUIRED' | 'REVERSED';
  description: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'SCENARIO_1',
    scenarioCode: 'NORMAL_PURCHASE',
    name: 'SCENARIO 1 — NORMAL PURCHASE',
    badge: 'LEGITIMATE',
    prompt: 'I found the required office supplies for ₹1,299 at the approved merchant.',
    agentSpeech: 'I found the required office supplies for ₹1,299 at the approved merchant Amazon. Generating payment request...',
    merchant: 'Amazon',
    product: 'Premium Office Supplies & Stationery Kit',
    category: 'Office Supplies',
    amountInr: 1299,
    mandateCeilingInr: 5000,
    expectedOutcome: 'SUCCESS',
    description: 'Agent requests ₹1,299 → Mandate valid → Merchant valid → Amount valid → Payment succeeds.',
  },
  {
    id: 'SCENARIO_2',
    scenarioCode: 'EXCESSIVE_AMOUNT',
    name: 'SCENARIO 2 — EXCESSIVE AMOUNT',
    badge: 'AMOUNT LIMIT BREACH',
    prompt: 'I found the required office supplies for ₹8,999 at the approved merchant.',
    agentSpeech: 'I found the required office supplies for ₹8,999 at the approved merchant Amazon. Requesting authorization...',
    merchant: 'Amazon',
    product: 'Deluxe Executive Office Supplies & Ergonomic Suite',
    category: 'Office Supplies',
    amountInr: 8999,
    mandateCeilingInr: 5000,
    expectedOutcome: 'BLOCKED',
    description: 'Agent requests ₹8,999 → Mandate limit ₹5,000 → Payment BLOCKED (Zero Gateway Leakage).',
  },
  {
    id: 'SCENARIO_3',
    scenarioCode: 'UNAUTHORIZED_MERCHANT',
    name: 'SCENARIO 3 — UNAUTHORIZED MERCHANT',
    badge: 'UNAPPROVED VENDOR',
    prompt: 'I found the required office supplies for ₹1,299 at RogueVendor.',
    agentSpeech: 'I found the required office supplies for ₹1,299 at an unapproved discount seller RogueVendor. Requesting authorization...',
    merchant: 'RogueVendor',
    product: 'Discount Stationery Bundle (Grey Market)',
    category: 'Office Supplies',
    amountInr: 1299,
    mandateCeilingInr: 5000,
    expectedOutcome: 'BLOCKED',
    description: 'Agent requests purchase from unapproved merchant → Merchant validation fails → Payment BLOCKED.',
  },
  {
    id: 'SCENARIO_4',
    scenarioCode: 'DUPLICATE_PAYMENT',
    name: 'SCENARIO 4 — DUPLICATE PAYMENT',
    badge: 'IDEMPOTENCY REPLAY',
    prompt: 'Executing purchase of ₹1,299. Retrying the same request 3 times with identical idempotency key.',
    agentSpeech: 'Executing purchase of ₹1,299. Retrying the same request 3 times to simulate network retries and replay attack protection.',
    merchant: 'Amazon',
    product: 'Premium Office Supplies & Stationery Kit',
    category: 'Office Supplies',
    amountInr: 1299,
    mandateCeilingInr: 5000,
    expectedOutcome: 'DUPLICATE_PREVENTED',
    description: 'Agent retries the same request 3 times → First succeeds → Other requests detected as duplicates.',
  },
  {
    id: 'SCENARIO_5',
    scenarioCode: 'HUMAN_APPROVAL',
    name: 'SCENARIO 5 — HUMAN APPROVAL',
    badge: 'HUMAN-IN-THE-LOOP',
    prompt: 'I found an enterprise 4K executive monitor for ₹6,499 at approved merchant Amazon requiring human approval.',
    agentSpeech: 'I found high-spec executive monitor for ₹6,499. Verification succeeds, but requires human supervisor approval.',
    merchant: 'Amazon',
    product: 'Dell UltraSharp 27 4K Executive Monitor',
    category: 'Electronics',
    amountInr: 6499,
    mandateCeilingInr: 20000,
    expectedOutcome: 'APPROVAL_REQUIRED',
    description: 'Agent requests high-value purchase → Validation succeeds → Human approval required → User approves → Payment executes.',
  },
  {
    id: 'SCENARIO_6',
    scenarioCode: 'DISPUTE',
    name: 'SCENARIO 6 — DISPUTE & REVERSAL',
    badge: 'DISPUTE & REVERSAL',
    prompt: 'I found a Keychron mechanical keyboard for ₹4,999 at KeychronIndia.com.',
    agentSpeech: 'Payment of ₹4,999 authorized and captured. Simulating user dispute and automated settlement reversal.',
    merchant: 'KeychronIndia.com',
    product: 'Keychron C1 Tenkeyless Wired Mechanical Keyboard',
    category: 'Electronics',
    amountInr: 4999,
    mandateCeilingInr: 5000,
    expectedOutcome: 'REVERSED',
    description: 'Payment succeeds → User disputes transaction → Reversal initiated → Payment reversed.',
  },
];

export function SimulatorPage() {
  const [activeScenario, setActiveScenario] = useState<DemoScenario>(DEMO_SCENARIOS[0]);
  const [userPrompt, setUserPrompt] = useState<string>(DEMO_SCENARIOS[0].prompt);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'verification' | 'json' | 'audit' | 'receipt'>('verification');
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Scenario 5: Human Approval State
  const [approvalActionLoading, setApprovalActionLoading] = useState<boolean>(false);
  const [approvalDecided, setApprovalDecided] = useState<any | null>(null);

  // Scenario 6: Dispute State
  const [disputeActionLoading, setDisputeActionLoading] = useState<boolean>(false);
  const [disputeReversalResult, setDisputeReversalResult] = useState<any | null>(null);

  // Custom sandbox accordion
  const [showCustomSandbox, setShowCustomSandbox] = useState<boolean>(false);
  const [customMerchant, setCustomMerchant] = useState<string>('Amazon');
  const [customProduct, setCustomProduct] = useState<string>('Logitech K380 Wireless Keyboard');
  const [customAmount, setCustomAmount] = useState<string>('1299');
  const [customCategory, setCustomCategory] = useState<string>('Office Supplies');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(`idemp_sim_${Date.now()}`);

  const selectScenario = (scenario: DemoScenario) => {
    setActiveScenario(scenario);
    setUserPrompt(scenario.prompt);
    setResult(null);
    setCurrentStage(0);
    setApprovalDecided(null);
    setDisputeReversalResult(null);
  };

  const runScenario = async (forcedScenario?: DemoScenario) => {
    const sc = forcedScenario || activeScenario;
    setEvaluating(true);
    setResult(null);
    setCurrentStage(1); // User prompt formed
    setApprovalDecided(null);
    setDisputeReversalResult(null);

    setTimeout(() => setCurrentStage(2), 200); // Agent thinking & speech
    setTimeout(() => setCurrentStage(3), 400); // Request Protocol
    setTimeout(() => setCurrentStage(4), 650); // LEO Verification

    try {
      const res = await fetchApi<{ success: boolean; data: any }>('/api/agent/run', {
        method: 'POST',
        body: JSON.stringify({
          prompt: userPrompt || sc.prompt,
          scenario: sc.id,
          force_idempotency_key: idempotencyKey,
        }),
      });

      setTimeout(() => {
        setCurrentStage(5); // Payment Rail
        setResult(res.data);
        setEvaluating(false);
      }, 850);
    } catch (err: any) {
      alert(err.message || 'Execution failed');
      setEvaluating(false);
    }
  };

  // Scenario 5: Handle Human Approval Decision (Approve or Reject)
  const handleDecideApproval = async (action: 'APPROVE' | 'REJECT') => {
    if (!result?.human_approval?.approval_id) return;
    setApprovalActionLoading(true);
    try {
      const res = await fetchApi<any>(`/api/approvals/${result.human_approval.approval_id}/decide`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          reviewedBy: 'Alex Vance (Human Supervisor)',
          reason: action === 'APPROVE' ? 'Supervisor verified legitimate high-value procurement' : 'Rejected by supervisor',
        }),
      });
      setApprovalDecided({
        action,
        decision: res.decision || action,
        message: res.message,
        razorpayOrderId: res.razorpayOrderId || `order_approved_${Date.now()}`,
      });
    } catch (err: any) {
      alert(err.message || 'Approval action failed');
    } finally {
      setApprovalActionLoading(false);
    }
  };

  // Scenario 6: Handle 1-Click Dispute & Reversal Flow
  const handleExecuteDisputeAndReversal = async () => {
    if (!result?.dispute_info?.transaction_id) return;
    setDisputeActionLoading(true);
    try {
      // Step 1: Open Dispute
      const disputeRes = await fetchApi<any>('/api/disputes', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: result.dispute_info.transaction_id,
          reason: 'Outside mandate',
          userId: 'usr_demo_01',
        }),
      });

      const disputeId = disputeRes.data?.id || disputeRes.data?.dispute_id;

      // Step 2: Reverse Payment
      const reverseRes = await fetchApi<any>(`/api/disputes/${disputeId}/reverse`, {
        method: 'POST',
      });

      setDisputeReversalResult({
        disputeId,
        reversalId: reverseRes.data?.reversalId || reverseRes.data?.reversal_id || `rev_${Date.now()}`,
        status: 'COMPLETED',
        amountReturnedInr: 4999,
        originalAmountInr: 4999,
        reason: 'Outside mandate',
      });
    } catch (err: any) {
      alert(err.message || 'Dispute & Reversal flow failed');
    } finally {
      setDisputeActionLoading(false);
    }
  };

  const copyProtocolJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell>
      <Header
        title="Autonomous Agent Simulator"
        subtitle="Primary Hackathon Demo: Live demonstration of how an AI shopping agent generates payments and interacts with the LEO reliability layer."
        badge="PRIMARY HACKATHON DEMO"
      />

      <main className="p-6 sm:p-8 space-y-7 max-w-7xl mx-auto">
        {/* Fleet & Mandate Governance Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-6 sm:p-7 shadow-xl text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md text-indigo-200 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Autonomous Shopping Agent Persona</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                &ldquo;AI can decide what it wants to do. LEO decides whether it is authorized to do it.&rdquo;
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                The agent holds <strong className="text-white">zero payment credentials</strong>.
                It queries items, formulates natural language statements, and submits machine-readable payment requests to LEO.
              </p>
            </div>

            {/* Invariant Status Badges */}
            <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400">AGENT:</span>
                <strong className="text-emerald-300">ShoppingAgent-01</strong>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono">
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-slate-400">MANDATE:</span>
                <strong className="text-amber-300">mnd_amazon_01 (Cap: ₹5,000)</strong>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono">
                <CreditCard className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-slate-400">GATEWAY:</span>
                <strong className="text-blue-300">Razorpay Test Mode</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 6 ONE-CLICK DEMO SCENARIO SWITCHER CARDS */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                6 One-Click Demo Scenarios
              </h3>
              <p className="text-xs text-slate-500">Select any scenario to run an autonomous shopping cycle with 1 click</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {DEMO_SCENARIOS.map((scenario) => {
              const isSelected = activeScenario.id === scenario.id;
              const isSuccess = scenario.expectedOutcome === 'SUCCESS';
              const isBlocked = scenario.expectedOutcome === 'BLOCKED';
              const isDuplicate = scenario.expectedOutcome === 'DUPLICATE_PREVENTED';
              const isApproval = scenario.expectedOutcome === 'APPROVAL_REQUIRED';
              const isReversed = scenario.expectedOutcome === 'REVERSED';

              return (
                <div
                  key={scenario.id}
                  onClick={() => {
                    selectScenario(scenario);
                    runScenario(scenario);
                  }}
                  className={`text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? isSuccess
                        ? 'bg-emerald-50/80 border-emerald-300 shadow-md ring-2 ring-emerald-500/20'
                        : isBlocked
                        ? 'bg-rose-50/80 border-rose-300 shadow-md ring-2 ring-rose-500/20'
                        : isDuplicate
                        ? 'bg-indigo-50/80 border-indigo-300 shadow-md ring-2 ring-indigo-500/20'
                        : isApproval
                        ? 'bg-amber-50/80 border-amber-300 shadow-md ring-2 ring-amber-500/20'
                        : 'bg-purple-50/80 border-purple-300 shadow-md ring-2 ring-purple-500/20'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isSuccess
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isBlocked
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isDuplicate
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : isApproval
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {scenario.badge}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-900">
                      ₹{scenario.amountInr.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 mb-1">{scenario.name}</div>
                  <div className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {scenario.description}
                  </div>

                  <div className="text-[10px] font-mono border-t border-slate-100 pt-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">{scenario.merchant}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectScenario(scenario);
                        runScenario(scenario);
                      }}
                      disabled={evaluating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs transition group-hover:scale-105"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>1-Click Run</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AGENT REASONING & 1-CLICK EXECUTION PANEL */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Autonomous Agent Natural Language Output</h3>
                <p className="text-xs text-slate-500">
                  Agent statement generated before dispatching structured machine protocol request
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-medium border border-slate-200">
              Active: <strong className="text-slate-900">{activeScenario.id}</strong>
            </span>
          </div>

          {/* Natural Language Speech Bubble */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 relative">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <span className="text-[10px] font-bold font-mono uppercase text-indigo-700">
                  Agent Statement (Generated for Backend API):
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed italic">
                  &ldquo;{result?.agent_speech || activeScenario.agentSpeech}&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* 1-Click Execution Bar */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g. I found the required office supplies for ₹1,299 at the approved merchant."
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 outline-hidden focus:border-indigo-500 focus:bg-white transition"
            />

            <button
              type="button"
              onClick={() => runScenario()}
              disabled={evaluating}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {evaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Evaluating Lifecycle...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>Execute {activeScenario.name.split(' — ')[1] || 'Scenario'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* REAL-TIME 5-STAGE LIFECYCLE VISUALIZER */}
        {(result || evaluating) && (
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  5-Stage Request Lifecycle Trace
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  End-to-end trace proving strict separation between AI reasoning and LEO payment authorization.
                </p>
              </div>

              {result && (
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider font-mono ${
                      result.leo_verified?.decision === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : result.leo_verified?.decision === 'REVIEW'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    LEO: {result.leo_verified?.decision}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-medium border border-slate-200">
                    Risk: {result.leo_verified?.risk_score}/100
                  </span>
                </div>
              )}
            </div>

            {/* 5-Stage Step Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Stage 1: USER PROMPT */}
              <div className={`p-4 rounded-2xl border transition-all ${currentStage >= 1 ? 'bg-sky-50/60 border-sky-200' : 'bg-slate-50/50 border-slate-200 opacity-60'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-sky-700 font-bold uppercase flex items-center gap-1">
                    <User className="w-3 h-3" /> 1. USER
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Prompt</span>
                </div>
                <p className="text-xs font-medium text-slate-800 line-clamp-3 bg-white p-2.5 rounded-xl border border-sky-100">
                  &ldquo;{result?.user_said || userPrompt}&rdquo;
                </p>
              </div>

              {/* Stage 2: AGENT THINKING */}
              <div className={`p-4 rounded-2xl border transition-all ${currentStage >= 2 ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50/50 border-slate-200 opacity-60'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-indigo-700 font-bold uppercase flex items-center gap-1">
                    <Bot className="w-3 h-3" /> 2. AGENT
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Catalog Match</span>
                </div>
                <div className="text-xs font-mono bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
                  <div className="font-bold text-slate-900 truncate">{result?.agent_decided?.selected_product || activeScenario.product}</div>
                  <div className="flex justify-between text-[11px]"><span className="text-slate-500">Price:</span> <strong className="text-indigo-600 font-bold">₹{result?.agent_decided?.price_inr || activeScenario.amountInr}</strong></div>
                  <div className="flex justify-between text-[11px]"><span className="text-slate-500">Merchant:</span> <span className="text-slate-700">{result?.agent_decided?.merchant || activeScenario.merchant}</span></div>
                </div>
              </div>

              {/* Stage 3: MACHINE REQUEST PROTOCOL */}
              <div className={`p-4 rounded-2xl border transition-all ${currentStage >= 3 ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50/50 border-slate-200 opacity-60'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-purple-700 font-bold uppercase flex items-center gap-1">
                    <FileCode2 className="w-3 h-3" /> 3. PROTOCOL
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">POST /api/authorize</span>
                </div>
                <div className="text-[11px] font-mono bg-white p-2.5 rounded-xl border border-purple-100 space-y-1 text-slate-700">
                  <div className="truncate"><span className="text-slate-400">Agent:</span> {result?.agent_requested?.payload?.agent_id || 'ShoppingAgent-01'}</div>
                  <div className="truncate"><span className="text-slate-400">Mandate:</span> {result?.agent_requested?.payload?.mandate_id || 'mnd_amazon_01'}</div>
                  <div><span className="text-slate-400">Amount:</span> <strong className="text-purple-700">₹{result?.agent_decided?.price_inr || activeScenario.amountInr}</strong></div>
                  <div className="text-[10px] text-purple-600 font-sans mt-1">⚡ Dispatched to LEO</div>
                </div>
              </div>

              {/* Stage 4: LEO VERIFICATION */}
              <div className={`p-4 rounded-2xl border transition-all ${currentStage >= 4 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50/50 border-slate-200 opacity-60'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> 4. LEO LAYER
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">11 Bounds</span>
                </div>
                <div className="text-xs font-mono bg-white p-2.5 rounded-xl border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Verdict:</span>
                    <strong className={result?.leo_verified?.decision === 'APPROVED' ? 'text-emerald-700' : result?.leo_verified?.decision === 'REVIEW' ? 'text-amber-700' : 'text-rose-600'}>
                      {result?.leo_verified?.decision || 'EVALUATING'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Risk Score:</span>
                    <span>{result?.leo_verified?.risk_score ?? '--'}/100</span>
                  </div>
                  {result?.leo_verified?.reason && (
                    <div className="text-[10px] text-slate-600 line-clamp-2 pt-1 border-t border-slate-100 font-sans leading-tight">
                      {result.leo_verified.reason}
                    </div>
                  )}
                </div>
              </div>

              {/* Stage 5: PAYMENT RAIL / OUTCOME */}
              <div className={`p-4 rounded-2xl border transition-all ${currentStage >= 5 ? 'bg-violet-50/60 border-violet-200' : 'bg-slate-50/50 border-slate-200 opacity-60'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-violet-700 font-bold uppercase flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> 5. OUTCOME
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Razorpay</span>
                </div>
                <div className="text-xs font-mono bg-white p-2.5 rounded-xl border border-violet-100 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Status:</span>
                    <strong className="text-slate-800">{result?.payment_rail?.status || 'PENDING'}</strong>
                  </div>
                  {result?.payment_rail?.razorpay_order_id ? (
                    <div className="text-[10px] text-emerald-700 font-bold truncate">
                      Order: {result.payment_rail.razorpay_order_id}
                    </div>
                  ) : (
                    <div className="text-[10px] text-rose-600 font-medium leading-tight">
                      Zero Rail Leakage (Not Invoked)
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 font-sans leading-tight pt-1 border-t border-slate-100">
                    {result?.payment_rail?.message || 'Settlement pipeline verified.'}
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SPECIAL INTERACTIVE WIDGET FOR SCENARIO 4: DUPLICATE REPLAY PREVENTION   */}
            {/* ========================================================================= */}
            {result?.duplicate_simulation && (
              <div className="p-5 sm:p-6 rounded-2xl bg-indigo-50/60 border-2 border-indigo-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-600 text-white">
                      <Repeat className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        Scenario 4 Outcome: Duplicate Payment Prevented
                      </h4>
                      <p className="text-xs text-slate-600">
                        3 sequential requests sent with identical idempotency key ({result.duplicate_simulation.idempotency_key})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs font-bold border border-emerald-300">
                      Gateways Charged: {result.duplicate_simulation.gateways_charged} / {result.duplicate_simulation.total_attempts} Attempts
                    </span>
                    <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-mono text-xs font-bold border border-indigo-300">
                      Duplicates Blocked: {result.duplicate_simulation.duplicates_prevented}
                    </span>
                  </div>
                </div>

                {/* 3-Attempt Comparison Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {result.duplicate_simulation.attempts.map((att: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
                        att.attempt === 1
                          ? 'bg-emerald-50/90 border-emerald-300'
                          : att.attempt === 2
                          ? 'bg-rose-50/90 border-rose-300'
                          : 'bg-blue-50/90 border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-700">Attempt {att.attempt}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            att.decision === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {att.decision}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900">{att.headline}</div>
                      <div className="text-[11px] text-slate-600 font-sans leading-tight">
                        {att.explanation}
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/80 flex items-center justify-between">
                        <span>Gateway Charge:</span>
                        <strong className={att.gatewayInvoked ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {att.gatewayInvoked ? 'YES (Order Created)' : 'NO (Prevented)'}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SPECIAL INTERACTIVE WIDGET FOR SCENARIO 5: HUMAN APPROVAL WORKFLOW        */}
            {/* ========================================================================= */}
            {result?.human_approval && (
              <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/70 border-2 border-amber-300 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500 text-white">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        Action Required: Human Supervisor Review Triggered
                      </h4>
                      <p className="text-xs text-slate-600">
                        Amount ₹{result.human_approval.amount_inr} exceeds autonomous ceiling of ₹5,000. Payment held until sign-off.
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 font-mono text-xs font-bold border border-amber-300">
                    STATUS: {approvalDecided ? approvalDecided.decision : 'PENDING_HUMAN_APPROVAL'}
                  </span>
                </div>

                {!approvalDecided ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-amber-200">
                    <div className="space-y-0.5 text-xs text-slate-700">
                      <div>Product: <strong className="text-slate-900">{result.human_approval.product}</strong></div>
                      <div>Merchant: <strong className="text-slate-900">{result.human_approval.merchant}</strong> • Amount: <strong className="text-amber-700 font-mono">₹{result.human_approval.amount_inr}</strong></div>
                      <div className="text-[11px] text-slate-500">Trigger Rule: {result.human_approval.rule}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDecideApproval('APPROVE')}
                        disabled={approvalActionLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Payment</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecideApproval('REJECT')}
                        disabled={approvalActionLoading}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded-xl border text-xs font-medium space-y-1.5 ${
                    approvalDecided.action === 'APPROVE'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {approvalDecided.action === 'APPROVE' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Payment Approved by Supervisor</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Payment Rejected by Supervisor</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed">{approvalDecided.message}</p>
                    {approvalDecided.action === 'APPROVE' && (
                      <div className="pt-2 border-t border-emerald-200 font-mono text-[11px] text-emerald-800">
                        Razorpay Order Generated: <strong>{approvalDecided.razorpayOrderId}</strong> (Settlement Complete)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SPECIAL INTERACTIVE WIDGET FOR SCENARIO 6: DISPUTE & REVERSAL WORKFLOW    */}
            {/* ========================================================================= */}
            {result?.dispute_info && (
              <div className="p-5 sm:p-6 rounded-2xl bg-purple-50/70 border-2 border-purple-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-600 text-white">
                      <Undo2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        Scenario 6: Dispute & Payment Reversal Flow
                      </h4>
                      <p className="text-xs text-slate-600">
                        Original transaction of ₹{result.dispute_info.amount_inr} completed. Ready for customer dispute and reversal.
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-mono text-xs font-bold border border-purple-300">
                    {disputeReversalResult ? 'REVERSAL COMPLETED' : 'SUCCESS (DISPUTE READY)'}
                  </span>
                </div>

                {!disputeReversalResult ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-purple-200">
                    <div className="text-xs text-slate-700 space-y-0.5">
                      <div>Transaction ID: <span className="font-mono font-bold text-slate-900">{result.dispute_info.transaction_id}</span></div>
                      <div>Amount: <strong className="text-slate-900">₹{result.dispute_info.amount_inr}</strong> • Merchant: <strong>KeychronIndia.com</strong></div>
                      <div className="text-[11px] text-slate-500">Status: SUCCESS • Razorpay Order Active</div>
                    </div>

                    <button
                      type="button"
                      onClick={handleExecuteDisputeAndReversal}
                      disabled={disputeActionLoading}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {disputeActionLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing Reversal...</span>
                        </>
                      ) : (
                        <>
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Dispute Transaction & Initiate Reversal</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* REQUIRED CALLOUT BANNER */
                  <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-slate-900 to-purple-950 border border-purple-500/30 text-white space-y-2.5 shadow-md font-mono">
                    <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Settlement Reversal Confirmed</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-white/10">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Original Payment</span>
                        <strong className="text-white text-sm">₹{disputeReversalResult.originalAmountInr?.toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Reason</span>
                        <strong className="text-amber-300 text-sm">{disputeReversalResult.reason}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Reversal Status</span>
                        <strong className="text-emerald-400 text-sm">{disputeReversalResult.status}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Amount Returned</span>
                        <strong className="text-emerald-300 text-sm">₹{disputeReversalResult.amountReturnedInr?.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span>Reversal ID: {disputeReversalResult.reversalId}</span>
                      <span>Cardholder Refund Dispatched</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DEEP FORENSIC INSPECTOR TABS */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Detailed Verification & Protocol Inspection
                </h4>

                <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveTab('verification')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'verification' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    11 Verification Bounds
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('json')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'json' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Protocol JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('audit')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'audit' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Audit Trail
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('receipt')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'receipt' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Gateway Receipt
                  </button>
                </div>
              </div>

              {/* TAB 1: 11 VERIFICATION BOUNDS */}
              {activeTab === 'verification' && (
                <VerificationPanel
                  decision={
                    result?.leo_verified?.structured_decision ||
                    (result?.leo_verified?.decision === 'APPROVED' ? 'ALLOW' : 'BLOCK')
                  }
                  reason={result?.leo_verified?.reason}
                  checks={result?.leo_verified?.checks || []}
                  riskScore={result?.leo_verified?.risk_score || 0}
                  rawDecision={result?.leo_verified}
                  showPipeline={false}
                />
              )}

              {/* TAB 2: PROTOCOL JSON */}
              {activeTab === 'json' && (
                <div className="relative rounded-2xl bg-slate-900 text-slate-200 p-4 font-mono text-xs overflow-x-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <span className="text-slate-400 text-[11px]">Machine-Readable Authorization JSON Payload</span>
                    <button
                      type="button"
                      onClick={copyProtocolJson}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}

              {/* TAB 3: AUDIT TRAIL */}
              {activeTab === 'audit' && (
                <div className="space-y-2">
                  {(result?.audit_trail || []).map((ev: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">#{idx + 1}</span>
                        <strong className="text-indigo-600">{ev.event}</strong>
                        <span className="text-slate-500">by {ev.actor}</span>
                      </div>
                      <span className="text-slate-600 text-[11px] truncate max-w-xs">{JSON.stringify(ev.details || ev.status || ev.decision || '')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: GATEWAY RECEIPT */}
              {activeTab === 'receipt' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Rail:</span>
                    <strong className="text-slate-900">{result?.payment_rail?.rail || 'Razorpay Test Mode'}</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Settlement Status:</span>
                    <strong className="text-indigo-600">{result?.payment_rail?.status || 'N/A'}</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Order ID:</span>
                    <strong className="text-slate-900">{result?.payment_rail?.razorpay_order_id || 'None (Blocked at Layer)'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Gateway Invoked:</span>
                    <strong className={result?.payment_rail?.razorpay_invoked ? 'text-emerald-600' : 'text-slate-600'}>
                      {result?.payment_rail?.razorpay_invoked ? 'YES' : 'NO (ZERO RAIL LEAKAGE)'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COLLAPSIBLE CUSTOM PLAYGROUND ACCORDION */}
        <div className="rounded-3xl bg-white border border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCustomSandbox(!showCustomSandbox)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/60 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Custom Parameter Sandbox</h4>
                <p className="text-[11px] text-slate-500">Manually customize merchant, product, category, amount, or idempotency keys</p>
              </div>
            </div>
            {showCustomSandbox ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showCustomSandbox && (
            <div className="p-6 border-t border-slate-100 space-y-4 text-xs bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Merchant</label>
                  <input
                    type="text"
                    value={customMerchant}
                    onChange={(e) => setCustomMerchant(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Product Description</label>
                  <input
                    type="text"
                    value={customProduct}
                    onChange={(e) => setCustomProduct(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Amount (₹ INR)</label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-mono text-slate-500">Idempotency Key: {idempotencyKey}</span>
                <button
                  type="button"
                  onClick={() => setIdempotencyKey(`idemp_sim_${Date.now()}`)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Generate New Key</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}

export default SimulatorPage;
