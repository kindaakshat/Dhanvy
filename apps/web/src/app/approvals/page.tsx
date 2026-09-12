'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { fetchApi } from '@/lib/api';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Bot,
  User,
  Store,
  Tag,
  ArrowRight,
  History,
  Sparkles,
  RefreshCw,
  CreditCard,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  Zap,
} from 'lucide-react';

interface EnrichedApproval {
  id: string;
  transactionId: string;
  agentId: string;
  agent: {
    id: string;
    name: string;
    trustScore: number;
    status: string;
    model: string;
    provider: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  merchant: string;
  merchantId: string;
  product: string;
  category: string;
  amount: number;
  amountInr: number;
  currency: string;
  status: string;
  paymentStatus: string;
  mandate: {
    id: string;
    name: string;
    maxAmountInr: number;
    dailyLimitInr: number;
    spentTodayInr: number;
    approvalThresholdInr: number;
  };
  triggerRule: string;
  reason: string;
  whyApprovalRequired: {
    rule: string;
    headline: string;
    description: string;
  };
  riskScore: number;
  riskIndicators: Array<{
    name: string;
    status: 'SAFE' | 'WARNING' | 'ALERT';
    detail: string;
  }>;
  previousAgentActivity: {
    totalTransactions: number;
    approvalRate: number;
    totalSpentInr: number;
    recentTransactions: Array<{
      id: string;
      merchant: string;
      product: string;
      amountInr: number;
      decision: string;
      createdAt: string;
    }>;
  };
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  decisionReason?: string;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<EnrichedApproval[]>([]);
  const [historyList, setHistoryList] = useState<EnrichedApproval[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Approval modal state
  const [approveModalItem, setApproveModalItem] = useState<EnrichedApproval | null>(null);
  const [approverName, setApproverName] = useState('Demo User (Human SecOps)');
  const [approveNotes, setApproveNotes] = useState('Verified requirement and invoice bounds with Treasury lead.');
  const [approvingStep, setApprovingStep] = useState<number>(0); // 0: input, 1: steppers, 2: complete
  const [approveResult, setApproveResult] = useState<any>(null);

  // Rejection modal state
  const [rejectModalItem, setRejectModalItem] = useState<EnrichedApproval | null>(null);
  const [rejectReason, setRejectReason] = useState('Policy violation: unverified merchant or unauthorized category');
  const [customRejectInput, setCustomRejectInput] = useState('');
  const [rejectResult, setRejectResult] = useState<any>(null);

  // Expanded activity accordion tracker
  const [expandedActivity, setExpandedActivity] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, historyRes] = await Promise.all([
        fetchApi<EnrichedApproval[]>('/api/approvals'),
        fetchApi<EnrichedApproval[]>('/api/approvals/history').catch(() => []),
      ]);
      setApprovals(pendingRes || []);
      setHistoryList(historyRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerSimulateScenario = async (scenarioKey: string) => {
    setSimulating(true);
    try {
      await fetchApi('/api/approvals/simulate', {
        method: 'POST',
        body: JSON.stringify({ scenarioKey }),
      });
      await loadData();
      setActiveTab('pending');
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const executeApprove = async () => {
    if (!approveModalItem) return;
    setActionLoading(approveModalItem.id);
    setApprovingStep(1);

    // Simulate visual progression of the 4-step state transition
    // PENDING_HUMAN_APPROVAL -> AUTHORIZED -> PROCESSING -> SUCCESS
    try {
      const res = await fetchApi<any>(`/api/approvals/${approveModalItem.id}/decide`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'APPROVE',
          reviewedBy: approverName,
          reason: approveNotes,
        }),
      });
      setApproveResult(res);
      setApprovingStep(2);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Approval execution failed');
      setApprovingStep(0);
    } finally {
      setActionLoading(null);
    }
  };

  const executeReject = async () => {
    if (!rejectModalItem) return;
    const finalReason = customRejectInput.trim() || rejectReason;
    setActionLoading(rejectModalItem.id);

    try {
      const res = await fetchApi<any>(`/api/approvals/${rejectModalItem.id}/decide`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'REJECT',
          reviewedBy: approverName,
          reason: finalReason,
        }),
      });
      setRejectResult(res);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Rejection execution failed');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleActivity = (id: string) => {
    setExpandedActivity((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AppShell>
      <Header
        title="Human-in-the-Loop Approval Queue"
        subtitle="Mandate-enforced supervisory checkpoint. Transactions exceeding policy boundaries pause safely in PENDING_HUMAN_APPROVAL."
        badge="SECURITY GOVERNANCE"
      />

      <main className="p-6 sm:p-8 space-y-8 max-w-7xl">
        {/* KPI Counter Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Pending Human Review</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono-tabular text-amber-600">
              {approvals.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Requiring supervisor sign-off</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Decided Interventions</div>
            <div className="mt-2 text-2xl font-bold font-mono-tabular text-slate-900">
              {historyList.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Audit-logged historical actions</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Autonomous Settlement Rate</div>
            <div className="mt-2 text-2xl font-bold font-mono-tabular text-emerald-600">
              98.4%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Pass without supervisor intervention</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Zero-Trust Rail Guard</div>
            <div className="mt-2 text-2xl font-bold font-mono-tabular text-indigo-600">
              100%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">0 unreviewed disbursements allowed</div>
          </div>
        </div>

        {/* Live Hackathon Demo Scenarios Bar */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-violet-500/10 border border-amber-200/80 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500 text-white">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  ⚡ Live Hackathon Demo Scenarios — Inject Pending Approval Request
                </h3>
                <p className="text-[11px] text-slate-600">
                  Instantly trigger realistic autonomous payment requests paused at{' '}
                  <code className="px-1 py-0.5 rounded bg-amber-100 font-mono text-amber-900 font-semibold">
                    PENDING_HUMAN_APPROVAL
                  </code>
                </p>
              </div>
            </div>
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => triggerSimulateScenario('HIGH_VALUE')}
              disabled={simulating}
              className="p-2.5 rounded-xl bg-white/90 hover:bg-white border border-amber-200 hover:border-amber-400 text-left transition-all shadow-xs group"
            >
              <div className="text-[11px] font-bold text-amber-900 group-hover:text-amber-700 flex items-center justify-between">
                <span>1. Large Purchase</span>
                <span className="text-[10px] text-amber-600 font-mono">₹7,499</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Exceeds mandate approval threshold (&gt;₹5k)
              </div>
            </button>

            <button
              onClick={() => triggerSimulateScenario('NEW_MERCHANT')}
              disabled={simulating}
              className="p-2.5 rounded-xl bg-white/90 hover:bg-white border border-indigo-200 hover:border-indigo-400 text-left transition-all shadow-xs group"
            >
              <div className="text-[11px] font-bold text-indigo-900 group-hover:text-indigo-700 flex items-center justify-between">
                <span>2. New Merchant</span>
                <span className="text-[10px] text-indigo-600 font-mono">₹3,200</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                First transaction with Modal Labs
              </div>
            </button>

            <button
              onClick={() => triggerSimulateScenario('LOW_TRUST')}
              disabled={simulating}
              className="p-2.5 rounded-xl bg-white/90 hover:bg-white border border-rose-200 hover:border-rose-400 text-left transition-all shadow-xs group"
            >
              <div className="text-[11px] font-bold text-rose-900 group-hover:text-rose-700 flex items-center justify-between">
                <span>3. Low Agent Trust</span>
                <span className="text-[10px] text-rose-600 font-mono">64/100</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Agent trust score degraded below 75
              </div>
            </button>

            <button
              onClick={() => triggerSimulateScenario('CATEGORY_ANOMALY')}
              disabled={simulating}
              className="p-2.5 rounded-xl bg-white/90 hover:bg-white border border-violet-200 hover:border-violet-400 text-left transition-all shadow-xs group"
            >
              <div className="text-[11px] font-bold text-violet-900 group-hover:text-violet-700 flex items-center justify-between">
                <span>4. Category Anomaly</span>
                <span className="text-[10px] text-violet-600 font-mono">Cloud Server</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Procurement agent buying raw infrastructure
              </div>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span>Pending Approvals</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800 font-bold">
              {approvals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Decided History</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700">
              {historyList.length}
            </span>
          </button>
        </div>

        {/* TAB 1: PENDING APPROVALS */}
        {activeTab === 'pending' && (
          <div>
            {loading ? (
              <div className="py-20 text-center text-slate-400 text-xs font-mono">
                Loading supervisor review queue...
              </div>
            ) : approvals.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">Review Queue Clear</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  All autonomous agent transactions are within mandate boundaries or deterministically blocked.
                  Use the <strong className="text-slate-700">Live Hackathon Demo Scenarios</strong> above to inject
                  pending test transactions.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => triggerSimulateScenario('HIGH_VALUE')}
                    className="px-4 py-2 rounded-xl bg-slate-950 text-white font-semibold text-xs hover:bg-slate-800 transition-all inline-flex items-center gap-2 shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Spawn High-Value (&gt;₹5k) Demo Transaction</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {approvals.map((item) => (
                  <div
                    key={item.id}
                    className="p-6 rounded-2xl bg-white border border-amber-300/80 shadow-xs hover:shadow-md transition-all space-y-6"
                  >
                    {/* Top Row: State indicator, Agent identity, User, Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-mono font-bold tracking-wide uppercase flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          <span>STATUS: PENDING_HUMAN_APPROVAL</span>
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ID: {item.transactionId.slice(0, 14)}...
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Column: Transaction & Entity Details */}
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Agent:</span>
                            </span>
                            <div className="text-right">
                              <div className="font-bold text-slate-900">{item.agent.name}</div>
                              <div className="text-[10px] text-indigo-600">
                                Trust: {item.agent.trustScore}/100 • {item.agent.model.slice(0, 20)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-600" />
                              <span>Owner / User:</span>
                            </span>
                            <div className="text-right">
                              <div className="font-bold text-slate-900">{item.user.name}</div>
                              <div className="text-[10px] text-slate-400">{item.user.role}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <Store className="w-3.5 h-3.5 text-slate-600" />
                              <span>Merchant:</span>
                            </span>
                            <div className="font-bold text-slate-900">{item.merchant}</div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-slate-600" />
                              <span>Product & Scope:</span>
                            </span>
                            <div className="text-right max-w-[200px] truncate text-slate-900 font-medium">
                              {item.product}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-slate-700 font-semibold">Proposed Amount:</span>
                            <span className="text-lg font-bold text-slate-950 font-mono-tabular">
                              ₹{item.amountInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Mandate Policy Context */}
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Governing Mandate
                          </div>
                          <div className="font-bold text-slate-900">{item.mandate.name}</div>
                          <div className="text-[11px] text-slate-600 flex items-center justify-between">
                            <span>Approval Threshold:</span>
                            <span className="font-mono font-semibold">
                              ₹{item.mandate.approvalThresholdInr.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center justify-between">
                            <span>Max Limit:</span>
                            <span className="font-mono">
                              ₹{item.mandate.maxAmountInr.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Column: Why Approval is Required & Risk Indicators */}
                      <div className="space-y-4 lg:col-span-2">
                        {/* High-visibility trigger alert card */}
                        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 space-y-2">
                          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>ESCALATION TRIGGER: {item.whyApprovalRequired.rule}</span>
                          </div>
                          <p className="text-xs text-amber-950 font-medium leading-relaxed">
                            {item.reason}
                          </p>
                        </div>

                        {/* Risk Indicators & Breakdown */}
                        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Risk Assessment Score</span>
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800">
                              {item.riskScore} / 100
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            {item.riskIndicators.map((ind, i) => (
                              <div
                                key={i}
                                className={`p-2.5 rounded-lg border ${
                                  ind.status === 'ALERT'
                                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                                    : ind.status === 'WARNING'
                                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                }`}
                              >
                                <div className="font-bold">{ind.name}</div>
                                <div className="text-[10px] opacity-80 mt-0.5">{ind.detail}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Previous Agent Activity Section */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">Previous Agent Activity</span>
                              <span className="text-[11px] text-slate-500">
                                ({item.previousAgentActivity.totalTransactions} transactions •{' '}
                                {item.previousAgentActivity.approvalRate}% success rate)
                              </span>
                            </div>
                            <button
                              onClick={() => toggleActivity(item.id)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                            >
                              <span>{expandedActivity[item.id] ? 'Hide' : 'View History'}</span>
                              {expandedActivity[item.id] ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {expandedActivity[item.id] && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-200">
                              {item.previousAgentActivity.recentTransactions.map((pt, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-[11px]"
                                >
                                  <div>
                                    <span className="font-semibold text-slate-800">{pt.merchant}</span>
                                    <span className="text-slate-400 mx-1.5">•</span>
                                    <span className="text-slate-600">{pt.product}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold text-slate-900">
                                      ₹{pt.amountInr.toLocaleString()}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        pt.decision === 'APPROVED'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {pt.decision}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <button
                            onClick={() => {
                              setApproveModalItem(item);
                              setApprovingStep(0);
                              setApproveResult(null);
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all group"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span>APPROVE PAYMENT</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectModalItem(item);
                              setRejectResult(null);
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                          >
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>REJECT PAYMENT</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DECIDED HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyList.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-xs text-slate-500">
                No supervisor actions recorded yet.
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs divide-y divide-slate-100">
                {historyList.map((hist) => (
                  <div key={hist.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            hist.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {hist.status === 'APPROVED' ? '✓ APPROVED' : '✗ REJECTED'}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {hist.merchant} — {hist.product}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        ₹{hist.amountInr.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-4">
                      <span>
                        Supervisor: <strong className="text-slate-800">{hist.reviewedBy || 'Demo User'}</strong>
                      </span>
                      <span>
                        Time: {hist.reviewedAt ? new Date(hist.reviewedAt).toLocaleString() : 'Just now'}
                      </span>
                      <span>
                        Reason:{' '}
                        <span className="italic text-slate-700">
                          {hist.decisionReason || hist.reason || 'Decision recorded'}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* APPROVE PAYMENT MODAL */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Authorize Autonomous Payment</h3>
              </div>
              <button
                onClick={() => setApproveModalItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {approvingStep === 0 && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-slate-500">Transaction:</div>
                  <div className="font-bold text-slate-900 text-sm">
                    ₹{approveModalItem.amountInr.toLocaleString()} to {approveModalItem.merchant}
                  </div>
                  <div className="text-[11px] text-slate-600">{approveModalItem.product}</div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Approver Identity (Sign-off Actor):</label>
                  <input
                    type="text"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Supervisor Rationale / Verification Notes:</label>
                  <textarea
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-900 space-y-1">
                  <div className="font-bold">Execution State Progression:</div>
                  <div className="font-mono text-[10px] text-indigo-800">
                    PENDING_HUMAN_APPROVAL → AUTHORIZED → PROCESSING → SUCCESS
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setApproveModalItem(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeApprove}
                    disabled={actionLoading !== null}
                    className="flex-1 py-2.5 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Confirm & Settle</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {approvingStep === 1 && (
              <div className="py-8 text-center space-y-4">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <div className="font-bold text-slate-900 text-sm">Progressing State Machine...</div>
                <div className="text-xs font-mono text-slate-500">
                  PENDING_HUMAN_APPROVAL → AUTHORIZED → PROCESSING → SUCCESS
                </div>
              </div>
            )}

            {approvingStep === 2 && approveResult && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-emerald-950">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                    <Check className="w-4 h-4" />
                    <span>Payment Authorized and Settled!</span>
                  </div>
                  <p className="text-xs leading-relaxed">{approveResult.message}</p>
                </div>

                {approveResult.razorpayOrderId && (
                  <div className="p-3.5 rounded-xl bg-slate-900 text-white font-mono space-y-1">
                    <div className="text-[10px] text-slate-400">Razorpay Test Mode Order ID:</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {approveResult.razorpayOrderId}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-700">Audit State Transition History:</div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-600 space-y-1 max-h-32 overflow-y-auto">
                    {approveResult.stateHistory?.map((h: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="font-bold text-indigo-600">{h.state}</span>
                        <span>{h.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setApproveModalItem(null);
                    setApproveResult(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-800 transition-all shadow-xs"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REJECT PAYMENT MODAL */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Reject Autonomous Payment</h3>
              </div>
              <button
                onClick={() => setRejectModalItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {!rejectResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1 text-rose-950">
                  <div className="text-[11px] text-rose-700 font-semibold">Payment to Reject:</div>
                  <div className="font-bold text-sm">
                    ₹{rejectModalItem.amountInr.toLocaleString()} to {rejectModalItem.merchant}
                  </div>
                  <div className="text-[11px] opacity-90">{rejectModalItem.product}</div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Quick Pre-set Rejection Reasons:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Unrecognized merchant domain',
                      'Amount disproportionate to task',
                      'Suspected duplicate instruction',
                      'Category violates enterprise policy',
                    ].map((reasonOption, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRejectReason(reasonOption);
                          setCustomRejectInput('');
                        }}
                        className={`p-2 rounded-lg border text-left text-[11px] transition-all ${
                          rejectReason === reasonOption && !customRejectInput
                            ? 'bg-rose-100 border-rose-300 font-bold text-rose-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {reasonOption}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Or Custom Rejection Rationale:</label>
                  <input
                    type="text"
                    value={customRejectInput}
                    onChange={(e) => setCustomRejectInput(e.target.value)}
                    placeholder="Enter specific audit reason..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 text-[11px] text-rose-900">
                  <div className="font-bold">State Transition:</div>
                  <div className="font-mono text-[10px] text-rose-800">
                    PENDING_HUMAN_APPROVAL → REJECTED
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setRejectModalItem(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeReject}
                    disabled={actionLoading !== null}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Rejection</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-rose-950">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                    <XCircle className="w-4 h-4" />
                    <span>Transaction Successfully Rejected</span>
                  </div>
                  <p className="text-xs leading-relaxed">{rejectResult.message}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1 text-slate-700">
                  <div>Status: <strong className="text-rose-600">REJECTED</strong></div>
                  <div>Reviewed By: {rejectResult.reviewedBy}</div>
                  <div>Reason: {rejectResult.reason}</div>
                </div>

                <button
                  onClick={() => {
                    setRejectModalItem(null);
                    setRejectResult(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-800 transition-all shadow-xs"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
