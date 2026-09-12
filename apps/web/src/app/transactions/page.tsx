'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { fetchApi } from '@/lib/api';
import {
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  FileText,
  X,
  ExternalLink,
  Bot,
  User,
  Layers,
  Sparkles,
  GitCommit,
  Check,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { VerificationPanel, VerificationCheckItem } from '@/components/VerificationPanel';
import { AuditTimeline, TimelineStep } from '@/components/AuditTimeline';

const DISPUTE_REASONS = [
  'Agent exceeded mandate',
  'Wrong merchant',
  'Wrong amount',
  'Duplicate payment',
  'Unauthorized transaction',
  'Agent misinterpreted instruction',
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModalTab, setActiveModalTab] = useState<'VERIFICATION' | 'TIMELINE' | 'ATTRIBUTION'>('VERIFICATION');
  const [timelineData, setTimelineData] = useState<any | null>(null);
  const [attributionData, setAttributionData] = useState<any | null>(null);
  const [loadingModalData, setLoadingModalData] = useState(false);

  // Dispute modal state
  const [disputeModalTx, setDisputeModalTx] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>(DISPUTE_REASONS[0]);
  const [disputeNotes, setDisputeNotes] = useState<string>('');
  const [submittingDispute, setSubmittingDispute] = useState<boolean>(false);
  const [disputeNotification, setDisputeNotification] = useState<string | null>(null);

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeModalTx) return;

    setSubmittingDispute(true);
    try {
      const reasonCombined = disputeNotes
        ? `${disputeReason}: ${disputeNotes}`
        : disputeReason;

      await fetchApi('/api/disputes', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: disputeModalTx.id,
          reason: reasonCombined,
          userId: 'usr_demo_01',
        }),
      });

      // Update local transaction statuses to DISPUTED
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === disputeModalTx.id ? { ...t, status: 'DISPUTED' } : t
        )
      );

      if (selectedTx?.id === disputeModalTx.id) {
        setSelectedTx((prev: any) =>
          prev ? { ...prev, status: 'DISPUTED' } : prev
        );
      }

      setDisputeNotification(`Dispute filed for ${disputeModalTx.id}. Transaction status transitioned to DISPUTED.`);
      setDisputeModalTx(null);
      setDisputeNotes('');
      setTimeout(() => setDisputeNotification(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Error filing dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const loadTransactions = (decisionFilter: string) => {
    setLoading(true);
    const query = decisionFilter === 'ALL' ? '' : `?decision=${decisionFilter}`;
    fetchApi<any[]>(`/api/transactions${query}`)
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTransactions(filter);
  }, [filter]);

  const openDetail = async (id: string) => {
    try {
      setLoadingModalData(true);
      setActiveModalTab('VERIFICATION');
      const tx = await fetchApi<any>(`/api/transactions/${id}`);
      setSelectedTx(tx);

      // Concurrently fetch audit timeline and attribution
      Promise.allSettled([
        fetchApi<any>(`/api/audit/timeline/${id}`),
        fetchApi<any>(`/api/audit/attribution/${id}`),
      ]).then(([tlRes, attrRes]) => {
        if (tlRes.status === 'fulfilled') {
          setTimelineData(tlRes.value);
        } else {
          setTimelineData(null);
        }
        if (attrRes.status === 'fulfilled') {
          setAttributionData(attrRes.value);
        } else {
          setAttributionData(null);
        }
        setLoadingModalData(false);
      });
    } catch (err) {
      console.error(err);
      setLoadingModalData(false);
    }
  };

  return (
    <AppShell>
      <Header
        title="Transactions Ledger"
        subtitle="Every autonomous payment request, deterministic authorization decision, and payment outcome."
        badge="SETTLEMENT AUDIT"
      />

      <main className="p-8 space-y-8 max-w-7xl">
        {/* Dispute Status Notification */}
        {disputeNotification && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{disputeNotification}</span>
            </div>
            <Link
              href="/disputes"
              className="px-3 py-1 rounded-lg bg-amber-200/60 hover:bg-amber-200 text-amber-900 font-semibold text-xs transition-colors"
            >
              Open Disputes Center &rarr;
            </Link>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs">
          {['ALL', 'APPROVED', 'BLOCKED', 'REVIEW'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                filter === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              {tab === 'ALL' ? 'All Transactions' : tab}
            </button>
          ))}
        </div>

        {/* Transactions Table Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">Agent</th>
                  <th className="pb-3 font-semibold">Merchant & Product</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Risk</th>
                  <th className="pb-3 font-semibold">Decision / State</th>
                  <th className="pb-3 font-semibold">Razorpay Order ID</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => openDetail(tx.id)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 font-mono text-slate-500 text-[11px]">
                        {new Date(tx.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3.5 text-slate-900 font-bold">
                        {tx.agent?.name || 'Agent'}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-slate-900 font-semibold block">{tx.merchant}</span>
                        <span className="text-[11px] text-slate-500 truncate max-w-xs block">
                          {tx.product}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono-tabular font-bold text-slate-900">
                        ₹{(tx.amount / 100).toLocaleString()}
                      </td>
                      <td className="py-3.5 font-mono-tabular font-bold">
                        <span
                          className={
                            tx.riskScore > 60
                              ? 'text-rose-600'
                              : tx.riskScore > 30
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }
                        >
                          {tx.riskScore}/100
                        </span>
                      </td>
                      <td className="py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                              tx.decision === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.decision === 'BLOCKED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tx.decision}
                          </span>
                          {tx.status === 'DISPUTED' && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              DISPUTED
                            </span>
                          )}
                          {tx.status === 'REVERSED' && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-teal-100 text-teal-800 border border-teal-200 inline-flex items-center gap-1">
                              <RotateCcw className="w-2.5 h-2.5" />
                              REVERSED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 font-mono text-[11px] text-slate-500">
                        {tx.razorpayOrderId ? (
                          <span className="text-blue-600 font-medium">{tx.razorpayOrderId}</span>
                        ) : (
                          <span className="text-slate-400 italic">No rail call (Blocked)</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {tx.status === 'DISPUTED' ? (
                          <Link
                            href="/disputes"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-medium"
                          >
                            Contested
                          </Link>
                        ) : tx.status === 'REVERSED' ? (
                          <Link
                            href="/disputes"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-[10px] font-medium"
                          >
                            Reversed
                          </Link>
                        ) : tx.decision === 'APPROVED' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDisputeModalTx(tx);
                            }}
                            className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-medium cursor-pointer"
                          >
                            Dispute
                          </button>
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(tx.id);
                          }}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-medium cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No transactions match filter. Run the Simulator or Attack Lab.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AUTHORIZATION DETAIL INSPECTOR MODAL */}
        {selectedTx && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-950 text-slate-100 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-8 shadow-2xl relative space-y-6">
              <button
                onClick={() => setSelectedTx(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between border-b border-slate-800 pb-4 pr-8">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400">
                    Deterministic Decision Trace & Audit Lineage
                  </span>
                  <h2 className="text-lg font-bold text-white mt-0.5">LEO Transaction Inspector</h2>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTx.status === 'DISPUTED' && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      DISPUTED
                    </span>
                  )}
                  {selectedTx.status === 'REVERSED' && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      REVERSED
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold tracking-wider ${
                      selectedTx.decision === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : selectedTx.decision === 'BLOCKED'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {selectedTx.decision}
                  </span>
                </div>
              </div>

              {/* Inspector View Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveModalTab('VERIFICATION')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeModalTab === 'VERIFICATION'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>11 Verification Bounds</span>
                  </button>
                  <button
                    onClick={() => setActiveModalTab('TIMELINE')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeModalTab === 'TIMELINE'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Audit Timeline (7 Steps)</span>
                  </button>
                  <button
                    onClick={() => setActiveModalTab('ATTRIBUTION')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeModalTab === 'ATTRIBUTION'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>8-Node Attribution</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {selectedTx.status === 'DISPUTED' ? (
                    <Link
                      href="/disputes"
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium hover:bg-amber-500/30"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>View in Disputes Center</span>
                    </Link>
                  ) : selectedTx.status === 'REVERSED' ? (
                    <Link
                      href="/disputes"
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 font-medium hover:bg-teal-500/30"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Funds Reversed</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => setDisputeModalTx(selectedTx)}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium hover:bg-rose-500/30 cursor-pointer"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      <span>Dispute Transaction</span>
                    </button>
                  )}
                  <Link
                    href={`/audit?txId=${selectedTx.id}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-mono"
                  >
                    <span>Open in Audit Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* TAB 1: VERIFICATION & RULES TRACE */}
              {activeModalTab === 'VERIFICATION' && (
                <div className="space-y-6">
                  {/* 1. User Intent vs 2. Agent Action vs 3. Mandate Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                {/* User Intent */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    1. User Intent
                  </span>
                  <p className="text-slate-200 font-medium italic leading-relaxed">
                    &ldquo;{selectedTx.intent?.rawPrompt || 'Office procurement request under ₹5,000'}&rdquo;
                  </p>
                  <div className="text-[11px] text-slate-400 font-mono pt-1">
                    Max Bound: ₹{selectedTx.intent?.maxAmount ? (selectedTx.intent.maxAmount / 100).toLocaleString() : '5,000'}
                  </div>
                </div>

                {/* Agent Action */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    2. Agent Action
                  </span>
                  <div>
                    <div className="text-white font-bold">{selectedTx.merchant}</div>
                    <div className="text-slate-400 text-[11px] truncate">{selectedTx.product}</div>
                  </div>
                  <div className="text-base font-bold font-mono-tabular text-white pt-1">
                    ₹{(selectedTx.amount / 100).toLocaleString()}
                  </div>
                </div>

                {/* Mandate */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    3. Mandate Bounds
                  </span>
                  <div className="text-white font-bold">
                    {selectedTx.mandate?.merchant || selectedTx.merchant} ({selectedTx.category})
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Max allowed: ₹{selectedTx.mandate ? (selectedTx.mandate.maxAmount / 100).toLocaleString() : '5,000'}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400">
                    Mandate Status: {selectedTx.mandate?.status || 'ACTIVE'}
                  </div>
                </div>
              </div>

              {/* 4. Pre-Payment Verification Engine (11 Checks) */}
              {(() => {
                const decReasons = (() => {
                  try {
                    return JSON.parse(selectedTx.decisionReasons || '[]');
                  } catch {
                    return [];
                  }
                })();

                const txChecks: VerificationCheckItem[] = [
                  { id: 1, name: 'Agent registered & active', status: 'PASSED', details: `Agent ${selectedTx.agent?.name || 'Active'} verified` },
                  { id: 2, name: 'Mandate exists', status: selectedTx.mandateId ? 'PASSED' : 'FAILED', details: selectedTx.mandateId ? `Mandate ${selectedTx.mandateId} referenced` : 'No mandate referenced' },
                  { id: 3, name: 'Mandate active', status: selectedTx.mandate?.status === 'EXPIRED' ? 'FAILED' : 'PASSED', details: `Status: ${selectedTx.mandate?.status || 'ACTIVE'}` },
                  { id: 4, name: 'Mandate not expired', status: decReasons.includes('MANDATE_EXPIRED') ? 'FAILED' : 'PASSED', details: 'Within authorized validity window' },
                  { id: 5, name: 'Merchant permitted', status: decReasons.includes('MERCHANT_NOT_AUTHORIZED') ? 'FAILED' : 'PASSED', details: `Merchant: ${selectedTx.merchant}` },
                  { id: 6, name: 'Product/category permitted', status: decReasons.includes('CATEGORY_NOT_AUTHORIZED') || decReasons.includes('PRODUCT_PATTERN_MISMATCH') ? 'FAILED' : 'PASSED', details: `Scope: ${selectedTx.category} / ${selectedTx.product}` },
                  { id: 7, name: 'Transaction amount within limit', status: decReasons.includes('AMOUNT_LIMIT_EXCEEDED') ? 'FAILED' : 'PASSED', details: `Amount ₹${(selectedTx.amount / 100).toLocaleString()}`, metric: `₹${(selectedTx.amount / 100).toLocaleString()}` },
                  { id: 8, name: 'Daily spending limit remaining', status: decReasons.includes('DAILY_LIMIT_EXCEEDED') ? 'FAILED' : 'PASSED', details: 'Cumulative daily cap verified' },
                  { id: 9, name: 'Currency permitted', status: 'PASSED', details: `Currency: ${selectedTx.currency || 'INR'}` },
                  { id: 10, name: 'Transaction not duplicated', status: decReasons.includes('DUPLICATE_TRANSACTION') ? 'FAILED' : 'PASSED', details: `Key: ${selectedTx.idempotencyKey?.slice(0, 16)}...` },
                  { id: 11, name: 'Human approval bounds evaluated', status: selectedTx.decision === 'REVIEW' ? 'REQUIRES_APPROVAL' : 'PASSED', details: selectedTx.decision === 'REVIEW' ? 'Requires human confirmation' : 'Auto-authorized within mandate' },
                ];

                const reasonText = decReasons.length > 0
                  ? decReasons.join(', ')
                  : selectedTx.decision === 'APPROVED'
                  ? 'Payment authorized: all 11 verification bounds deterministically satisfied.'
                  : 'Payment blocked by policy bounds.';

                return (
                  <VerificationPanel
                    decision={selectedTx.decision}
                    reason={reasonText}
                    checks={txChecks}
                    riskScore={selectedTx.riskScore}
                    showPipeline={true}
                    rawDecision={{
                      transactionId: selectedTx.id,
                      idempotencyKey: selectedTx.idempotencyKey,
                      decision: selectedTx.decision,
                      amount: selectedTx.amount,
                      merchant: selectedTx.merchant,
                      reasons: decReasons,
                      checks: txChecks,
                    }}
                  />
                );
              })()}

              {/* 5. Risk & 6. Reasons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    5. Deterministic Risk Evaluation
                  </span>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold font-mono-tabular text-white">
                      {selectedTx.riskScore}
                    </span>
                    <span className="text-slate-400">/ 100</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    {selectedTx.riskReasons ? (
                      (() => {
                        try {
                          const r = JSON.parse(selectedTx.riskReasons);
                          return Array.isArray(r) ? r.map((reason: string, i: number) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-blue-400" />
                              <span>{reason}</span>
                            </div>
                          )) : null;
                        } catch {
                          return <div>{selectedTx.riskReasons}</div>;
                        }
                      })()
                    ) : (
                      <div>Base risk evaluated</div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    6. Machine Reason Codes
                  </span>
                  <div className="space-y-1.5">
                    {selectedTx.decisionReasons ? (
                      (() => {
                        try {
                          const codes = JSON.parse(selectedTx.decisionReasons);
                          return Array.isArray(codes) ? codes.map((code: string, i: number) => (
                            <div
                              key={i}
                              className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold border ${
                                selectedTx.decision === 'APPROVED'
                                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
                              }`}
                            >
                              {code}
                            </div>
                          )) : null;
                        } catch {
                          return <div className="font-mono text-xs">{selectedTx.decisionReasons}</div>;
                        }
                      })()
                    ) : (
                      <div className="font-mono text-xs">NO_CODES</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 7. Razorpay Rail Settlement */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-white">Razorpay Settlement Rail</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                      TEST MODE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    {selectedTx.razorpayOrderId
                      ? `Order ID: ${selectedTx.razorpayOrderId} | Status: ${selectedTx.razorpayStatus || 'created'}`
                      : 'Payment rail call inhibited. Blocked transactions never reach Razorpay.'}
                  </div>
                </div>
                {selectedTx.razorpayOrderId && (
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    PROCESSED
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT TIMELINE (7 STEPS) */}
          {activeModalTab === 'TIMELINE' && (
            <div className="space-y-4">
              {loadingModalData ? (
                <div className="p-12 text-center text-slate-400 font-mono text-xs">
                  Loading high-resolution audit timeline...
                </div>
              ) : (
                (() => {
                  const amountInr = (selectedTx.amount / 100).toLocaleString('en-IN');
                  const baseTime = selectedTx.createdAt ? new Date(selectedTx.createdAt) : new Date();
                  const formatTime = (d: Date) => d.toTimeString().split(' ')[0];
                  const addSecs = (secs: number) => new Date(baseTime.getTime() + secs * 1000);
                  const isApproved = selectedTx.decision === 'APPROVED';
                  const isReview = selectedTx.decision === 'REVIEW';
                  const decReasons = (() => {
                    try {
                      return JSON.parse(selectedTx.decisionReasons || '[]');
                    } catch {
                      return [];
                    }
                  })();

                  const activeTimeline: TimelineStep[] = timelineData?.timeline || [
                    {
                      step: 1,
                      time: formatTime(baseTime),
                      timestamp: baseTime.toISOString(),
                      title: `Agent requested ₹${amountInr}`,
                      action: 'PAYMENT_REQUESTED',
                      actor: selectedTx.agent?.name || 'ShoppingAgent-01',
                      actorType: 'AGENT',
                      status: 'PASSED',
                      latency: '+0ms',
                      details: `Procurement request submitted for "${selectedTx.product}" at ${selectedTx.merchant}.`,
                    },
                    {
                      step: 2,
                      time: formatTime(addSecs(0)),
                      timestamp: addSecs(0).toISOString(),
                      title: 'Mandate verified',
                      action: 'MANDATE_VERIFIED',
                      actor: 'LEO Mandate Engine',
                      actorType: 'SYSTEM',
                      status: 'PASSED',
                      latency: '+14ms',
                      details: `Active envelope ${selectedTx.mandateId || 'mnd_amazon_01'} validated with daily quota intact.`,
                    },
                    {
                      step: 3,
                      time: formatTime(addSecs(1)),
                      timestamp: addSecs(1).toISOString(),
                      title: 'Merchant verified',
                      action: 'MERCHANT_VERIFIED',
                      actor: 'LEO Whitelist Engine',
                      actorType: 'SYSTEM',
                      status: decReasons.includes('MERCHANT_NOT_IN_MANDATE') || decReasons.includes('MERCHANT_NOT_AUTHORIZED') ? 'FAILED' : 'PASSED',
                      latency: '+28ms',
                      details: `Merchant "${selectedTx.merchant}" checked against mandate authorization directory.`,
                    },
                    {
                      step: 4,
                      time: formatTime(addSecs(1)),
                      timestamp: addSecs(1).toISOString(),
                      title: 'Amount limit verified',
                      action: 'AMOUNT_VERIFIED',
                      actor: 'LEO Ceiling Engine',
                      actorType: 'SYSTEM',
                      status: decReasons.includes('AMOUNT_EXCEEDS_SINGLE_LIMIT') || decReasons.includes('AMOUNT_LIMIT_EXCEEDED') ? 'FAILED' : 'PASSED',
                      latency: '+41ms',
                      details: `₹${amountInr} compared against per-transaction ceiling.`,
                    },
                    {
                      step: 5,
                      time: formatTime(addSecs(1)),
                      timestamp: addSecs(1).toISOString(),
                      title: isApproved ? 'Payment authorized' : isReview ? 'Approval required' : 'Payment blocked',
                      action: isApproved ? 'PAYMENT_AUTHORIZED' : isReview ? 'APPROVAL_REQUESTED' : 'PAYMENT_BLOCKED',
                      actor: 'LEO Deterministic Gateway',
                      actorType: 'SYSTEM',
                      status: isApproved ? 'PASSED' : isReview ? 'WARNING' : 'FAILED',
                      latency: '+65ms',
                      details: isApproved
                        ? `All 11 verification bounds satisfied. Decision: APPROVED (Risk: ${selectedTx.riskScore}/100).`
                        : isReview
                        ? 'Amount exceeds review ceiling. Escalated to human supervisor review queue.'
                        : `Deterministic rejection: ${decReasons.join(', ') || 'POLICY_VIOLATION'}.`,
                    },
                    {
                      step: 6,
                      time: formatTime(addSecs(2)),
                      timestamp: addSecs(2).toISOString(),
                      title: isApproved ? 'Gateway accepted payment' : 'Gateway dispatch inhibited',
                      action: isApproved ? 'GATEWAY_ACCEPTED' : 'GATEWAY_HALTED',
                      actor: 'Razorpay Test Mode',
                      actorType: 'GATEWAY',
                      status: isApproved ? 'PASSED' : 'INFO',
                      latency: '+140ms',
                      details: isApproved
                        ? `Razorpay Test Mode order created: ${selectedTx.razorpayOrderId || 'order_TL_test_' + selectedTx.id.slice(0, 8)}.`
                        : 'Payment rail call inhibited. Blocked transactions never contact payment gateways.',
                    },
                    {
                      step: 7,
                      time: formatTime(addSecs(3)),
                      timestamp: addSecs(3).toISOString(),
                      title: isApproved ? 'Payment successful' : isReview ? 'Pending human approval' : 'Payment blocked',
                      action: isApproved ? 'PAYMENT_SUCCESSFUL' : isReview ? 'PENDING_APPROVAL' : 'PAYMENT_TERMINATED',
                      actor: 'LEO Settlement Registry',
                      actorType: 'SYSTEM',
                      status: isApproved ? 'PASSED' : isReview ? 'WARNING' : 'FAILED',
                      latency: '+195ms',
                      details: isApproved
                        ? 'Cryptographic receipt signed and appended to immutable SHA-256 ledger.'
                        : isReview
                        ? 'Held in supervisory queue. Cannot proceed to payment rail until human signs off.'
                        : 'Transaction halted without financial impact.',
                    },
                  ];

                  return (
                    <AuditTimeline
                      transactionId={selectedTx.id}
                      timeline={activeTimeline}
                      decision={selectedTx.decision}
                      amountInr={amountInr}
                      merchant={selectedTx.merchant}
                    />
                  );
                })()
              )}
            </div>
          )}

          {/* TAB 3: 8-NODE ATTRIBUTION LINEAGE */}
          {activeModalTab === 'ATTRIBUTION' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Complete trace chain for forensic accountability</span>
                <span className="text-emerald-400 font-bold">8 NODES VERIFIED</span>
              </div>

              {/* 8 Nodes Vertical Flow */}
              <div className="space-y-3 font-mono text-xs">
                {/* Node 1: User */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-[11px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">User Principal</span>
                      <span className="text-[10px] text-blue-400 font-bold">AUTHENTICATED</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">Demo User (Test Account)</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">ID: usr_demo_01 • Role: ADMIN • alex@trustlayer.dev</div>
                  </div>
                </div>

                {/* Node 2: Agent */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-[11px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Autonomous Agent</span>
                      <span className="text-[10px] text-emerald-400 font-bold">TRUST: {selectedTx.agent?.trustScore || 94}/100</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">{selectedTx.agent?.name || 'ShoppingAgent-01'}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">Agent ID: {selectedTx.agentId} • Status: ACTIVE</div>
                  </div>
                </div>

                {/* Node 3: Agent Instruction */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-[11px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Agent Instruction / Prompt</span>
                      <span className="text-[10px] text-violet-400 font-bold">INTENT HASHED</span>
                    </div>
                    <div className="text-slate-200 italic mt-0.5">
                      &ldquo;{selectedTx.intent?.rawPrompt || `Procure ${selectedTx.product} from ${selectedTx.merchant} within mandate budget`}&rdquo;
                    </div>
                  </div>
                </div>

                {/* Node 4: Mandate */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-[11px] shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Payment Mandate Envelope</span>
                      <span className="text-[10px] text-emerald-400 font-bold">{selectedTx.mandate?.status || 'ACTIVE'}</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">
                      {selectedTx.mandate?.name || 'Standard Procurement Policy'}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Mandate ID: {selectedTx.mandateId || 'mnd_amazon_01'} • Cap: ₹{selectedTx.mandate ? (selectedTx.mandate.maxAmount / 100).toLocaleString() : '5,000'}
                    </div>
                  </div>
                </div>

                {/* Node 5: Validation Checks */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-[11px] shrink-0 mt-0.5">
                    5
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Pre-Payment Verification Engine</span>
                      <span className={`text-[10px] font-bold ${selectedTx.decision === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {selectedTx.decision === 'APPROVED' ? '11/11 BOUNDS PASSED' : 'BOUNDS VIOLATED'}
                      </span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">
                      {selectedTx.decision === 'APPROVED' ? 'Deterministic Verification Succeeded' : 'Policy Bound Exception Raised'}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Risk Score: {selectedTx.riskScore}/100 • Evaluated in ~65ms before payment gateway execution
                    </div>
                  </div>
                </div>

                {/* Node 6: Human Approval */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-[11px] shrink-0 mt-0.5">
                    6
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Human-In-The-Loop Approval</span>
                      <span className="text-[10px] text-amber-400 font-bold">
                        {selectedTx.decision === 'REVIEW' ? 'PENDING_HUMAN_APPROVAL' : 'AUTO_AUTHORIZED'}
                      </span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">
                      {selectedTx.decision === 'REVIEW'
                        ? 'Escalated to Supervisory Review Queue'
                        : 'Pre-authorized within mandate policy boundary'}
                    </div>
                  </div>
                </div>

                {/* Node 7: Payment Transaction */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-[11px] shrink-0 mt-0.5">
                    7
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Payment Transaction</span>
                      <span className="text-[10px] text-sky-400 font-bold">IDEMPOTENT</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">
                      ₹{(selectedTx.amount / 100).toLocaleString()} {selectedTx.currency || 'INR'} at {selectedTx.merchant}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5 truncate">
                      TX: {selectedTx.id} • Key: {selectedTx.idempotencyKey}
                    </div>
                  </div>
                </div>

                {/* Node 8: Payment Result */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 border ${
                    selectedTx.decision === 'APPROVED'
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : selectedTx.decision === 'BLOCKED'
                      ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                      : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  }`}>
                    8
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Settlement & Audit Outcome</span>
                      <span className={`text-[10px] font-bold ${
                        selectedTx.decision === 'APPROVED' ? 'text-emerald-400' : selectedTx.decision === 'BLOCKED' ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {selectedTx.decision}
                      </span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">
                      {selectedTx.decision === 'APPROVED'
                        ? `Razorpay Order Created: ${selectedTx.razorpayOrderId || 'order_TL_test'}`
                        : selectedTx.decision === 'REVIEW'
                        ? 'Supervisory decision required before dispatch'
                        : 'Rail execution prevented. 0 INR settled.'}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Immutable SHA-256 event logged and hash-chained in audit ledger
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* DISPUTE TRANSACTION MODAL */}
    {disputeModalTx && (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 space-y-5 relative">
          <button
            onClick={() => setDisputeModalTx(null)}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Dispute Transaction</h3>
              <p className="text-xs text-slate-500">
                Tx: <span className="font-mono">{disputeModalTx.id}</span> • ₹{(disputeModalTx.amount / 100).toLocaleString('en-IN')} at {disputeModalTx.merchant}
              </p>
            </div>
          </div>

          <form onSubmit={handleDisputeSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Dispute Reason
              </label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                required
              >
                {DISPUTE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Context / Mandate Violation Details (Optional)
              </label>
              <textarea
                rows={3}
                value={disputeNotes}
                onChange={(e) => setDisputeNotes(e.target.value)}
                placeholder="Describe how the agent violated mandate constraints or user instructions..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Governance & Trust Impact</span>
              </div>
              <p>
                Submitting this dispute transitions the transaction status to{' '}
                <strong>DISPUTED</strong> and docks <strong>10 Trust Points</strong> from agent{' '}
                <span className="font-semibold">{disputeModalTx.agent?.name || disputeModalTx.agentId}</span>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDisputeModalTx(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingDispute}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submittingDispute ? 'Submitting Dispute...' : 'File Dispute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
      </main>
    </AppShell>
  );
}
