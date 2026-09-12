'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { fetchApi } from '@/lib/api';
import {
  Bot,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Lock,
  PauseCircle,
  PlayCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Zap,
  Sliders,
  Check,
  Info,
  ExternalLink,
  Plus,
  Ban,
  Key,
  User,
  Calendar,
  CreditCard,
  Shield,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface TrustSignal {
  id: string;
  name: string;
  type: 'POSITIVE' | 'NEGATIVE';
  impact: string;
  detail: string;
  scoreContribution: number;
}

interface ScoreHistoryItem {
  id: string;
  timestamp: string;
  previousScore: number;
  newScore: number;
  scoreDelta: number;
  reason: string;
  explanation: string;
  transactionId?: string | null;
}

interface TrustReport {
  agentId: string;
  agentName: string;
  trustScore: number;
  trustTier: 'TRUSTED' | 'NORMAL' | 'RESTRICTED' | 'HIGH RISK';
  tierInfo: {
    tier: string;
    label: string;
    minScore: number;
    maxScore: number;
    badgeClass: string;
    controlsDescription: string;
    isAutonomousAllowed: boolean;
    requiresHigherValueApproval: boolean;
    higherValueThresholdPaise: number;
  };
  currentRestrictions: string;
  positiveSignals: TrustSignal[];
  negativeSignals: TrustSignal[];
  metrics: {
    totalTransactions: number;
    authorizedTransactions: number;
    blockedTransactions: number;
    disputedTransactions: number;
    reversedTransactions: number;
    duplicateAttempts: number;
    mandateViolations: number;
    humanRejections: number;
    humanRejectionRate: number;
    disputeRate: number;
    mandateViolationRate: number;
  };
  scoreHistory: ScoreHistoryItem[];
}

const AVAILABLE_PERMISSIONS = [
  { id: 'PURCHASE_ELECTRONICS', label: 'Purchase Electronics & IT Hardware', desc: 'Laptops, monitors, keyboards, and cables' },
  { id: 'PURCHASE_OFFICE_SUPPLIES', label: 'Purchase Office Supplies', desc: 'Stationery, furniture, and desk utilities' },
  { id: 'VIEW_PRODUCTS', label: 'View Products & Catalogs', desc: 'Inspect product metadata and availability' },
  { id: 'CREATE_PAYMENT_ORDER', label: 'Create Payment Orders', desc: 'Generate settlement orders on merchant portals' },
  { id: 'USE_RAZORPAY', label: 'Use Razorpay Payment Gateway', desc: 'Execute live settlement in Razorpay Test Mode' },
  { id: 'USE_SUBSCRIPTIONS', label: 'Manage Recurring Subscriptions', desc: 'Automate periodic billing licenses' },
  { id: 'TRANSFER_FUNDS', label: 'Transfer Direct Funds', desc: 'High risk: direct account fund movement' },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [trustReport, setTrustReport] = useState<TrustReport | null>(null);
  const [agentPayments, setAgentPayments] = useState<any[]>([]);
  const [agentMandates, setAgentMandates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingMandates, setLoadingMandates] = useState(false);
  const [simulatingEvent, setSimulatingEvent] = useState<string | null>(null);
  const [simulationSuccess, setSimulationSuccess] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'TRUST' | 'PAYMENTS' | 'MANDATES' | 'IDENTITY'>('TRUST');
  const [activeTrustTab, setActiveTrustTab] = useState<'SIGNALS' | 'HISTORY' | 'METRICS'>('SIGNALS');

  // Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regDesc, setRegDesc] = useState('');
  const [regOwner, setRegOwner] = useState('usr_demo_01');
  const [regPermissions, setRegPermissions] = useState<string[]>([
    'PURCHASE_ELECTRONICS',
    'VIEW_PRODUCTS',
    'CREATE_PAYMENT_ORDER',
    'USE_RAZORPAY',
  ]);
  const [isRegistering, setIsRegistering] = useState(false);

  // Revoke Modal State
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const loadAgents = (selectId?: string) => {
    setLoading(true);
    fetchApi<any[]>('/api/agents')
      .then((data) => {
        setAgents(data);
        const target = selectId
          ? data.find((a) => a.id === selectId || a.agent_id === selectId)
          : selectedAgent
          ? data.find((a) => a.id === selectedAgent.id || a.agent_id === selectedAgent.id) || data[0]
          : data[0];

        if (target) {
          setSelectedAgent(target);
          loadTrustReport(target.id || target.agent_id);
          loadAgentPayments(target.id || target.agent_id);
          loadAgentMandates(target.id || target.agent_id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const loadTrustReport = async (agentId: string) => {
    setLoadingReport(true);
    try {
      const report = await fetchApi<TrustReport>(`/api/agents/${agentId}/trust`);
      setTrustReport(report);
    } catch (err) {
      console.error('Failed to load trust report:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const loadAgentPayments = async (agentId: string) => {
    setLoadingPayments(true);
    try {
      const payments = await fetchApi<any[]>(`/api/agents/${agentId}/payments`);
      setAgentPayments(payments || []);
    } catch (err) {
      console.error('Failed to load agent payments:', err);
      setAgentPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadAgentMandates = async (agentId: string) => {
    setLoadingMandates(true);
    try {
      const mandates = await fetchApi<any[]>(`/api/agents/${agentId}/mandates`);
      setAgentMandates(mandates || []);
    } catch (err) {
      console.error('Failed to load agent mandates:', err);
      setAgentMandates([]);
    } finally {
      setLoadingMandates(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleSelectAgent = (ag: any) => {
    setSelectedAgent(ag);
    const agentId = ag.id || ag.agent_id;
    loadTrustReport(agentId);
    loadAgentPayments(agentId);
    loadAgentMandates(agentId);
  };

  const handleToggleStatus = async (agent: any) => {
    if (agent.status === 'REVOKED') return;
    const newStatus = agent.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetchApi<any>(`/api/agents/${agent.id || agent.agent_id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setSimulationSuccess(`Agent ${res.name || res.agent_name} transitioned to ${newStatus}`);
      setTimeout(() => setSimulationSuccess(null), 4000);
      loadAgents(agent.id || agent.agent_id);
    } catch (err: any) {
      alert(err.message || 'Failed to update agent status');
    }
  };

  const handleConfirmRevoke = async () => {
    if (!selectedAgent) return;
    setIsRevoking(true);
    try {
      const res = await fetchApi<any>(`/api/agents/${selectedAgent.id || selectedAgent.agent_id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'REVOKED',
          reason: 'Permanent cryptographic decommission by supervisor',
        }),
      });
      setIsRevokeModalOpen(false);
      setSimulationSuccess(`Agent ${res.name || res.agent_name} identity has been PERMANENTLY REVOKED.`);
      setTimeout(() => setSimulationSuccess(null), 5000);
      loadAgents(selectedAgent.id || selectedAgent.agent_id);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke agent');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      alert('Please enter an agent name.');
      return;
    }

    setIsRegistering(true);
    try {
      const newAgent = await fetchApi<any>('/api/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: regName.trim(),
          description: regDesc.trim() || 'Autonomous procurement agent',
          ownerId: regOwner.trim() || 'usr_demo_01',
          permissions: regPermissions,
          status: 'ACTIVE',
        }),
      });

      setIsRegisterModalOpen(false);
      setRegName('');
      setRegDesc('');
      setSimulationSuccess(`Successfully registered new agent: ${newAgent.name || newAgent.agent_name}!`);
      setTimeout(() => setSimulationSuccess(null), 5000);
      loadAgents(newAgent.id || newAgent.agent_id);
    } catch (err: any) {
      alert(err.message || 'Failed to register agent');
    } finally {
      setIsRegistering(false);
    }
  };

  const togglePermission = (permId: string) => {
    if (regPermissions.includes(permId)) {
      setRegPermissions(regPermissions.filter((p) => p !== permId));
    } else {
      setRegPermissions([...regPermissions, permId]);
    }
  };

  const handleSimulate = async (reason: string, details: string) => {
    if (!selectedAgent) return;
    setSimulatingEvent(reason);
    try {
      const res = await fetchApi<any>(`/api/agents/${selectedAgent.id || selectedAgent.agent_id}/trust/simulate`, {
        method: 'POST',
        body: JSON.stringify({ reason, details }),
      });

      if (res.report) {
        setTrustReport(res.report);
      }
      setSimulationSuccess(`Trust score updated! Reason: ${details}`);
      setTimeout(() => setSimulationSuccess(null), 4000);
      loadAgents(selectedAgent.id || selectedAgent.agent_id);
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setSimulatingEvent(null);
    }
  };

  // Tier counts
  const trustedCount = agents.filter((a) => (a.trustScore ?? a.trust_score ?? 85) >= 90).length;
  const normalCount = agents.filter(
    (a) => (a.trustScore ?? a.trust_score ?? 85) >= 70 && (a.trustScore ?? a.trust_score ?? 85) < 90
  ).length;
  const restrictedCount = agents.filter(
    (a) => (a.trustScore ?? a.trust_score ?? 85) >= 40 && (a.trustScore ?? a.trust_score ?? 85) < 70
  ).length;
  const highRiskCount = agents.filter((a) => (a.trustScore ?? a.trust_score ?? 85) < 40).length;
  const activeCount = agents.filter((a) => a.status === 'ACTIVE').length;
  const revokedCount = agents.filter((a) => a.status === 'REVOKED').length;
  const suspendedCount = agents.filter((a) => a.status === 'SUSPENDED').length;
  const avgTrust =
    agents.length > 0
      ? Math.round(
          (agents.reduce((acc, a) => acc + (a.trustScore ?? a.trust_score ?? 85), 0) / agents.length) * 10
        ) / 10
      : 85.0;

  const getTierBadge = (score: number) => {
    if (score >= 90) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          TRUSTED
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          NORMAL
        </span>
      );
    }
    if (score >= 40) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          RESTRICTED
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        HIGH RISK
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ACTIVE
        </span>
      );
    }
    if (status === 'SUSPENDED') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
          <PauseCircle className="w-2.5 h-2.5" />
          SUSPENDED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
        <Lock className="w-2.5 h-2.5" />
        REVOKED
      </span>
    );
  };

  return (
    <AppShell>
      <Header
        title="Agent Identity & Trust Governance"
        subtitle="First-class AI agent registry with authenticated pre-request middleware, lifecycle states (ACTIVE, SUSPENDED, REVOKED), dynamic scoring, and mandate bindings."
        badge="IDENTITY & REPUTATION"
      />

      <main className="p-8 space-y-8 max-w-7xl">
        {/* TOP CONTROLS & FLEET SUMMARY */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Agent Fleet Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {agents.length} registered agents &bull; {activeCount} active &bull; {suspendedCount} suspended &bull; {revokedCount} revoked
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Agent</span>
            </button>
          </div>
        </div>

        {/* 1. FLEET TRUST KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Fleet Average Trust
            </span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono-tabular">
                {avgTrust}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ 100</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{agents.length} Registered Identities</p>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Trusted Tier
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                90–100
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">{trustedCount}</span>
              <span className="text-xs text-emerald-600 font-medium">Agents</span>
            </div>
            <p className="text-[11px] text-emerald-700/80 mt-1">Normal Mandate Rules</p>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                Normal Tier
              </span>
              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                70–89
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-700">{normalCount}</span>
              <span className="text-xs text-blue-600 font-medium">Agents</span>
            </div>
            <p className="text-[11px] text-blue-700/80 mt-1">Normal Mandate Rules</p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Restricted Tier
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                40–69
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-700">{restrictedCount}</span>
              <span className="text-xs text-amber-600 font-medium">Agents</span>
            </div>
            <p className="text-[11px] text-amber-700/80 mt-1">Human Review &gt; ₹2,500</p>
          </div>

          <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
                High Risk / Revoked
              </span>
              <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                0–39
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-700">{highRiskCount}</span>
              <span className="text-xs text-rose-600 font-medium">Agents</span>
            </div>
            <p className="text-[11px] text-rose-700/80 mt-1">Autonomous Blocked</p>
          </div>
        </div>

        {/* Simulation / Action Alert Banner */}
        {simulationSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{simulationSuccess}</span>
            </div>
          </div>
        )}

        {/* 2. AGENT TABLE & FIRST-CLASS INSPECTOR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Table: Agent Fleet */}
          <div className="lg:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registered AI Agents</h3>
                <p className="text-xs text-slate-500">
                  Select an agent to inspect its verified identity, payment history, and trust signals
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {agents.length} IDENTITIES
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                    <th className="pb-3 font-semibold">Agent</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Trust Score</th>
                    <th className="pb-3 font-semibold">Tier</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Loading registered agent fleet...
                      </td>
                    </tr>
                  ) : (
                    agents.map((ag) => {
                      const score = Math.round((ag.trustScore ?? ag.trust_score ?? 85) * 10) / 10;
                      const isSelected = (selectedAgent?.id || selectedAgent?.agent_id) === (ag.id || ag.agent_id);

                      return (
                        <tr
                          key={ag.id || ag.agent_id}
                          onClick={() => handleSelectAgent(ag)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Agent Name & ID */}
                          <td className="py-3.5 pr-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                                  ag.status === 'REVOKED'
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : ag.status === 'SUSPENDED'
                                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                                    : score >= 90
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : 'bg-blue-50 text-blue-600 border-blue-200'
                                }`}
                              >
                                <Bot className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate max-w-[130px]">
                                  {ag.name || ag.agent_name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px] block">
                                  {ag.id || ag.agent_id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5">{getStatusBadge(ag.status)}</td>

                          {/* Trust Score Gauge */}
                          <td className="py-3.5 font-mono-tabular">
                            <div className="flex items-baseline gap-1">
                              <span className="font-black text-slate-900 text-sm">{score}</span>
                              <span className="text-slate-400 text-[10px]">/100</span>
                            </div>
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  score >= 90
                                    ? 'bg-emerald-500'
                                    : score >= 70
                                    ? 'bg-blue-500'
                                    : score >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </td>

                          {/* Governance Tier */}
                          <td className="py-3.5">{getTierBadge(score)}</td>

                          {/* Quick Actions */}
                          <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {ag.status !== 'REVOKED' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(ag);
                                }}
                                className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors cursor-pointer ${
                                  ag.status === 'ACTIVE'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                {ag.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>
                            ) : (
                              <span className="px-2 py-1 rounded-md text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200">
                                Locked
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel: First-Class Agent Inspector */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-950 text-slate-100 border border-slate-800 space-y-6 shadow-xl relative">
            {selectedAgent ? (
              <>
                {/* Agent Header & Actions Bar */}
                <div className="border-b border-slate-800 pb-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                        FIRST-CLASS IDENTITY
                      </span>
                      {getStatusBadge(selectedAgent.status)}
                    </div>
                    {getTierBadge(selectedAgent.trustScore ?? selectedAgent.trust_score ?? 85)}
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {selectedAgent.name || selectedAgent.agent_name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ID: {selectedAgent.id || selectedAgent.agent_id} &bull; Owner: {selectedAgent.ownerId || selectedAgent.owner_id || 'usr_demo_01'}
                      </p>
                      {selectedAgent.description && (
                        <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                          {selectedAgent.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 pl-4">
                      <span className="text-3xl font-black text-white font-mono-tabular">
                        {selectedAgent.trustScore ?? selectedAgent.trust_score ?? 85}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">/100</span>
                    </div>
                  </div>

                  {/* Warning Callout for SUSPENDED / REVOKED */}
                  {selectedAgent.status === 'REVOKED' && (
                    <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-300">
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>CRYPTOGRAPHIC REVOCATION LOCK ENFORCED</span>
                      </div>
                      <p className="text-[11px] text-rose-300/90 leading-relaxed">
                        This agent identity has been permanently revoked. Backend middleware strictly halts all payment requests with HTTP 403 (AGENT_REVOKED).
                      </p>
                    </div>
                  )}

                  {selectedAgent.status === 'SUSPENDED' && (
                    <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <PauseCircle className="w-4 h-4 shrink-0" />
                        <span>AGENT TEMPORARILY SUSPENDED</span>
                      </div>
                      <p className="text-[11px] text-amber-300/90 leading-relaxed">
                        Autonomous payment authorization is temporarily disabled. Reinstate to ACTIVE to resume operations.
                      </p>
                    </div>
                  )}

                  {/* Lifecycle Control Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    {selectedAgent.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleToggleStatus(selectedAgent)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Suspend Agent</span>
                      </button>
                    )}

                    {selectedAgent.status === 'SUSPENDED' && (
                      <button
                        onClick={() => handleToggleStatus(selectedAgent)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Activate Agent</span>
                      </button>
                    )}

                    {selectedAgent.status !== 'REVOKED' && (
                      <button
                        onClick={() => setIsRevokeModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Revoke Agent</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Core Inspector Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-800 pb-3 text-xs overflow-x-auto">
                  <button
                    onClick={() => setActiveMainTab('TRUST')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 ${
                      activeMainTab === 'TRUST'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    Trust & Signals
                  </button>
                  <button
                    onClick={() => setActiveMainTab('PAYMENTS')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 ${
                      activeMainTab === 'PAYMENTS'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    Payment History ({agentPayments.length})
                  </button>
                  <button
                    onClick={() => setActiveMainTab('MANDATES')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 ${
                      activeMainTab === 'MANDATES'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    Mandate Assignments ({agentMandates.length})
                  </button>
                  <button
                    onClick={() => setActiveMainTab('IDENTITY')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 ${
                      activeMainTab === 'IDENTITY'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    Identity & Permissions
                  </button>
                </div>

                {/* TAB 1: TRUST & SIGNALS */}
                {activeMainTab === 'TRUST' && (
                  <div className="space-y-4">
                    {/* Sub-tabs for Trust */}
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setActiveTrustTab('SIGNALS')}
                        className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                          activeTrustTab === 'SIGNALS'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Signals Breakdown
                      </button>
                      <button
                        onClick={() => setActiveTrustTab('HISTORY')}
                        className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                          activeTrustTab === 'HISTORY'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Score History ({trustReport?.scoreHistory.length || 0})
                      </button>
                      <button
                        onClick={() => setActiveTrustTab('METRICS')}
                        className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                          activeTrustTab === 'METRICS'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Lifetime Metrics
                      </button>
                    </div>

                    {loadingReport ? (
                      <div className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                        Evaluating dynamic trust signals...
                      </div>
                    ) : trustReport ? (
                      <>
                        {activeTrustTab === 'SIGNALS' && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4" />
                                Positive Signals (+ Credits)
                              </span>
                              <div className="space-y-2">
                                {trustReport.positiveSignals.map((sig) => (
                                  <div
                                    key={sig.id}
                                    className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/20 space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-200">{sig.name}</span>
                                      <span className="text-xs font-mono font-bold text-emerald-400">
                                        {sig.impact}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">{sig.detail}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2 pt-2">
                              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                                <TrendingDown className="w-4 h-4" />
                                Negative Signals (- Deductions)
                              </span>
                              <div className="space-y-2">
                                {trustReport.negativeSignals.map((sig) => (
                                  <div
                                    key={sig.id}
                                    className="p-3 rounded-xl bg-slate-900/90 border border-rose-500/20 space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-200">{sig.name}</span>
                                      <span className="text-xs font-mono font-bold text-rose-400">
                                        {sig.impact}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">{sig.detail}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTrustTab === 'HISTORY' && (
                          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                            {trustReport.scoreHistory.length === 0 ? (
                              <p className="text-xs text-slate-500 py-6 text-center">No score history logged.</p>
                            ) : (
                              trustReport.scoreHistory.map((h) => (
                                <div
                                  key={h.id}
                                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs font-mono"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-[10px]">
                                      {new Date(h.timestamp).toLocaleString()}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        h.scoreDelta > 0
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : 'bg-rose-500/20 text-rose-400'
                                      }`}
                                    >
                                      {h.scoreDelta > 0 ? `+${h.scoreDelta}` : h.scoreDelta}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-200 font-sans">{h.explanation}</p>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {activeTrustTab === 'METRICS' && (
                          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Authorized Payments</span>
                              <span className="text-base font-bold text-emerald-400">
                                {trustReport.metrics.authorizedTransactions}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Blocked Payments</span>
                              <span className="text-base font-bold text-rose-400">
                                {trustReport.metrics.blockedTransactions}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Disputes Filed</span>
                              <span className="text-base font-bold text-amber-400">
                                {trustReport.metrics.disputedTransactions}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Clawbacks / Reversals</span>
                              <span className="text-base font-bold text-teal-400">
                                {trustReport.metrics.reversedTransactions}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Interactive Simulator */}
                        <div className="pt-3 border-t border-slate-800 space-y-2">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Interactive Score Simulator
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              disabled={simulatingEvent !== null}
                              onClick={() => handleSimulate('SUCCESS', 'Successful authorized payment (+0.5)')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              +0.5 Clean Payment
                            </button>
                            <button
                              disabled={simulatingEvent !== null}
                              onClick={() => handleSimulate('MANDATE_VIOLATION', 'Purchase outside mandate (-5.0)')}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              -5.0 Mandate Breach
                            </button>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                {/* TAB 2: PAYMENT HISTORY */}
                {activeMainTab === 'PAYMENTS' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>TRANSACTIONS EXECUTED</span>
                      <span>STATUS</span>
                    </div>

                    {loadingPayments ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                        Loading transaction history...
                      </div>
                    ) : agentPayments.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                        <CreditCard className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="text-xs text-slate-400">No transactions initiated by this agent yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {agentPayments.map((tx) => (
                          <div
                            key={tx.id}
                            className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-white block">{tx.merchant}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{tx.product}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-slate-200">
                                  ₹{(tx.amount / 100).toLocaleString('en-IN')}
                                </span>
                                <span
                                  className={`block text-[10px] font-mono font-bold ${
                                    tx.status === 'SUCCESS'
                                      ? 'text-emerald-400'
                                      : tx.status === 'BLOCKED'
                                      ? 'text-rose-400'
                                      : 'text-amber-400'
                                  }`}
                                >
                                  {tx.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800">
                              <span>ID: {tx.id}</span>
                              <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: MANDATE ASSIGNMENTS */}
                {activeMainTab === 'MANDATES' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>ASSIGNED MANDATE POLICIES</span>
                      <span>SPENDING CEILINGS</span>
                    </div>

                    {loadingMandates ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                        Loading assigned mandates...
                      </div>
                    ) : agentMandates.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                        <FileText className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="text-xs text-slate-400">No mandates currently assigned to this agent.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {agentMandates.map((m) => (
                          <div
                            key={m.id}
                            className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{m.name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                {m.status || 'ACTIVE'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                              <div>
                                <span className="text-slate-500 block text-[10px]">Merchant Scope</span>
                                <span className="text-slate-200">{m.merchant}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Single Tx Limit</span>
                                <span className="font-mono text-emerald-400">
                                  ₹{(m.maxAmount / 100).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Daily Limit</span>
                                <span className="font-mono text-slate-300">
                                  ₹{(m.dailyLimit / 100).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Spent Today</span>
                                <span className="font-mono text-slate-300">
                                  ₹{((m.spentToday || 0) / 100).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: IDENTITY & PERMISSIONS */}
                {activeMainTab === 'IDENTITY' && (
                  <div className="space-y-4 text-xs">
                    {/* Record Attributes Card */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                      <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                        Agent Record Attributes
                      </span>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px]">agent_id</span>
                          <span className="text-slate-200 truncate block">{selectedAgent.id || selectedAgent.agent_id}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">agent_name</span>
                          <span className="text-slate-200">{selectedAgent.name || selectedAgent.agent_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">owner_id</span>
                          <span className="text-slate-200">{selectedAgent.ownerId || selectedAgent.owner_id || 'usr_demo_01'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">status</span>
                          <span className="text-slate-200">{selectedAgent.status}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">trust_score</span>
                          <span className="text-slate-200">{selectedAgent.trustScore ?? selectedAgent.trust_score ?? 85}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">created_at</span>
                          <span className="text-slate-200">
                            {new Date(selectedAgent.createdAt || selectedAgent.created_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Permissions Checklist */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                        Assigned Capabilities & Permissions
                      </span>
                      <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                        {AVAILABLE_PERMISSIONS.map((perm) => {
                          const isAssigned = (selectedAgent.permissions || []).includes(perm.id);
                          return (
                            <div
                              key={perm.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                isAssigned
                                  ? 'bg-slate-900 border-indigo-500/30 text-white'
                                  : 'bg-slate-950/60 border-slate-800/60 text-slate-500 opacity-60'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold block">{perm.label}</span>
                                <span className="text-[10px] font-mono text-slate-400">{perm.id}</span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  isAssigned
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-slate-800 text-slate-500'
                                }`}
                              >
                                {isAssigned ? 'ALLOWED' : 'FORBIDDEN'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-24 text-center text-slate-500">Select an agent from the fleet table.</div>
            )}
          </div>
        </div>

        {/* 3. REGISTER NEW AGENT MODAL */}
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Register Autonomous Agent</h3>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleRegisterAgent} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Agent Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Procurement-Agent-Beta"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-slate-900 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Must be unique in the enterprise registry.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Description & Purpose
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Autonomous office supply procurement agent with ₹10k monthly mandate"
                    value={regDesc}
                    onChange={(e) => setRegDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Owner User ID</label>
                  <input
                    type="text"
                    value={regOwner}
                    onChange={(e) => setRegOwner(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-slate-900 font-mono text-xs"
                  />
                </div>

                {/* Permissions Checklist */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Authorized Permissions
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                    {AVAILABLE_PERMISSIONS.map((p) => {
                      const checked = regPermissions.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(p.id)}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 block text-[11px]">{p.label}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{p.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isRegistering ? 'Registering...' : 'Register Agent'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. REVOKE AGENT CONFIRMATION MODAL */}
        {isRevokeModalOpen && selectedAgent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Revoke Agent Identity</h3>
                  <p className="text-xs text-slate-500">Permanent Cryptographic Lock</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-900 text-xs space-y-2">
                <p className="font-semibold">Are you sure you want to revoke {selectedAgent.name || selectedAgent.agent_name}?</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-800/90">
                  <li>This action is <strong>permanent</strong> and recorded in the SHA-256 cipher chain.</li>
                  <li>All payment requests will be <strong>strictly blocked</strong> with HTTP 403 (AGENT_REVOKED).</li>
                  <li>No autonomous or supervised payments will ever be permitted from this ID again.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRevokeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRevoking}
                  onClick={handleConfirmRevoke}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRevoking ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
