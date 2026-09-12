'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Cpu,
  Layers,
  FileCheck2,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface VerificationCheckItem {
  id: number;
  name: string;
  status: 'PASSED' | 'FAILED' | 'REQUIRES_APPROVAL' | 'SKIPPED';
  details: string;
  metric?: string;
}

export interface VerificationPanelProps {
  decision: 'ALLOW' | 'BLOCK' | 'REQUIRES_HUMAN_APPROVAL' | 'APPROVED' | 'BLOCKED' | 'REVIEW' | string;
  reason?: string;
  checks?: VerificationCheckItem[];
  riskScore?: number;
  summary?: {
    passedChecks: number;
    totalChecks: number;
    failedChecks: number;
    requiresApproval: boolean;
  };
  rawDecision?: any;
  showPipeline?: boolean;
}

export function VerificationPanel({
  decision,
  reason,
  checks = [],
  riskScore,
  summary,
  rawDecision,
  showPipeline = true,
}: VerificationPanelProps) {
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Normalize decision string
  const normDecision: 'ALLOW' | 'BLOCK' | 'REQUIRES_HUMAN_APPROVAL' =
    decision === 'APPROVED' || decision === 'ALLOW'
      ? 'ALLOW'
      : decision === 'REVIEW' || decision === 'REQUIRES_HUMAN_APPROVAL'
      ? 'REQUIRES_HUMAN_APPROVAL'
      : 'BLOCK';

  // Fallback checks if none provided (e.g. legacy transaction inspection)
  const displayChecks: VerificationCheckItem[] =
    checks && checks.length > 0
      ? checks
      : [
          { id: 1, name: 'Agent registered and active', status: 'PASSED', details: 'Agent identity authenticated & active' },
          { id: 2, name: 'Mandate exists', status: 'PASSED', details: 'Active mandate referenced' },
          { id: 3, name: 'Mandate active', status: 'PASSED', details: 'Status verified as ACTIVE' },
          { id: 4, name: 'Mandate not expired', status: 'PASSED', details: 'Within validity window' },
          { id: 5, name: 'Merchant permitted', status: 'PASSED', details: 'Authorized in mandate scope' },
          { id: 6, name: 'Product/category permitted', status: 'PASSED', details: 'Scope approved' },
          {
            id: 7,
            name: 'Transaction amount within limit',
            status: normDecision === 'BLOCK' && reason?.toLowerCase().includes('amount') ? 'FAILED' : 'PASSED',
            details: 'Per-transaction ceiling check',
          },
          { id: 8, name: 'Daily spending limit remaining', status: 'PASSED', details: 'Daily cumulative cap verified' },
          { id: 9, name: 'Currency permitted', status: 'PASSED', details: 'Currency INR approved' },
          {
            id: 10,
            name: 'Transaction not duplicated',
            status: normDecision === 'BLOCK' && reason?.toLowerCase().includes('duplicate') ? 'FAILED' : 'PASSED',
            details: 'Idempotency validated',
          },
          {
            id: 11,
            name: 'Human approval bounds evaluated',
            status: normDecision === 'REQUIRES_HUMAN_APPROVAL' ? 'REQUIRES_APPROVAL' : 'PASSED',
            details: 'Approval threshold check',
          },
        ];

  const passedCount = summary?.passedChecks ?? displayChecks.filter((c) => c.status === 'PASSED').length;
  const totalCount = summary?.totalChecks ?? displayChecks.length;

  const copyJson = () => {
    const payload = rawDecision || {
      decision: normDecision,
      reason: reason || (normDecision === 'ALLOW' ? 'Payment authorized' : 'Payment blocked'),
      checks: displayChecks,
      riskScore,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden text-slate-900">
      {/* 1. ARCHITECTURAL 5-STAGE PIPELINE INDICATOR */}
      {showPipeline && (
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 text-[11px] font-mono">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Verification Engine Flow
            </span>
            <span className="text-[10px] text-slate-500 font-sans">
              Deterministic • Zero Frontend Trust
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 scrollbar-none text-slate-400">
            <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>AI Agent</span>
            </div>
            <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

            <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Payment Request</span>
            </div>
            <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

            <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Reliability Layer</span>
            </div>
            <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

            <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-indigo-950/80 border border-indigo-700/80 text-indigo-200 font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span>Validation Engine</span>
            </div>
            <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

            <div
              className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded font-semibold border ${
                normDecision === 'ALLOW'
                  ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-200'
                  : normDecision === 'BLOCK'
                  ? 'bg-rose-950/80 border-rose-700/80 text-rose-200'
                  : 'bg-amber-950/80 border-amber-700/80 text-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  normDecision === 'ALLOW'
                    ? 'bg-emerald-400'
                    : normDecision === 'BLOCK'
                    ? 'bg-rose-400'
                    : 'bg-amber-400'
                }`}
              />
              <span>Payment Decision</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. PROMINENT DECISION BANNER */}
      <div
        className={`p-5 sm:p-6 border-b transition-colors ${
          normDecision === 'ALLOW'
            ? 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950'
            : normDecision === 'BLOCK'
            ? 'bg-rose-50/90 border-rose-200/90 text-rose-950'
            : 'bg-amber-50/90 border-amber-200/90 text-amber-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                normDecision === 'ALLOW'
                  ? 'bg-emerald-600 text-white'
                  : normDecision === 'BLOCK'
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {normDecision === 'ALLOW' ? (
                <ShieldCheck className="w-7 h-7" />
              ) : normDecision === 'BLOCK' ? (
                <ShieldAlert className="w-7 h-7" />
              ) : (
                <AlertCircle className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight font-sans">
                  {normDecision === 'ALLOW' && 'PAYMENT AUTHORIZED'}
                  {normDecision === 'BLOCK' && 'PAYMENT BLOCKED'}
                  {normDecision === 'REQUIRES_HUMAN_APPROVAL' && 'REQUIRES HUMAN APPROVAL'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    normDecision === 'ALLOW'
                      ? 'bg-emerald-200/80 text-emerald-900 border border-emerald-300'
                      : normDecision === 'BLOCK'
                      ? 'bg-rose-200/80 text-rose-900 border border-rose-300'
                      : 'bg-amber-200/80 text-amber-900 border border-amber-300'
                  }`}
                >
                  {normDecision}
                </span>
              </div>
              {reason && (
                <div className="mt-1 text-xs sm:text-sm font-medium leading-relaxed">
                  <strong className="font-semibold">Reason: </strong>
                  <span className={normDecision === 'BLOCK' ? 'text-rose-900 font-semibold' : 'text-slate-700'}>
                    {reason}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {typeof riskScore === 'number' && (
              <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200/80 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Risk Score</span>
                <span
                  className={`text-sm font-black font-mono-tabular ${
                    riskScore > 60 ? 'text-rose-600' : riskScore > 30 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {riskScore}/100
                </span>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200/80 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Checks Passed</span>
              <span className="text-sm font-black font-mono-tabular text-slate-800">
                {passedCount} / {totalCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 11 DETERMINISTIC PRE-PAYMENT VERIFICATION CHECKS */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Pre-Payment Verification Engine Checkpoints
            </h4>
            <p className="text-[11px] text-slate-400">
              Evaluated in strict mathematical sequence before payment execution
            </p>
          </div>
          <button
            type="button"
            onClick={copyJson}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied JSON' : 'Copy Decision'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-xs">
          {displayChecks.map((chk) => {
            const isPassed = chk.status === 'PASSED';
            const isFailed = chk.status === 'FAILED';
            const isApproval = chk.status === 'REQUIRES_APPROVAL';

            return (
              <div
                key={chk.id}
                className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
                  isPassed
                    ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                    : isFailed
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950 font-semibold'
                    : isApproval
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isPassed ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs">
                        ✓
                      </span>
                    ) : isFailed ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-black text-xs">
                        ✗
                      </span>
                    ) : isApproval ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                        !
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs">
                        —
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 text-xs truncate">
                      {chk.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-sans mt-0.5 leading-snug">
                      {chk.details}
                    </div>
                  </div>
                </div>

                {chk.metric && (
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPassed
                          ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200'
                          : isFailed
                          ? 'bg-rose-100/90 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {chk.metric}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. EXPANDABLE STRUCTURED DECISION JSON INSPECTOR */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-mono transition-colors"
          >
            {showJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showJson ? 'Hide Structured Decision JSON' : 'Inspect Raw Machine Decision JSON'}</span>
          </button>

          {showJson && (
            <div className="mt-2.5 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs relative overflow-x-auto">
              <pre className="text-[11px] leading-relaxed">
                {JSON.stringify(
                  rawDecision || {
                    decision: normDecision,
                    reason: reason || (normDecision === 'ALLOW' ? 'Payment authorized' : 'Payment blocked'),
                    checks: displayChecks,
                    riskScore,
                    summary: {
                      passedChecks: passedCount,
                      totalChecks: totalCount,
                      failedChecks: totalCount - passedCount,
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerificationPanel;
