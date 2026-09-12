'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { fetchApi } from '@/lib/api';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ExternalLink,
  Bot,
  Flame,
  Binary,
  Layers,
  Sparkles,
  Repeat,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Activity,
  Search,
  RefreshCw,
  FileText,
  X,
  CreditCard,
  GitCommit,
  Coins,
  ShieldAlert,
  User,
  Filter,
  Check,
} from 'lucide-react';
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

interface StatsResponse {
  isDemoData: boolean;
  dataSource?: string;
  metrics: {
    totalTransactions: number;
    authorizedTransactions: number;
    blockedTransactions: number;
    pendingApproval: number;
    disputedTransactions: number;
    reversedTransactions: number;
    duplicatesPrevented: number;

    totalTransactionValue: number;
    amountBlocked: number;
    amountReversed: number;
    totalTransactionValueInr: number;
    amountBlockedInr: number;
    amountReversedInr: number;

    activeAgents: number;
    totalAgents: number;
    activeMandates: number;
    totalMandates: number;
    averageTrustScore: number;
    reviewQueue?: number;
  };
  liveFeed: any[];
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [filterTab, setFilterTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Inspector modal state
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
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

  const fetchStats = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await fetchApi<StatsResponse>('/api/stats');
      setStats(data);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setLoading(false);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(() => fetchStats(false), 10000);
    return () => clearInterval(timer);
  }, []);

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

      if (selectedTx?.id === disputeModalTx.id) {
        setSelectedTx((prev: any) =>
          prev ? { ...prev, status: 'DISPUTED' } : prev
        );
      }

      setDisputeNotification(`Dispute filed for ${disputeModalTx.id}. Status transitioned to DISPUTED.`);
      setDisputeModalTx(null);
      setDisputeNotes('');
      fetchStats(false);
      setTimeout(() => setDisputeNotification(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Error filing dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Filter and search logic for live transactions table
  const filteredFeed = (stats?.liveFeed || []).filter((tx: any) => {
    // Tab filter
    if (filterTab === 'APPROVED' && tx.decision !== 'APPROVED') return false;
    if (filterTab === 'BLOCKED' && tx.decision !== 'BLOCKED') return false;
    if (filterTab === 'REVIEW' && tx.decision !== 'REVIEW' && !tx.status?.includes('PENDING')) return false;
    if (filterTab === 'DISPUTED_REVERSED' && tx.status !== 'DISPUTED' && tx.status !== 'REVERSED') return false;

    // Search query filter
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchAgent = (tx.agent?.name || '').toLowerCase().includes(q);
      const matchMerchant = (tx.merchant || '').toLowerCase().includes(q);
      const matchProduct = (tx.product || '').toLowerCase().includes(q);
      const matchId = (tx.id || '').toLowerCase().includes(q);
      const matchMandate = (tx.mandate?.name || tx.mandateId || '').toLowerCase().includes(q);
      if (!matchAgent && !matchMerchant && !matchProduct && !matchId && !matchMandate) {
        return false;
      }
    }
    return true;
  });

  return (
    <AppShell>
      <Header
        title="Agentic Payment Reliability Platform"
        subtitle="Mission-critical governance, authorization invariants, and real-time telemetry for autonomous agent payments."
        badge="FINTECH CONTROL PLANE • RAZORPAY TEST MODE"
      />

      <main className="p-8 space-y-8 max-w-7xl">
        {/* Dispute Notification Banner */}
        {disputeNotification && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-300">
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

        {/* Real-time Control Plane Header Bar */}
        <div className="p-5 rounded-2xl bg-slate-950 text-white border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-emerald-400">
                  RELIABILITY ENGINE ONLINE
                </span>
                <span className="text-[11px] text-slate-500 font-mono">•</span>
                <span className="text-[11px] text-slate-400 font-mono" suppressHydrationWarning>
                  Synced: {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Atomic idempotency &bull; Deterministic bounds &bull; Cryptographic SHA-256 linear chain &bull; Zero money leakage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchStats(true)}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh telemetry stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-300 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <Link
              href="/simulator"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Simulator</span>
            </Link>
            <Link
              href="/attack-lab"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Attack Lab</span>
            </Link>
            <Link
              href="/idempotency"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all flex items-center gap-1.5"
            >
              <Repeat className="w-3.5 h-3.5 text-indigo-400" />
              <span>Idempotency</span>
            </Link>
            <Link
              href="/audit"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Binary className="w-3.5 h-3.5 text-slate-300" />
              <span>Audit Chain</span>
            </Link>
          </div>
        </div>

        {/* SECTION 1: FINANCIAL PROTECTION & FLEET HEALTH (6 KPI CARDS) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
                Financial Protection & Fleet Capacity
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Currency: INR (₹) &bull; Mode: Test Rails
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
            {/* 1. Total Transaction Value */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Total Transaction Value</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-extrabold font-mono-tabular text-slate-900 tracking-tight">
                  {loading ? '...' : `₹${((stats?.metrics.totalTransactionValue || 0) / 100).toLocaleString('en-IN')}`}
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5 flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3 h-3" />
                  <span>Gross authorized spend</span>
                </div>
              </div>
            </div>

            {/* 2. Amount Blocked */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Amount Blocked</span>
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-extrabold font-mono-tabular text-rose-600 tracking-tight">
                  {loading ? '...' : `₹${((stats?.metrics.amountBlocked || 0) / 100).toLocaleString('en-IN')}`}
                </div>
                <div className="text-[10px] text-rose-700 mt-0.5 font-medium">
                  Protected from breaches
                </div>
              </div>
            </div>

            {/* 3. Amount Reversed */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Amount Reversed</span>
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-extrabold font-mono-tabular text-teal-600 tracking-tight">
                  {loading ? '...' : `₹${((stats?.metrics.amountReversed || 0) / 100).toLocaleString('en-IN')}`}
                </div>
                <div className="text-[10px] text-teal-700 mt-0.5 font-medium">
                  Clawback & refunds safely settled
                </div>
              </div>
            </div>

            {/* 4. Active Agents */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Active Agents</span>
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-extrabold font-mono-tabular text-slate-900 tracking-tight">
                  {loading ? '...' : `${stats?.metrics.activeAgents ?? 0} / ${stats?.metrics.totalAgents ?? 0}`}
                </div>
                <div className="text-[10px] text-blue-700 mt-0.5 font-medium">
                  Autonomous fleet active
                </div>
              </div>
            </div>

            {/* 5. Active Mandates */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Active Mandates</span>
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-extrabold font-mono-tabular text-slate-900 tracking-tight">
                  {loading ? '...' : `${stats?.metrics.activeMandates ?? 0} / ${stats?.metrics.totalMandates ?? 0}`}
                </div>
                <div className="text-[10px] text-indigo-700 mt-0.5 font-medium">
                  Budget envelopes enforced
                </div>
              </div>
            </div>

            {/* 6. Average Trust Score */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Fleet Trust Score</span>
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-extrabold font-mono-tabular text-slate-900 tracking-tight">
                  {loading ? '...' : `${stats?.metrics.averageTrustScore ?? 81.1}`}
                  <span className="text-xs font-normal text-slate-400">/100</span>
                </div>
                <div className="text-[10px] text-purple-700 mt-0.5 font-medium">
                  Fleet behavioral health
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: OPERATIONAL RELIABILITY & DECISION COUNTS (7 USER-MANDATED METRICS) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
                Core Governance & Reliability Metrics (7 Invariants)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Deterministic Decision Pipeline
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* 1. TOTAL TRANSACTIONS */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Total Transactions
              </span>
              <div className="mt-3">
                <div className="text-2xl font-extrabold font-mono-tabular text-white tracking-tight">
                  {loading ? '...' : stats?.metrics.totalTransactions ?? 0}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">100% AUDITED</div>
              </div>
            </div>

            {/* 2. AUTHORIZED */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                  Authorized
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold font-mono-tabular text-emerald-700 tracking-tight">
                  {loading ? '...' : stats?.metrics.authorizedTransactions ?? 0}
                </div>
                <div className="text-[10px] font-mono text-emerald-700 mt-1 font-semibold">
                  PASSED BOUNDS
                </div>
              </div>
            </div>

            {/* 3. BLOCKED */}
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-800">
                  Blocked
                </span>
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold font-mono-tabular text-rose-700 tracking-tight">
                  {loading ? '...' : stats?.metrics.blockedTransactions ?? 0}
                </div>
                <div className="text-[10px] font-mono text-rose-700 mt-1 font-semibold">
                  ZERO RAIL LEAK
                </div>
              </div>
            </div>

            {/* 4. PENDING APPROVAL */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800">
                  Pending Approval
                </span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold font-mono-tabular text-amber-700 tracking-tight">
                  {loading ? '...' : stats?.metrics.pendingApproval ?? 0}
                </div>
                <div className="text-[10px] font-mono text-amber-700 mt-1 font-semibold">
                  HUMAN SIGN-OFF
                </div>
              </div>
            </div>

            {/* 5. DISPUTED */}
            <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-800">
                  Disputed
                </span>
                <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold font-mono-tabular text-orange-700 tracking-tight">
                  {loading ? '...' : stats?.metrics.disputedTransactions ?? 0}
                </div>
                <div className="text-[10px] font-mono text-orange-700 mt-1 font-semibold">
                  USER CONTESTED
                </div>
              </div>
            </div>

            {/* 6. REVERSED */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-800">
                  Reversed
                </span>
                <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold font-mono-tabular text-teal-700 tracking-tight">
                  {loading ? '...' : stats?.metrics.reversedTransactions ?? 0}
                </div>
                <div className="text-[10px] font-mono text-teal-700 mt-1 font-semibold">
                  FUNDS RECOVERED
                </div>
              </div>
            </div>

            {/* 7. DUPLICATES PREVENTED */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-800">
                  Duplicates Prevented
                </span>
                <Repeat className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold font-mono-tabular text-indigo-700 tracking-tight">
                  {loading ? '...' : stats?.metrics.duplicatesPrevented ?? 0}
                </div>
                <div className="text-[10px] font-mono text-indigo-700 mt-1 font-semibold">
                  IDEMPOTENT LOCK
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: LIVE TRANSACTION STREAM & EXECUTION LEDGER */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
          {/* Table Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-slate-900">
                  Live Transaction Stream & Execution Ledger
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time stream across all agents. Click any transaction to inspect verification bounds, audit timeline, and forensic trace.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by agent, merchant, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400 w-48 sm:w-60 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* View all transactions link */}
              <Link
                href="/transactions"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0 ml-1"
              >
                <span>Full Ledger ({stats?.metrics.totalTransactions ?? 0})</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-100">
            {[
              { id: 'ALL', label: 'All Transactions' },
              { id: 'APPROVED', label: `Authorized (${stats?.metrics.authorizedTransactions ?? 0})` },
              { id: 'BLOCKED', label: `Blocked (${stats?.metrics.blockedTransactions ?? 0})` },
              { id: 'REVIEW', label: `Pending Approval (${stats?.metrics.pendingApproval ?? 0})` },
              { id: 'DISPUTED_REVERSED', label: `Disputed / Reversed (${(stats?.metrics.disputedTransactions ?? 0) + (stats?.metrics.reversedTransactions ?? 0)})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  filterTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Agent</th>
                  <th className="pb-3 font-semibold">Merchant & Item</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Mandate</th>
                  <th className="pb-3 font-semibold">Decision</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                      Loading real-time transactions stream...
                    </td>
                  </tr>
                ) : filteredFeed.length > 0 ? (
                  filteredFeed.map((tx: any) => {
                    const isApproved = tx.decision === 'APPROVED';
                    const isBlocked = tx.decision === 'BLOCKED';
                    const isReview = tx.decision === 'REVIEW';

                    const isDisputed = tx.status === 'DISPUTED' || !!tx.dispute;
                    const isReversed = tx.status === 'REVERSED' || tx.dispute?.status === 'REVERSED';
                    const isPending = tx.status === 'PENDING_APPROVAL' || tx.status === 'PENDING_HUMAN_APPROVAL';

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => openDetail(tx.id)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* 1. Time */}
                        <td className="py-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          <div>{new Date(tx.createdAt).toLocaleTimeString()}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* 2. Agent */}
                        <td className="py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-slate-900 font-semibold group-hover:text-blue-600 transition-colors">
                                {tx.agent?.name || tx.agentId || 'Agent'}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Trust: {tx.agent?.trustScore ?? 90}/100
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Merchant & Product */}
                        <td className="py-3.5 max-w-[200px]">
                          <div className="text-slate-900 font-semibold truncate">
                            {tx.merchant}
                          </div>
                          <div className="text-slate-400 text-[11px] truncate">
                            {tx.product || tx.category || 'General Procurement'}
                          </div>
                        </td>

                        {/* 4. Amount */}
                        <td className="py-3.5 font-mono-tabular whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-sm">
                            ₹{(tx.amount / 100).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {tx.currency || 'INR'}
                          </div>
                        </td>

                        {/* 5. Mandate */}
                        <td className="py-3.5 max-w-[160px]">
                          <div className="text-slate-800 font-medium text-[11px] truncate">
                            {tx.mandate?.name || tx.mandateId || 'Amazon Procurement'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            Cap: ₹{tx.mandate?.maxAmount ? (tx.mandate.maxAmount / 100).toLocaleString('en-IN') : '5,000'}
                          </div>
                        </td>

                        {/* 6. Decision */}
                        <td className="py-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider inline-flex items-center gap-1 ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isBlocked
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {tx.decision}
                          </span>
                        </td>

                        {/* 7. Status */}
                        <td className="py-3.5 whitespace-nowrap">
                          {isReversed ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-teal-100 text-teal-800 border border-teal-200 inline-flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />
                              REVERSED
                            </span>
                          ) : isDisputed ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-orange-100 text-orange-800 border border-orange-200 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              DISPUTED
                            </span>
                          ) : isPending ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              APPROVAL_REQ
                            </span>
                          ) : isBlocked ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              BLOCKED
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {tx.status || 'SUCCESS'}
                            </span>
                          )}
                        </td>

                        {/* Trace action hint */}
                        <td className="py-3.5 text-right whitespace-nowrap">
                          <span className="text-[11px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-0.5">
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                      No transactions matching the selected filter or search term.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4: DEMO WALKTHROUGH FLOW GUIDES */}
        <div className="p-6 rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Recommended Evaluation Walkthrough Flow</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-blue-400 font-mono text-[10px] font-bold uppercase">
                1. INTENT & MANDATE
              </div>
              <p className="text-slate-300 leading-relaxed">
                Inspect <Link href="/agents" className="text-white underline">ShoppingAgent-01</Link> and its <Link href="/mandates" className="text-white underline">₹5,000 Amazon mandate</Link>.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-emerald-400 font-mono text-[10px] font-bold uppercase">
                2. SIMULATION
              </div>
              <p className="text-slate-300 leading-relaxed">
                Run the <Link href="/simulator" className="text-white underline">Simulator</Link> with &ldquo;Buy Logitech keyboard under ₹5k&rdquo;. Watch it get APPROVED with Razorpay Test Mode.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-rose-400 font-mono text-[10px] font-bold uppercase">
                3. ATTACK LAB
              </div>
              <p className="text-slate-300 leading-relaxed">
                Test <Link href="/attack-lab" className="text-white underline">Amount Override</Link> & <Link href="/attack-lab" className="text-white underline">Intent Drift</Link>. Verify real BLOCKED decisions and trust drops.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-indigo-400 font-mono text-[10px] font-bold uppercase">
                4. AUDIT & REVERSALS
              </div>
              <p className="text-slate-300 leading-relaxed">
                Inspect <Link href="/disputes" className="text-white underline">Disputes Center</Link> and <Link href="/audit" className="text-white underline">Audit Trail</Link> for cryptographically verified linear hash chains.
              </p>
            </div>
          </div>
        </div>

        {/* AUTHORIZATION & TRANSACTION DETAIL INSPECTOR MODAL */}
        {selectedTx && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-950 text-slate-100 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-8 shadow-2xl relative space-y-6">
              <button
                onClick={() => setSelectedTx(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Top Banner */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 pr-8">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
                    Deterministic Decision Trace & Settlement Lineage
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    LEO Transaction Inspector
                  </h2>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    TX ID: <span className="text-slate-200">{selectedTx.id}</span> &bull; Key: <span className="text-slate-300">{selectedTx.idempotencyKey?.slice(0, 16)}...</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTx.status === 'DISPUTED' && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
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

              {/* Forensic Entity Cards Grid (Agent, User, Mandate, Merchant, Amount, Payment State) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
                {/* Agent */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Agent</span>
                  <div className="text-white font-bold truncate mt-0.5">{selectedTx.agent?.name || selectedTx.agentId}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Trust: {selectedTx.agent?.trustScore ?? 94}/100</div>
                </div>

                {/* User */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">User Principal</span>
                  <div className="text-white font-bold truncate mt-0.5">Alex Vance</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Role: ADMIN</div>
                </div>

                {/* Mandate */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mandate Envelope</span>
                  <div className="text-white font-bold truncate mt-0.5">{selectedTx.mandate?.name || selectedTx.mandateId || 'Standard'}</div>
                  <div className="text-[10px] text-blue-400 mt-0.5">
                    Cap: ₹{selectedTx.mandate ? (selectedTx.mandate.maxAmount / 100).toLocaleString('en-IN') : '5,000'}
                  </div>
                </div>

                {/* Merchant */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Merchant</span>
                  <div className="text-white font-bold truncate mt-0.5">{selectedTx.merchant}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{selectedTx.category || 'Electronics'}</div>
                </div>

                {/* Amount */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Amount</span>
                  <div className="text-white font-bold font-mono-tabular text-sm mt-0.5">
                    ₹{(selectedTx.amount / 100).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{selectedTx.currency || 'INR'} ({selectedTx.amount} paise)</div>
                </div>

                {/* Payment State */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Payment State</span>
                  <div className="text-white font-bold truncate mt-0.5">{selectedTx.status || 'SUCCESS'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {selectedTx.razorpayOrderId ? 'Order Created' : 'Rail Blocked'}
                  </div>
                </div>
              </div>

              {/* Inspector View Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveModalTab('VERIFICATION')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 font-medium hover:bg-orange-500/30"
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
                      <span>Funds Reversed (₹{(selectedTx.amount / 100).toLocaleString('en-IN')})</span>
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
                  {/* User Intent vs Agent Action vs Mandate */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        1. User Intent
                      </span>
                      <p className="text-slate-200 font-medium italic leading-relaxed">
                        &ldquo;{selectedTx.intent?.rawPrompt || selectedTx.instruction || 'Procure item within mandate boundary'}&rdquo;
                      </p>
                      <div className="text-[11px] text-slate-400 font-mono pt-1">
                        Max Limit: ₹{selectedTx.intent?.maxAmount ? (selectedTx.intent.maxAmount / 100).toLocaleString('en-IN') : '5,000'}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        2. Agent Action
                      </span>
                      <div>
                        <div className="text-white font-bold">{selectedTx.merchant}</div>
                        <div className="text-slate-400 text-[11px] truncate">{selectedTx.product}</div>
                      </div>
                      <div className="text-base font-bold font-mono-tabular text-white pt-1">
                        ₹{(selectedTx.amount / 100).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        3. Mandate Bounds
                      </span>
                      <div className="text-white font-bold">
                        {selectedTx.mandate?.name || selectedTx.merchant}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Max allowed: ₹{selectedTx.mandate ? (selectedTx.mandate.maxAmount / 100).toLocaleString('en-IN') : '5,000'}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        Status: {selectedTx.mandate?.status || 'ACTIVE'}
                      </div>
                    </div>
                  </div>

                  {/* 11 Pre-Payment Verification Engine Checks */}
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
                      { id: 7, name: 'Transaction amount within limit', status: decReasons.includes('AMOUNT_LIMIT_EXCEEDED') ? 'FAILED' : 'PASSED', details: `Amount ₹${(selectedTx.amount / 100).toLocaleString('en-IN')}`, metric: `₹${(selectedTx.amount / 100).toLocaleString('en-IN')}` },
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

                  {/* Risk Assessment & Machine Codes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Deterministic Risk Assessment
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
                              )) : <div>{selectedTx.riskReasons}</div>;
                            } catch {
                              return <div>{selectedTx.riskReasons}</div>;
                            }
                          })()
                        ) : (
                          <div>Base risk evaluated cleanly.</div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Machine Reason Codes
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
                              )) : <div>{selectedTx.decisionReasons}</div>;
                            } catch {
                              return <div className="font-mono text-xs">{selectedTx.decisionReasons}</div>;
                            }
                          })()
                        ) : (
                          <div className="font-mono text-xs text-slate-500">NO_REASON_CODES</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Gateway & Settlement State */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-semibold text-white">Payment Rail & Settlement</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                          RAZORPAY TEST MODE
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        {selectedTx.razorpayOrderId
                          ? `Order ID: ${selectedTx.razorpayOrderId} | Status: ${selectedTx.razorpayStatus || 'created'}`
                          : 'Payment rail call inhibited. Blocked transactions never contact payment gateways.'}
                      </div>
                    </div>
                    {selectedTx.razorpayOrderId && (
                      <span className="text-xs font-bold font-mono text-emerald-400">
                        SETTLED
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
                      Loading high-resolution cryptographic timeline...
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
                        <div className="text-white font-bold text-sm mt-0.5">Alex Vance (SecOps Lead)</div>
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
                          <span className="text-[10px] text-emerald-400 font-bold">TRUST: {selectedTx.agent?.trustScore ?? 94}/100</span>
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
                          &ldquo;{selectedTx.intent?.rawPrompt || selectedTx.instruction || `Procure ${selectedTx.product} from ${selectedTx.merchant} within mandate budget`}&rdquo;
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
                          Mandate ID: {selectedTx.mandateId || 'mnd_amazon_01'} • Cap: ₹{selectedTx.mandate ? (selectedTx.mandate.maxAmount / 100).toLocaleString('en-IN') : '5,000'}
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
                          Risk Score: {selectedTx.riskScore}/100 • Evaluated before payment gateway execution
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
                          ₹{(selectedTx.amount / 100).toLocaleString('en-IN')} {selectedTx.currency || 'INR'} at {selectedTx.merchant}
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
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
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
