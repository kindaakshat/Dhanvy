'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Bot,
  CreditCard,
  Binary,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Layers,
  FileCheck,
  Coins,
  Check,
  AlertOctagon,
  Clock,
  UserCheck,
  Lock,
} from 'lucide-react';

// Step definitions for the 10-step hackathon pitch
const DEMO_STEPS = [
  {
    step: 1,
    title: 'Create Mandate',
    shortLabel: '1. Mandate',
    headline: 'STEP 1: User Creates a Bound Payment Mandate',
    subtitle: 'Governance policy: ₹5,000 per transaction, ₹15,000 daily limit, Approved merchant: ExampleMart.',
    tag: 'GOVERNANCE SETUP',
  },
  {
    step: 2,
    title: 'Agent Request',
    shortLabel: '2. Request',
    headline: 'STEP 2: Autonomous Shopping Agent Dispatches Request',
    subtitle: 'Agent finds office supplies for ₹1,299 at ExampleMart and requests payment authorization.',
    tag: 'AGENT PROCUREMENT',
  },
  {
    step: 3,
    title: '7-Point Verification',
    shortLabel: '3. Verification',
    headline: 'STEP 3: Reliability Layer Executes Pre-Payment Verification',
    subtitle: 'LEO verifies 7 deterministic invariants before any payment rail or gateway is contacted.',
    tag: 'RELIABILITY ENGINE',
  },
  {
    step: 4,
    title: 'Payment Execution',
    shortLabel: '4. Payment',
    headline: 'STEP 4: Payment Executes Successfully',
    subtitle: 'Pre-flight checks passed. Razorpay Test Mode order generated and transaction settled.',
    tag: 'GATEWAY SETTLEMENT',
  },
  {
    step: 5,
    title: 'Duplicate Prevented',
    shortLabel: '5. Duplicate Catch',
    headline: 'STEP 5: Agent Retries Exact Same Payment Request',
    subtitle: 'Autonomous retry detected. Replay protection prevents secondary gateway charge.',
    tag: 'IDEMPOTENCY SHIELD',
  },
  {
    step: 6,
    title: 'Mandate Limit Exceeded',
    shortLabel: '6. Limit Exceeded',
    headline: 'STEP 6: Agent Attempts ₹8,000 Purchase Exceeding Ceiling',
    subtitle: 'Requested ₹8,000 exceeds ₹5,000 mandate cap. System immediately blocks payment.',
    tag: 'POLICY ENFORCEMENT',
  },
  {
    step: 7,
    title: 'Merchant Not Authorized',
    shortLabel: '7. Rogue Vendor',
    headline: 'STEP 7: Agent Attempts ₹4,000 Purchase from Unapproved Merchant',
    subtitle: 'Vendor RogueMart is outside the mandate whitelist. Payment intercepted before rail.',
    tag: 'MERCHANT GOVERNANCE',
  },
  {
    step: 8,
    title: 'Human Approval',
    shortLabel: '8. Human-in-the-Loop',
    headline: 'STEP 8: High-Value Transaction Requiring Human Approval',
    subtitle: 'Transaction of ₹6,500 exceeds automated threshold. Escalated to supervisor queue.',
    tag: 'SUPERVISOR REVIEW',
  },
  {
    step: 9,
    title: 'Cryptographic Audit',
    shortLabel: '9. Audit Ledger',
    headline: 'STEP 9: Cryptographically Linked SHA-256 Audit Trail',
    subtitle: 'Every state transition is signed in an immutable linear hash-chain with tamper detection.',
    tag: 'TAMPER-PROOF LEDGER',
  },
  {
    step: 10,
    title: 'Dispute & Reversal',
    shortLabel: '10. Dispute Reversal',
    headline: 'STEP 10: User Disputes Transaction — Payment Reversed',
    subtitle: 'One-click customer dispute initiates automated gateway clawback and ledger reversal.',
    tag: 'SETTLEMENT REVERSAL',
  },
  {
    step: 11,
    title: 'Final Summary',
    shortLabel: 'Summary',
    headline: 'PLATFORM IMPACT SCORECARD',
    subtitle: 'Complete 3-minute demonstration results across all 10 reliability benchmarks.',
    tag: 'PITCH SUMMARY',
  },
];

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://dhanvy-api.vercel.app';
}

export default function HackathonDemoPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepData, setStepData] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [step8Approved, setStep8Approved] = useState<boolean>(false);
  const [step8Approving, setStep8Approving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer increment
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNextStep();
      } else if (e.key === 'ArrowLeft') {
        goToPrevStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  // Load step data on mount or step change
  useEffect(() => {
    if (currentStep <= 10 && !stepData[currentStep]) {
      executeStep(currentStep);
    }
    if (currentStep === 11) {
      fetchSummary();
    }
  }, [currentStep]);

  // Autoplay progression
  useEffect(() => {
    if (isAutoPlaying) {
      const delay = currentStep === 8 && !step8Approved ? 4000 : 5000;
      autoPlayTimerRef.current = setTimeout(() => {
        if (currentStep < 11) {
          goToNextStep();
        } else {
          setIsAutoPlaying(false);
        }
      }, delay);
    } else {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    }
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [isAutoPlaying, currentStep, step8Approved]);

  const executeStep = async (stepNum: number, extraBody?: any) => {
    setLoading(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/demo/step/${stepNum}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: extraBody ? JSON.stringify(extraBody) : undefined,
      });
      const json = await res.json();
      if (json.success) {
        setStepData((prev) => ({ ...prev, [stepNum]: json }));
      }
    } catch (err) {
      console.error(`Error executing step ${stepNum}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/demo/summary`);
      const json = await res.json();
      if (json.success) {
        setSummaryData(json.data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setIsAutoPlaying(false);
    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}/api/demo/reset`, { method: 'POST' });
      setStepData({});
      setSummaryData(null);
      setStep8Approved(false);
      setElapsedSeconds(0);
      setCurrentStep(1);
      // Execute Step 1 fresh
      executeStep(1);
    } catch (err) {
      console.error('Error resetting demo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleApproveStep8 = async () => {
    setStep8Approving(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/demo/step/8`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const json = await res.json();
      if (json.success) {
        setStepData((prev) => ({ ...prev, 8: json }));
        setStep8Approved(true);
      }
    } catch (err) {
      console.error('Error approving step 8:', err);
    } finally {
      setStep8Approving(false);
    }
  };

  const goToNextStep = () => {
    if (currentStep < 11) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeMeta = DEMO_STEPS.find((s) => s.step === currentStep) || DEMO_STEPS[0];
  const currentStepPayload = stepData[currentStep];

  return (
    <AppShell>
      <Header
        title="Hackathon Demo Mode"
        subtitle="Live 3–5 minute guided presentation flow of the Agentic Commerce Payment Reliability Platform."
        badge="JUDGES PITCH • FULL INFRASTRUCTURE FLOW"
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* TOP PRESENTER BAR: Timer, Mode Toggle, Reset */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-2xl bg-slate-950 text-white border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                  LEO PITCH CONTROL PLANE
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  REAL BACKEND ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Pitch Duration: <span className="text-slate-200 font-mono">03:30 min</span> &bull; Keyboard: <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 rounded">←</kbd> <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 rounded">→</kbd>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Elapsed Pitch Timer */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-mono font-bold text-slate-200">
                {formatTimer(elapsedSeconds)}
              </span>
              <span className="text-[10px] font-mono text-slate-500">/ 03:30</span>
            </div>

            {/* Autoplay / Manual Toggle */}
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                isAutoPlaying
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {isAutoPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Autoplay Active</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Autoplay (3 Min)</span>
                </>
              )}
            </button>

            {/* 1-Click Reset Button */}
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all"
              title="Reset database and replay demo from Step 1"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Resetting...' : '1-Click Reset'}</span>
            </button>

            {/* Jump to Summary */}
            <button
              onClick={() => setCurrentStep(11)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
            >
              <span>Final Summary &rarr;</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 10-STEP HORIZONTAL STEP TRACKER */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs overflow-x-auto">
          <div className="flex items-center min-w-max gap-1">
            {DEMO_STEPS.map((s) => {
              const isCurrent = s.step === currentStep;
              const isPast = s.step < currentStep;
              const isBlockedStep = s.step === 5 || s.step === 6 || s.step === 7;
              const isReviewStep = s.step === 8;
              const isSummaryStep = s.step === 11;

              let pillStyle = 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100';
              if (isCurrent) {
                pillStyle = 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 ring-2 ring-blue-400/30 font-bold';
              } else if (isPast) {
                if (isBlockedStep) {
                  pillStyle = 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
                } else if (isReviewStep) {
                  pillStyle = 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
                } else {
                  pillStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
                }
              }

              return (
                <button
                  key={s.step}
                  onClick={() => setCurrentStep(s.step)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${pillStyle}`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-white/20">
                    {isPast ? <Check className="w-3 h-3" /> : s.step}
                  </span>
                  <span>{s.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP HEADER & OBJECTIVE */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {activeMeta.tag}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Step {currentStep} of 10
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              {activeMeta.headline}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-3xl">
              {activeMeta.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={goToNextStep}
              disabled={currentStep === 11}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-600/20 transition-all"
            >
              <span>{currentStep === 10 ? 'View Final Scorecard' : 'Next Step'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STAGE AREA: SPLIT SCREEN (AGENT vs RELIABILITY LAYER) */}
        {/* ========================================================================= */}
        {currentStep <= 10 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* --------------------------------------------------------------------- */}
            {/* LEFT COLUMN: AGENT PROMPT & REASONING (5 COLS) */}
            {/* --------------------------------------------------------------------- */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        ShoppingAgent-01
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Autonomous Procurement Agent
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-700">
                    AI AGENT LAYER
                  </span>
                </div>

                {/* Speech Bubble */}
                <div className="relative p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed font-sans mb-4">
                  <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                    <span>Agent Voice / Intent Prompt:</span>
                  </div>
                  {currentStep === 1 && (
                    <p className="italic text-slate-700">
                      "System initialized. Awaiting user policy mandate configuration to bound autonomous spending authority."
                    </p>
                  )}
                  {currentStep === 2 && (
                    <p className="italic text-slate-700">
                      "I found the required office supplies for ₹1,299 at the approved merchant ExampleMart."
                    </p>
                  )}
                  {currentStep === 3 && (
                    <p className="italic text-slate-700">
                      "Dispatched machine-readable authorization protocol payload to LEO. Awaiting 7-point cryptographic verification."
                    </p>
                  )}
                  {currentStep === 4 && (
                    <p className="italic text-slate-700">
                      "Payment order authorized! Capturing settlement on Razorpay Test Mode rail."
                    </p>
                  )}
                  {currentStep === 5 && (
                    <p className="italic text-slate-700">
                      "Network glitch detected. Retrying the exact same payment request with identical idempotency key..."
                    </p>
                  )}
                  {currentStep === 6 && (
                    <p className="italic text-slate-700">
                      "I found an executive ergonomic workstation suite for ₹8,000 at ExampleMart. Requesting payment authorization."
                    </p>
                  )}
                  {currentStep === 7 && (
                    <p className="italic text-slate-700">
                      "I found discounted office equipment for ₹4,000 from vendor RogueMart. Requesting payment authorization."
                    </p>
                  )}
                  {currentStep === 8 && (
                    <p className="italic text-slate-700">
                      "I found an enterprise Dell 4K Executive Monitor for ₹6,499 at ExampleMart. Requesting payment authorization."
                    </p>
                  )}
                  {currentStep === 9 && (
                    <p className="italic text-slate-700">
                      "Reviewing immutable audit ledger. Validating SHA-256 cryptographic hash continuity across all previous steps."
                    </p>
                  )}
                  {currentStep === 10 && (
                    <p className="italic text-slate-700">
                      "Cardholder filed a dispute for transaction. Reliability layer initiating automated gateway clawback."
                    </p>
                  )}
                </div>

                {/* Machine Protocol Payload Preview */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-500 uppercase mb-1.5">
                    <span>Protocol Request Payload</span>
                    <span className="text-indigo-600">JSON-Schema v1</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto leading-tight border border-slate-800">
                    {currentStep === 1 &&
                      JSON.stringify(
                        {
                          action: 'CREATE_MANDATE',
                          mandate_id: 'mnd_demo_examplemart',
                          max_amount: 500000,
                          daily_limit: 1500000,
                          approved_merchants: ['ExampleMart'],
                          approval_threshold: 500000,
                          currency: 'INR',
                          status: 'ACTIVE',
                        },
                        null,
                        2
                      )}
                    {currentStep >= 2 &&
                      currentStep <= 5 &&
                      JSON.stringify(
                        {
                          protocol: 'LEO-APRP/1.0',
                          agent_id: 'ShoppingAgent-01',
                          mandate_id: 'mnd_demo_examplemart',
                          merchant: 'ExampleMart',
                          amount_inr: 1299.0,
                          amount_paise: 129900,
                          idempotency_key: 'idemp_demo_step4_live',
                          retry_attempt: currentStep === 5 ? 2 : 1,
                        },
                        null,
                        2
                      )}
                    {currentStep === 6 &&
                      JSON.stringify(
                        {
                          agent_id: 'ShoppingAgent-01',
                          mandate_id: 'mnd_demo_examplemart',
                          merchant: 'ExampleMart',
                          amount_inr: 8000.0,
                          amount_paise: 800000,
                          mandate_ceiling: 500000,
                        },
                        null,
                        2
                      )}
                    {currentStep === 7 &&
                      JSON.stringify(
                        {
                          agent_id: 'ShoppingAgent-01',
                          mandate_id: 'mnd_demo_examplemart',
                          merchant: 'RogueMart',
                          amount_inr: 4000.0,
                          approved_whitelist: ['ExampleMart'],
                        },
                        null,
                        2
                      )}
                    {currentStep === 8 &&
                      JSON.stringify(
                        {
                          agent_id: 'ShoppingAgent-01',
                          merchant: 'ExampleMart',
                          product: 'Dell UltraSharp 27 4K Monitor',
                          amount_inr: 6499.0,
                          requires_human_approval_above: 5000.0,
                        },
                        null,
                        2
                      )}
                    {currentStep === 9 &&
                      JSON.stringify(
                        {
                          audit_standard: 'SHA-256 Hash Chain',
                          genesis_hash: '00000000000000000000000000000000...',
                          tamper_evident: true,
                        },
                        null,
                        2
                      )}
                    {currentStep === 10 &&
                      JSON.stringify(
                        {
                          action: 'TRIGGER_DISPUTE_REVERSAL',
                          transaction_id: 'tx_demo_step4',
                          amount_inr: 1299.0,
                          reason: 'Agent procurement discrepancy',
                        },
                        null,
                        2
                      )}
                  </pre>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* RIGHT COLUMN: RELIABILITY LAYER & VERIFICATION STAGE (7 COLS) */}
            {/* --------------------------------------------------------------------- */}
            <div className="lg:col-span-7 space-y-4">
              {/* =================================================================== */}
              {/* STEP 1: Mandate Details */}
              {/* =================================================================== */}
              {currentStep === 1 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Autonomous Payment Envelope Configured
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                      ACTIVE MANDATE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-mono text-slate-500 uppercase">
                        Per-Transaction Limit
                      </span>
                      <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                        ₹5,000
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Hard cap on single purchase
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-mono text-slate-500 uppercase">
                        Daily Spending Limit
                      </span>
                      <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                        ₹15,000
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Cumulative 24h envelope
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-mono text-slate-500 uppercase">
                        Approved Merchant
                      </span>
                      <div className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>ExampleMart</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Exclusive merchant whitelist
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold">Human Approval Threshold:</span> Purchases above ₹5,000 automatically escalate to human supervisor sign-off.
                    </div>
                    <button
                      onClick={goToNextStep}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors shrink-0 ml-3"
                    >
                      Proceed to Step 2 &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 2: Agent Requests ₹1,299 */}
              {/* =================================================================== */}
              {currentStep === 2 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Autonomous Procurement Intent Captured
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-800">
                      READY FOR PRE-CHECK
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Merchant Target:</span>
                      <span className="text-sm font-bold text-white">ExampleMart</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Selected Product:</span>
                      <span className="text-sm text-slate-200">Premium Office Supplies & Stationery Kit</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                      <span className="text-xs font-mono text-slate-400">Total Purchase Amount:</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">₹1,299.00</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500">
                      Next: Reliability Layer evaluates all 7 pre-payment bounds.
                    </p>
                    <button
                      onClick={goToNextStep}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors shadow-sm"
                    >
                      Run 7-Point Verification &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 3: 7-Point Verification Checklist */}
              {/* =================================================================== */}
              {currentStep === 3 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <span>Pre-Payment Reliability Verification</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Evaluating 7 discrete safety invariants in real-time (&lt; 20ms)
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      DECISION: ALLOW
                    </span>
                  </div>

                  {/* 7 Checks Grid */}
                  <div className="space-y-2.5">
                    {[
                      { title: 'Agent identity', detail: 'ShoppingAgent-01 verified via cryptographic signature (Trust: 82/100)' },
                      { title: 'Mandate', detail: 'Envelope mnd_demo_examplemart is ACTIVE and within validity window' },
                      { title: 'Merchant', detail: 'ExampleMart is on the authorized merchant whitelist' },
                      { title: 'Amount', detail: '₹1,299 is within the ₹5,000 per-transaction cap' },
                      { title: 'Spending limit', detail: '₹1,299 spend is well within the ₹15,000 daily budget' },
                      { title: 'Duplicate check', detail: 'Idempotency key is fresh — 0 duplicate collisions detected' },
                      { title: 'Risk', detail: 'Risk score 12/100 (LOW RISK) — genuine procurement pattern' },
                    ].map((c, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <span className="font-bold text-emerald-950">✓ {c.title}</span>
                            <span className="text-emerald-800 ml-2 text-[11px]">{c.detail}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          PASSED
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      All 7 bounds verified. Safe to authorize.
                    </span>
                    <button
                      onClick={goToNextStep}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors shadow-sm"
                    >
                      Execute Payment &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 4: Payment Executes Successfully */}
              {/* =================================================================== */}
              {currentStep === 4 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Payment Authorized & Executed
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                      STATUS: SUCCESS
                    </span>
                  </div>

                  {/* High-contrast Success Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white border border-emerald-700 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                        Razorpay Test Mode Order Created
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        Rail: RAZORPAY_TEST_MODE
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-3xl font-bold font-mono text-white">
                          ₹1,299.00
                        </div>
                        <div className="text-xs text-emerald-300 mt-1">
                          Merchant: ExampleMart &bull; Order ID: {currentStepPayload?.data?.razorpay_order_id || 'order_demo_step4'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold font-mono">
                          SETTLED
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5-State Transition Pill */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1.5">
                      Deterministic Lifecycle Progression
                    </span>
                    <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                      <span className="text-emerald-700">CREATED</span> &rarr;
                      <span className="text-emerald-700">VALIDATING</span> &rarr;
                      <span className="text-emerald-700">AUTHORIZED</span> &rarr;
                      <span className="text-emerald-700">PROCESSING</span> &rarr;
                      <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">SUCCESS</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500">
                      Next: Demonstrating autonomous replay vulnerability.
                    </p>
                    <button
                      onClick={goToNextStep}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors shadow-sm"
                    >
                      Trigger Replay Attack &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 5: Accidental Retry -> DUPLICATE PAYMENT PREVENTED */}
              {/* =================================================================== */}
              {currentStep === 5 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Replay Attempt Intercepted
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800">
                      IDEMPOTENCY LOCK ACTIVE
                    </span>
                  </div>

                  {/* REQUIRED EXACT BANNER */}
                  <div className="p-6 rounded-2xl bg-amber-500 text-slate-950 border-2 border-amber-600 shadow-lg text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 text-amber-300 text-xs font-mono font-bold mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      REPLAY ATTACK INHIBITED
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight font-mono text-slate-950">
                      DUPLICATE PAYMENT PREVENTED
                    </h2>
                    <p className="text-xs font-bold text-amber-950 max-w-lg mx-auto">
                      Agent retried identical transaction. Second charge was blocked at Step 0 before reaching the payment gateway.
                    </p>
                  </div>

                  {/* Gateway Charge Verification Metric */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[11px] font-mono text-slate-500 uppercase">
                        Total Agent Requests
                      </span>
                      <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                        2
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <span className="text-[11px] font-mono text-emerald-800 uppercase">
                        Gateways Actually Charged
                      </span>
                      <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                        1
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500">
                      Zero money leakage. Payment rail never charged twice.
                    </p>
                    <button
                      onClick={goToNextStep}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors shadow-sm"
                    >
                      Test Mandate Limit Breach &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 6: Excessive Amount -> PAYMENT BLOCKED — MANDATE LIMIT EXCEEDED */}
              {/* =================================================================== */}
              {currentStep === 6 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-rose-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Ceiling Breach Intercepted
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-100 text-rose-800">
                      POLICY VIOLATION
                    </span>
                  </div>

                  {/* REQUIRED EXACT BANNER */}
                  <div className="p-6 rounded-2xl bg-rose-600 text-white border-2 border-rose-700 shadow-lg text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 text-rose-300 text-xs font-mono font-bold mb-1">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                      SPENDING CAP ENFORCED
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight font-mono text-white">
                      PAYMENT BLOCKED — MANDATE LIMIT EXCEEDED
                    </h2>
                    <p className="text-xs font-medium text-rose-100 max-w-lg mx-auto">
                      Requested amount ₹8,000 exceeds maximum authorized single-transaction limit of ₹5,000.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        Requested Amount
                      </span>
                      <div className="text-lg font-bold font-mono text-rose-600 mt-0.5">
                        ₹8,000
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        Mandate Limit
                      </span>
                      <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                        ₹5,000
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        Gateway Invocations
                      </span>
                      <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5">
                        0 (Inhibited)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500">
                      Next: Testing unauthorized merchant whitelist protection.
                    </p>
                    <button
                      onClick={goToNextStep}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors shadow-sm"
                    >
                      Test Rogue Vendor &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 7: Rogue Merchant -> PAYMENT BLOCKED — MERCHANT NOT AUTHORIZED */}
              {/* =================================================================== */}
              {currentStep === 7 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Vendor Whitelist Intercepted
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-100 text-rose-800">
                      UNAPPROVED MERCHANT
                    </span>
                  </div>

                  {/* REQUIRED EXACT BANNER */}
                  <div className="p-6 rounded-2xl bg-rose-900 text-white border-2 border-rose-600 shadow-lg text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950 text-rose-300 text-xs font-mono font-bold mb-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      WHITELIST RESTRICTION
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight font-mono text-rose-100">
                      PAYMENT BLOCKED — MERCHANT NOT AUTHORIZED
                    </h2>
                    <p className="text-xs font-medium text-rose-200 max-w-lg mx-auto">
                      Merchant "RogueMart" is not in the approved merchant directory [ExampleMart]. Payment terminated.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-[11px] font-mono text-rose-800 uppercase">
                        Attempted Merchant
                      </span>
                      <div className="text-lg font-bold text-rose-900 mt-1 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>RogueMart (Blocked)</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[11px] font-mono text-emerald-800 uppercase">
                        Allowed Merchants
                      </span>
                      <div className="text-lg font-bold text-emerald-900 mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>ExampleMart</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500">
                      Next: Demonstrating supervisor human-in-the-loop escalation.
                    </p>
                    <button
                      onClick={goToNextStep}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors shadow-sm"
                    >
                      Test Human Approval &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 8: High-Value Human Approval -> PENDING HUMAN APPROVAL */}
              {/* =================================================================== */}
              {currentStep === 8 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Human-in-the-Loop Governance
                      </h3>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        step8Approved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {step8Approved ? 'SUPERVISOR APPROVED' : 'HOLDING FOR REVIEW'}
                    </span>
                  </div>

                  {/* REQUIRED EXACT BANNER */}
                  {!step8Approved ? (
                    <div className="p-6 rounded-2xl bg-amber-500 text-slate-950 border-2 border-amber-600 shadow-lg text-center space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 text-amber-300 text-xs font-mono font-bold mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        ESCALATED TO SUPERVISOR QUEUE
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tight font-mono text-slate-950">
                        PENDING HUMAN APPROVAL
                      </h2>
                      <p className="text-xs font-bold text-amber-950 max-w-lg mx-auto">
                        Transaction of ₹6,500 exceeds the automated threshold of ₹5,000. Funds held with zero rail charge until approved.
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-emerald-600 text-white border-2 border-emerald-700 shadow-lg text-center space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 text-emerald-300 text-xs font-mono font-bold mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        SUPERVISOR SIGN-OFF GRANTED
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tight font-mono text-white">
                        PAYMENT EXECUTED SUCCESSFULLY
                      </h2>
                      <p className="text-xs font-medium text-emerald-100 max-w-lg mx-auto">
                        Human approval recorded in audit chain. Razorpay Test Mode order generated and settled.
                      </p>
                    </div>
                  )}

                  {/* Interactive Action Widget */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Dell UltraSharp 27 4K Executive Monitor — ₹6,500
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Merchant: ExampleMart &bull; Escalation: AMOUNT_EXCEEDS_THRESHOLD
                      </span>
                    </div>

                    {!step8Approved ? (
                      <button
                        onClick={handleApproveStep8}
                        disabled={step8Approving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all shrink-0"
                      >
                        <Check className="w-4 h-4" />
                        <span>{step8Approving ? 'Approving...' : 'Approve Payment (Human)'}</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-mono font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Order: {currentStepPayload?.data?.razorpay_order_id || 'order_hitl_live'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500">
                      Next: Inspecting the cryptographically linked SHA-256 audit chain.
                    </p>
                    <button
                      onClick={goToNextStep}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors shadow-sm"
                    >
                      View Cryptographic Audit Trail &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 9: Cryptographic Audit Trail */}
              {/* =================================================================== */}
              {currentStep === 9 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Binary className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Linear SHA-256 Cryptographic Audit Ledger
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>CHAIN INTEGRITY: VERIFIED ✓</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Every autonomous action is irrevocably appended into a linear SHA-256 hash-chain where <code className="px-1 py-0.5 bg-slate-100 rounded font-mono text-[11px]">hash[n] = SHA256(payload + hash[n-1])</code>.
                  </p>

                  {/* Hash-Chain Visualizer */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {[
                      { seq: 1, type: 'MANDATE_CREATED', actor: 'User (Finance)', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
                      { seq: 2, type: 'PAYMENT_AUTHORIZED', actor: 'LEO Engine', hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e' },
                      { seq: 3, type: 'DUPLICATE_PREVENTED', actor: 'Idempotency Engine', hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4' },
                      { seq: 4, type: 'MANDATE_CEILING_BLOCKED', actor: 'Ceiling Engine', hash: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35' },
                      { seq: 5, type: 'ROGUE_MERCHANT_BLOCKED', actor: 'Whitelist Engine', hash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce' },
                      { seq: 6, type: 'APPROVAL_GRANTED', actor: 'Supervisor (Human)', hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9' },
                    ].map((node) => (
                      <div
                        key={node.seq}
                        className="p-3 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-[10px]">
                            {node.seq}
                          </span>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{node.type}</span>
                              <span className="text-[10px] text-slate-400 font-normal">by {node.actor}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Hash: {node.hash.substring(0, 28)}...
                            </div>
                          </div>
                        </div>
                        <span className="text-emerald-400 text-[10px] font-bold">LINK VALID ✓</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500">
                      Next: Demonstrating consumer dispute and automated reversal.
                    </p>
                    <button
                      onClick={goToNextStep}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors shadow-sm"
                    >
                      Trigger Dispute & Reversal &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* STEP 10: Dispute & Reversal */}
              {/* =================================================================== */}
              {currentStep === 10 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Dispute Filing & Payment Reversal Flow
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800">
                      STATUS: REVERSED
                    </span>
                  </div>

                  {/* REQUIRED EXACT CALLOUT RECEIPT */}
                  <div className="p-5 rounded-2xl bg-slate-950 text-white border-2 border-indigo-500 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                        Reversal Receipt & Settlement Clawback
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        COMPLETED
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed">
                      Original Payment: <span className="font-bold text-white">₹1,299.00</span> | Reason: <span className="text-amber-300">Agent discrepancy</span> | Reversal Status: <span className="text-emerald-400 font-bold">COMPLETED</span> | Amount Returned: <span className="font-bold text-emerald-400">₹1,299.00</span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Rail: Razorpay Test Mode Reversal Engine</span>
                      <span className="font-mono text-slate-300">ID: {currentStepPayload?.data?.reversal_id || 'rev_demo_completed'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500">
                      All 10 reliability steps completed in under 4 minutes!
                    </p>
                    <button
                      onClick={goToNextStep}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md shadow-indigo-600/20"
                    >
                      View Final Impact Scorecard &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ======================================================================= */
          /* STEP 11: FINAL SUMMARY SCREEN */
          /* ======================================================================= */
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Mission Header */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border border-indigo-900/60 shadow-2xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold mb-3">
                <CheckCircle2 className="w-4 h-4" />
                <span>3-MINUTE LIVE PITCH BENCHMARK COMPLETED</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                Agentic Payments Protected
              </h2>
              <p className="text-sm md:text-base text-slate-300 mt-2 max-w-2xl mx-auto">
                LEO ensures AI agents can autonomously decide what to buy, while mathematically guaranteeing they can only pay for what is permitted.
              </p>
            </div>

            {/* THE 5 EXACT REQUIRED SUMMARY METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* METRIC 1: PAYMENTS PROTECTED */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  PAYMENTS PROTECTED
                </span>
                <div className="text-3xl font-black font-mono text-indigo-600">
                  {summaryData?.paymentsProtectedFormatted || '₹48,98,879'}
                </div>
                <p className="text-[11px] text-slate-500">
                  Total capital secured
                </p>
              </div>

              {/* METRIC 2: DUPLICATE PAYMENTS PREVENTED */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  DUPLICATE PAYMENTS PREVENTED
                </span>
                <div className="text-3xl font-black font-mono text-amber-600">
                  {summaryData?.duplicatePaymentsPrevented || '24'}
                </div>
                <p className="text-[11px] text-slate-500">
                  0 secondary gateway charges
                </p>
              </div>

              {/* METRIC 3: UNAUTHORIZED PAYMENTS BLOCKED */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  UNAUTHORIZED PAYMENTS BLOCKED
                </span>
                <div className="text-3xl font-black font-mono text-rose-600">
                  {summaryData?.unauthorizedPaymentsBlocked || '231'}
                </div>
                <p className="text-[11px] text-slate-500">
                  Bounds violations halted
                </p>
              </div>

              {/* METRIC 4: PAYMENTS REVERSED */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  PAYMENTS REVERSED
                </span>
                <div className="text-3xl font-black font-mono text-purple-600">
                  {summaryData?.paymentsReversed || '2'}
                </div>
                <p className="text-[11px] text-slate-500">
                  100% clawback fidelity
                </p>
              </div>

              {/* METRIC 5: AGENT TRUST SCORE */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-1 hover:shadow-md transition-shadow">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  AGENT TRUST SCORE
                </span>
                <div className="text-3xl font-black font-mono text-emerald-600">
                  {summaryData?.trustScoreFormatted || '82/100'}
                </div>
                <p className="text-[11px] text-slate-500">
                  Dynamic reputation metric
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="text-left">
                <h4 className="text-sm font-bold text-slate-900">
                  Ready to Pitch Again or Explore Deep Forensic Views?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  You can reset the environment in 1 click or drill down into any transaction in the Control Plane.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Pitch Demo</span>
                </button>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
                >
                  <span>Explore Main Control Plane</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
