'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { fetchApi } from '@/lib/api';
import { AuditTimeline, TimelineStep } from '@/components/AuditTimeline';
import {
  Binary,
  ShieldCheck,
  ShieldAlert,
  Hash,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bot,
  FileCode2,
  Lock,
  ArrowRight,
  Layers,
  Sparkles,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';

interface AuditEventItem {
  id: string;
  sequenceNumber: number;
  eventType: string;
  actor: string;
  actorType?: string;
  actorId?: string;
  agentId?: string | null;
  userId?: string | null;
  transactionId?: string | null;
  mandateId?: string | null;
  action?: string;
  previousState?: string | null;
  newState?: string | null;
  reason?: string | null;
  metadata?: any;
  timestamp: string;
  eventData: string;
  previousHash: string;
  eventHash: string;
  agent?: { name: string };
}

interface AttributionData {
  transactionId: string;
  user: { id: string; name: string; role: string; email: string };
  agent: { id: string; name: string; trustScore: number; status: string };
  instruction: string;
  mandate?: {
    id: string;
    name: string;
    maxAmountInr: number;
    dailyLimitInr: number;
    status: string;
    allowedMerchants: string[];
  };
  validationChecks: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    requiresApproval: boolean;
    summary: string;
  };
  humanApproval?: {
    id: string;
    status: string;
    amountInr: number;
    reason: string;
    reviewedBy: string;
    reviewedAt: string;
  } | null;
  transaction: {
    id: string;
    idempotencyKey: string;
    amountInr: number;
    currency: string;
    merchant: string;
    product: string;
    status: string;
  };
  paymentResult: {
    decision: string;
    status: string;
    riskScore: number;
    razorpayOrderId?: string | null;
    razorpayStatus?: string | null;
    message: string;
  };
}

const EVENT_TYPE_OPTIONS = [
  'ALL',
  'PAYMENT_REQUESTED',
  'PAYMENT_VALIDATED',
  'PAYMENT_BLOCKED',
  'APPROVAL_REQUESTED',
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'PAYMENT_EXECUTED',
  'PAYMENT_FAILED',
  'PAYMENT_REVERSED',
  'DUPLICATE_PAYMENT_PREVENTED',
  'MANDATE_CREATED',
  'MANDATE_UPDATED',
  'AGENT_REGISTERED',
];

const ACTOR_TYPE_OPTIONS = ['ALL', 'USER', 'AGENT', 'SYSTEM', 'GATEWAY', 'SUPERVISOR'];

export default function AuditExplorerPage() {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [verification, setVerification] = useState<any | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Filters
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedActorType, setSelectedActorType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Attribution Chain State
  const [selectedAttributionTxId, setSelectedAttributionTxId] = useState<string>('tx-demo-001');
  const [attribution, setAttribution] = useState<AttributionData | null>(null);
  const [loadingAttribution, setLoadingAttribution] = useState<boolean>(false);

  // Timeline Drawer Modal
  const [timelineModalTxId, setTimelineModalTxId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<any | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState<boolean>(false);

  const loadAuditEvents = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedEventType !== 'ALL') params.append('eventType', selectedEventType);
    if (selectedActorType !== 'ALL') params.append('actorType', selectedActorType);

    fetchApi<AuditEventItem[]>(`/api/audit?${params.toString()}`)
      .then((data) => {
        setEvents(data);
        if (data.length > 0 && !expandedId) setExpandedId(data[0].id);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await fetchApi<any>('/api/audit/verify');
      setVerification(res);
    } catch (err: any) {
      alert('Verification error');
    } finally {
      setVerifying(false);
    }
  };

  const loadAttribution = (txId: string) => {
    setLoadingAttribution(true);
    setSelectedAttributionTxId(txId);
    fetchApi<AttributionData>(`/api/audit/attribution/${txId}`)
      .then((data) => {
        setAttribution(data);
        setLoadingAttribution(false);
      })
      .catch(() => {
        setLoadingAttribution(false);
      });
  };

  const openTimelineModal = (txId: string) => {
    setTimelineModalTxId(txId);
    setLoadingTimeline(true);
    fetchApi<any>(`/api/audit/timeline/${txId}`)
      .then((data) => {
        setTimelineData(data);
        setLoadingTimeline(false);
      })
      .catch(() => {
        setLoadingTimeline(false);
      });
  };

  useEffect(() => {
    loadAuditEvents();
    handleVerifyChain();
    loadAttribution('tx-demo-001');
  }, [selectedEventType, selectedActorType]);

  const copyToClipboard = (text: string, hashId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(hashId);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Client-side search filtering
  const filteredEvents = events.filter((ev) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.eventType.toLowerCase().includes(q) ||
      ev.actor.toLowerCase().includes(q) ||
      (ev.transactionId && ev.transactionId.toLowerCase().includes(q)) ||
      (ev.mandateId && ev.mandateId.toLowerCase().includes(q)) ||
      (ev.reason && ev.reason.toLowerCase().includes(q)) ||
      (ev.action && ev.action.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell>
      <Header
        title="Agent Attribution & Immutable Audit Ledger"
        subtitle="Every payment is traceable to User ➔ Agent ➔ Instruction ➔ Mandate ➔ Validation Checks ➔ Approval ➔ Transaction ➔ Result."
        badge="TAMPER-EVIDENT LEDGER"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* 1. 8-Node Attribution Chain Visualizer */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Layers className="w-4 h-4 text-indigo-400" />
                </span>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  8-Node Agent Attribution Lineage
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Every autonomous financial movement is bound to an authenticated human user, governing mandate, and deterministic checks.
              </p>
            </div>

            {/* Quick transaction selector to preview different lineages */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500">Inspect Transaction:</span>
              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                {['tx-demo-001', 'tx-demo-002', 'tx-demo-003'].map((txId) => (
                  <button
                    key={txId}
                    onClick={() => loadAttribution(txId)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      selectedAttributionTxId === txId
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {txId}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Attribution Flow Nodes */}
          {attribution && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                {/* Node 1: USER */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> 1. USER
                  </div>
                  <div className="text-slate-200 font-bold text-sm truncate">{attribution.user.name}</div>
                  <div className="text-[11px] text-slate-400">ID: {attribution.user.id} ({attribution.user.role})</div>
                  <div className="text-[10px] text-slate-500 truncate">{attribution.user.email}</div>
                </div>

                {/* Node 2: AGENT */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" /> 2. AGENT
                  </div>
                  <div className="text-slate-200 font-bold text-sm truncate">{attribution.agent.name}</div>
                  <div className="text-[11px] text-slate-400">ID: {attribution.agent.id}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">
                    Trust: {attribution.agent.trustScore}/100 · {attribution.agent.status}
                  </div>
                </div>

                {/* Node 3: INSTRUCTION */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> 3. AGENT INSTRUCTION
                  </div>
                  <div className="text-slate-200 font-medium text-xs italic line-clamp-2">
                    &ldquo;{attribution.instruction}&rdquo;
                  </div>
                  <div className="text-[10px] text-slate-500">Natural Language Intent</div>
                </div>

                {/* Node 4: MANDATE */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> 4. MANDATE
                  </div>
                  <div className="text-slate-200 font-bold text-xs truncate">
                    {attribution.mandate?.name || 'mnd_amazon_01'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Ceiling: ₹{attribution.mandate?.maxAmountInr?.toLocaleString()} / tx
                  </div>
                  <div className="text-[10px] text-emerald-400">Status: {attribution.mandate?.status || 'ACTIVE'}</div>
                </div>

                {/* Node 5: VALIDATION CHECKS */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 5. VALIDATION CHECKS
                  </div>
                  <div className="text-slate-200 font-bold text-xs">
                    {attribution.validationChecks.passedChecks}/{attribution.validationChecks.totalChecks} Checks Passed
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {attribution.validationChecks.summary}
                  </div>
                  <div className="text-[10px] text-slate-500">11 Pre-Payment Bounds</div>
                </div>

                {/* Node 6: HUMAN APPROVAL */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-pink-400 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> 6. HUMAN APPROVAL
                  </div>
                  <div className="text-slate-200 font-bold text-xs">
                    {attribution.humanApproval ? (
                      <span className="text-amber-400">SUPERVISOR ESCALATION</span>
                    ) : (
                      <span className="text-slate-400">NOT REQUIRED (Within Limits)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {attribution.humanApproval ? attribution.humanApproval.reason : 'Auto-authorized'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {attribution.humanApproval ? `Status: ${attribution.humanApproval.status}` : 'Policy satisfied'}
                  </div>
                </div>

                {/* Node 7: PAYMENT TRANSACTION */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" /> 7. TRANSACTION
                  </div>
                  <div className="text-white font-bold text-sm">
                    ₹{attribution.transaction.amountInr.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {attribution.transaction.merchant} · {attribution.transaction.product}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Key: {attribution.transaction.idempotencyKey.slice(0, 16)}...
                  </div>
                </div>

                {/* Node 8: PAYMENT RESULT */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> 8. PAYMENT RESULT
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        attribution.paymentResult.decision === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : attribution.paymentResult.decision === 'BLOCKED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {attribution.paymentResult.decision}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Risk: {attribution.paymentResult.riskScore}/100
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 truncate">
                    {attribution.paymentResult.razorpayOrderId ? (
                      <span className="text-violet-400 font-semibold">{attribution.paymentResult.razorpayOrderId}</span>
                    ) : (
                      <span className="text-slate-500 italic">Rail Inactive (Blocked)</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {attribution.paymentResult.message}
                  </div>
                </div>
              </div>

              {/* View Chronological Timeline Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => openTimelineModal(attribution.transactionId)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>View Full Chronological Audit Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Cryptographic Integrity Status Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  SHA-256 Cryptographic Chain Status
                </h3>
                {verification?.isValid && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    CHAIN INTACT ({events.length} BLOCKS)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Linear hash chaining ensures zero tampering: EventHash = SHA256(Seq + PreviousHash + Timestamp + Payload).
                Mathematical proof of integrity across all agent proposals, LEO authorizations, and settlement rails.
              </p>
            </div>
          </div>

          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>Verify Hash Chain ({events.length} Events)</span>
          </button>
        </div>

        {/* 3. Event Filter & Search Bar */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Audit Event Filters & Search
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Showing {filteredEvents.length} of {events.length} immutable events
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transaction, actor, action, or reason..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none transition font-sans"
              />
            </div>

            {/* Event Type Filter */}
            <div>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs outline-none font-mono"
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    Event: {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor Type Filter */}
            <div>
              <select
                value={selectedActorType}
                onChange={(e) => setSelectedActorType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs outline-none font-mono"
              >
                {ACTOR_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    Actor: {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. Immutable Event Log Table */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Binary className="w-4 h-4 text-indigo-400" />
              Immutable Cryptographic Event Stream
            </h3>
            <span className="text-xs font-mono text-slate-500">
              SHA-256 SEQUENTIAL CHAIN
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {loading ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs animate-pulse">
                Loading cryptographic audit blocks...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                No audit events match filter criteria.
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const isExpanded = expandedId === ev.id;
                let parsed: any = {};
                try {
                  parsed = JSON.parse(ev.eventData);
                } catch {
                  parsed = {};
                }

                return (
                  <div key={ev.id} className="p-4 transition hover:bg-slate-800/40">
                    {/* Top line preview */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          #{ev.sequenceNumber}
                        </span>

                        <span className="text-xs font-bold font-mono text-white">
                          {ev.eventType}
                        </span>

                        <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {ev.actorType || 'SYSTEM'}: {ev.actor}
                        </span>

                        {ev.transactionId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTimelineModal(ev.transactionId!);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded transition"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Timeline</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                        <span className="truncate max-w-[200px] text-slate-500">
                          {ev.reason || parsed.reason || 'Event verified'}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded 14-Field Detail Card */}
                    {isExpanded && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-4 animate-in fade-in duration-150">
                        {/* 14 Attributes Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">event_id</span>
                            <span className="text-slate-200 truncate block">{ev.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">timestamp</span>
                            <span className="text-slate-200 truncate block">{ev.timestamp}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">actor_type</span>
                            <span className="text-indigo-400 font-bold block">{ev.actorType || 'SYSTEM'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">actor_id</span>
                            <span className="text-slate-200 truncate block">{ev.actorId || ev.actor}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">agent_id</span>
                            <span className="text-slate-200 truncate block">{ev.agentId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">user_id</span>
                            <span className="text-slate-200 truncate block">{ev.userId || 'usr_demo_01'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">transaction_id</span>
                            <span className="text-slate-200 truncate block">{ev.transactionId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">mandate_id</span>
                            <span className="text-amber-400 truncate block">{ev.mandateId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">action</span>
                            <span className="text-slate-200 truncate block">{ev.action || ev.eventType}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">previous_state</span>
                            <span className="text-slate-400 truncate block">{ev.previousState || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">new_state</span>
                            <span className="text-emerald-400 font-semibold truncate block">{ev.newState || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">reason</span>
                            <span className="text-slate-300 truncate block">{ev.reason || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Metadata JSON */}
                        <div className="pt-2 border-t border-slate-900">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                            Metadata Payload:
                          </span>
                          <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-300 text-[10px] overflow-x-auto">
                            {JSON.stringify(ev.metadata || parsed, null, 2)}
                          </pre>
                        </div>

                        {/* Cryptographic Hashes Lineage */}
                        <div className="pt-2 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <span className="text-slate-500 block mb-0.5">Previous Block Hash:</span>
                            <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900 text-slate-400">
                              <span className="truncate font-mono">{ev.previousHash}</span>
                              <button
                                onClick={() => copyToClipboard(ev.previousHash, `prev_${ev.id}`)}
                                className="text-slate-500 hover:text-white"
                              >
                                {copiedHash === `prev_${ev.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-500 block mb-0.5">Current Event Hash (SHA-256):</span>
                            <div className="flex items-center gap-2 p-1.5 rounded bg-slate-900 text-emerald-400">
                              <span className="truncate font-mono">{ev.eventHash}</span>
                              <button
                                onClick={() => copyToClipboard(ev.eventHash, `curr_${ev.id}`)}
                                className="text-slate-500 hover:text-white"
                              >
                                {copiedHash === `curr_${ev.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 5. Audit Timeline Modal / Drawer */}
        {timelineModalTxId && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative space-y-6">
              <button
                onClick={() => setTimelineModalTxId(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>

              <div>
                <div className="text-[10px] font-mono text-indigo-400 uppercase font-bold tracking-wider">
                  Transaction Audit Lineage
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  High-Resolution Audit Timeline
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological event progression from raw agent procurement request to final settlement rail.
                </p>
              </div>

              {loadingTimeline ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs animate-pulse">
                  Loading timeline events...
                </div>
              ) : timelineData?.timeline ? (
                <AuditTimeline
                  transactionId={timelineData.transactionId}
                  timeline={timelineData.timeline}
                  decision={timelineData.decision}
                  amountInr={timelineData.amountInr}
                  merchant={timelineData.merchant}
                />
              ) : (
                <div className="py-8 text-center text-slate-400 font-mono text-xs">
                  Timeline could not be loaded for transaction {timelineModalTxId}.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
