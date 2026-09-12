'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { fetchApi } from '@/lib/api';
import {
  FileCheck,
  Plus,
  Ban,
  Shield,
  Clock,
  CheckCircle2,
  Calendar,
  IndianRupee,
  X,
  Code2,
  Copy,
  Check,
  AlertTriangle,
  Search,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpRight,
  FileText,
  Tag,
  Building2,
  Layers,
  Cpu,
} from 'lucide-react';
import { AgentTrustRegistry } from '@/components/AgentTrustRegistry';

interface MandateItem {

  id?: string;
  mandate_id?: string;
  user_id?: string;
  agent_id?: string;
  agentId?: string;
  userId?: string;
  name: string;
  merchant?: string;
  allowedMerchants?: string[] | string;
  allowed_merchants?: string[];
  category?: string;
  allowedCategories?: string[] | string;
  allowed_scope?: string[];
  productPattern?: string | null;
  product_pattern?: string | null;
  maxAmount?: number;
  maximum_transaction_amount?: number;
  maximum_transaction_amount_inr?: number;
  dailyLimit?: number;
  daily_spending_limit?: number;
  daily_spending_limit_inr?: number;
  spentToday?: number;
  spent_today?: number;
  spent_today_inr?: number;
  remaining_daily_limit?: number;
  remaining_daily_limit_inr?: number;
  currency?: string;
  validFrom?: string | Date;
  validUntil?: string | Date;
  mandate_creation_time?: string;
  expiry_time?: string;
  status?: string;
  mandate_status?: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  approvalThreshold?: number | null;
  approval_requirements?: {
    requires_approval_above: number | null;
    requires_approval_above_inr: number | null;
    currency: string;
    description: string;
  };
  agent?: {
    id: string;
    name: string;
    trustScore?: number;
    status?: string;
  };
}

export default function MandatesPage() {
  const [mandates, setMandates] = useState<MandateItem[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inspectMandate, setInspectMandate] = useState<MandateItem | null>(null);
  const [testMandate, setTestMandate] = useState<MandateItem | null>(null);

  // Test Runner State
  const [testForm, setTestForm] = useState({
    amountInr: '4999',
    merchant: 'Amazon',
    category: 'Electronics',
    product: 'Logitech K380 Wireless Keyboard',
  });
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Create Mandate Form State
  const [formData, setFormData] = useState({
    agentId: '',
    userId: 'usr_demo_01',
    name: '',
    merchantInput: '',
    merchants: ['Amazon'],
    categoryInput: '',
    categories: ['Electronics', 'Office Supplies'],
    productPattern: 'Keyboard|Mouse|Monitor|Office Supplies',
    maxAmountInr: '5000',
    dailyLimitInr: '15000',
    approvalThresholdInr: '4000',
    validUntilDays: '30',
    currency: 'INR',
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchApi<any[]>('/api/mandates'),
      fetchApi<any[]>('/api/agents'),
    ])
      .then(([mandatesData, agentsData]) => {
        setMandates(Array.isArray(mandatesData) ? mandatesData : []);
        setAgents(Array.isArray(agentsData) ? agentsData : []);
        if (agentsData && agentsData.length > 0 && !formData.agentId) {
          setFormData((prev) => ({ ...prev, agentId: agentsData[0].id }));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const getMandateId = (m: MandateItem): string => m.mandate_id || m.id || 'unknown';
  const getStatus = (m: MandateItem): 'ACTIVE' | 'EXPIRED' | 'REVOKED' => {
    if (m.mandate_status) return m.mandate_status;
    if (m.status === 'REVOKED') return 'REVOKED';
    const expiry = m.expiry_time || m.validUntil;
    if (expiry && new Date(expiry).getTime() < Date.now()) return 'EXPIRED';
    return (m.status as any) || 'ACTIVE';
  };

  const getMerchants = (m: MandateItem): string[] => {
    if (m.allowed_merchants && m.allowed_merchants.length > 0) return m.allowed_merchants;
    if (Array.isArray(m.allowedMerchants)) return m.allowedMerchants;
    if (typeof m.allowedMerchants === 'string') {
      try {
        const parsed = JSON.parse(m.allowedMerchants);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return m.allowedMerchants.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    if (m.merchant) return [m.merchant];
    return ['Any'];
  };

  const getCategories = (m: MandateItem): string[] => {
    if (m.allowed_scope && m.allowed_scope.length > 0) return m.allowed_scope;
    if (Array.isArray(m.allowedCategories)) return m.allowedCategories;
    if (typeof m.allowedCategories === 'string') {
      try {
        const parsed = JSON.parse(m.allowedCategories);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return m.allowedCategories.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    if (m.category) return [m.category];
    return ['Any'];
  };

  const getMaxAmountInr = (m: MandateItem): number => {
    if (m.maximum_transaction_amount_inr !== undefined) return m.maximum_transaction_amount_inr;
    if (m.maximum_transaction_amount !== undefined) return m.maximum_transaction_amount / 100;
    if (m.maxAmount !== undefined) return m.maxAmount / 100;
    return 0;
  };

  const getDailyLimitInr = (m: MandateItem): number => {
    if (m.daily_spending_limit_inr !== undefined) return m.daily_spending_limit_inr;
    if (m.daily_spending_limit !== undefined) return m.daily_spending_limit / 100;
    if (m.dailyLimit !== undefined) return m.dailyLimit / 100;
    return 0;
  };

  const getSpentTodayInr = (m: MandateItem): number => {
    if (m.spent_today_inr !== undefined) return m.spent_today_inr;
    if (m.spent_today !== undefined) return m.spent_today / 100;
    if (m.spentToday !== undefined) return m.spentToday / 100;
    return 0;
  };

  const getApprovalThresholdInr = (m: MandateItem): number | null => {
    if (m.approval_requirements?.requires_approval_above_inr !== undefined) {
      return m.approval_requirements.requires_approval_above_inr;
    }
    if (m.approvalThreshold) return m.approvalThreshold / 100;
    return null;
  };

  const getExpiryDate = (m: MandateItem): Date => {
    const raw = m.expiry_time || m.validUntil || new Date(Date.now() + 30 * 86400000);
    return new Date(raw);
  };

  // Filtered mandates
  const filteredMandates = useMemo(() => {
    return mandates.filter((m) => {
      const status = getStatus(m);
      if (activeTab !== 'ALL' && status !== activeTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const id = getMandateId(m).toLowerCase();
      const name = (m.name || '').toLowerCase();
      const merchants = getMerchants(m).join(' ').toLowerCase();
      const categories = getCategories(m).join(' ').toLowerCase();
      const agentName = (m.agent?.name || '').toLowerCase();

      return (
        id.includes(q) ||
        name.includes(q) ||
        merchants.includes(q) ||
        categories.includes(q) ||
        agentName.includes(q)
      );
    });
  }, [mandates, activeTab, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let totalCount = mandates.length;
    let activeCount = 0;
    let expiredCount = 0;
    let revokedCount = 0;
    let totalDailyAllocatedInr = 0;

    mandates.forEach((m) => {
      const st = getStatus(m);
      if (st === 'ACTIVE') {
        activeCount++;
        totalDailyAllocatedInr += getDailyLimitInr(m);
      } else if (st === 'EXPIRED') {
        expiredCount++;
      } else if (st === 'REVOKED') {
        revokedCount++;
      }
    });

    return {
      totalCount,
      activeCount,
      expiredCount,
      revokedCount,
      totalDailyAllocatedInr,
    };
  }, [mandates]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm(`Are you sure you want to revoke mandate "${id}"? All autonomous payments referencing it will immediately be blocked.`)) return;
    try {
      await fetchApi(`/api/mandates/${id}/revoke`, { method: 'PATCH' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke mandate');
    }
  };

  const handleExtend = async (id: string) => {
    try {
      await fetchApi(`/api/mandates/${id}/extend`, {
        method: 'PATCH',
        body: JSON.stringify({ days: 30 }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to extend mandate');
    }
  };

  const handleOpenTestModal = (m: MandateItem) => {
    setTestMandate(m);
    const merchants = getMerchants(m);
    const categories = getCategories(m);
    setTestForm({
      amountInr: String(Math.min(getMaxAmountInr(m), 4999)),
      merchant: merchants[0] || 'Amazon',
      category: categories[0] || 'Electronics',
      product: m.productPattern ? m.productPattern.split('|')[0] : 'Office Keyboard',
    });
    setTestResult(null);
  };

  const handleRunTestValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMandate) return;
    setTestLoading(true);
    setTestResult(null);

    try {
      const mandateId = getMandateId(testMandate);
      const res = await fetchApi<any>(`/api/mandates/${mandateId}/validate`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Math.round(parseFloat(testForm.amountInr) * 100),
          merchant: testForm.merchant,
          category: testForm.category,
          product: testForm.product,
          currency: 'INR',
        }),
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        isValid: false,
        requiresHumanApproval: false,
        reasonCode: 'VALIDATION_FAILED',
        message: err.message || 'Validation request failed',
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Add chip helper
  const addMerchant = () => {
    if (!formData.merchantInput.trim()) return;
    if (!formData.merchants.includes(formData.merchantInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        merchants: [...prev.merchants, prev.merchantInput.trim()],
        merchantInput: '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, merchantInput: '' }));
    }
  };

  const removeMerchant = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      merchants: prev.merchants.filter((_, i) => i !== idx),
    }));
  };

  const addCategory = () => {
    if (!formData.categoryInput.trim()) return;
    if (!formData.categories.includes(formData.categoryInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        categories: [...prev.categories, prev.categoryInput.trim()],
        categoryInput: '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, categoryInput: '' }));
    }
  };

  const removeCategory = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateMandate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.merchants.length === 0) {
      alert('Please add at least one authorized merchant.');
      return;
    }
    if (formData.categories.length === 0) {
      alert('Please add at least one authorized product category.');
      return;
    }

    try {
      await fetchApi('/api/mandates', {
        method: 'POST',
        body: JSON.stringify({
          agentId: formData.agentId,
          userId: formData.userId,
          name: formData.name,
          allowedMerchants: formData.merchants,
          merchant: formData.merchants[0],
          allowedCategories: formData.categories,
          category: formData.categories[0],
          productPattern: formData.productPattern || undefined,
          maxAmount: parseInt(formData.maxAmountInr, 10) * 100, // paise
          dailyLimit: parseInt(formData.dailyLimitInr, 10) * 100,
          approvalThreshold: formData.approvalThresholdInr
            ? parseInt(formData.approvalThresholdInr, 10) * 100
            : undefined,
          validUntilDays: parseInt(formData.validUntilDays, 10),
          currency: 'INR',
        }),
      });
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error creating mandate');
    }
  };

  // Preview JSON for create modal
  const livePreviewJson = useMemo(() => {
    const maxPaise = parseInt(formData.maxAmountInr || '0', 10) * 100;
    const dailyPaise = parseInt(formData.dailyLimitInr || '0', 10) * 100;
    const approvalPaise = formData.approvalThresholdInr
      ? parseInt(formData.approvalThresholdInr, 10) * 100
      : null;
    const now = new Date();
    const expiry = new Date(now.getTime() + (parseInt(formData.validUntilDays || '30', 10) || 30) * 86400000);

    return {
      mandate_id: `mnd_${(formData.name || 'unnamed').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16)}_${Date.now().toString().slice(-4)}`,
      user_id: formData.userId,
      agent_id: formData.agentId || 'agent_selected',
      name: formData.name || 'New Financial Mandate',
      maximum_transaction_amount: maxPaise,
      maximum_transaction_amount_inr: maxPaise / 100,
      daily_spending_limit: dailyPaise,
      daily_spending_limit_inr: dailyPaise / 100,
      currency: formData.currency,
      allowed_merchants: formData.merchants,
      allowed_scope: formData.categories,
      product_pattern: formData.productPattern || null,
      mandate_creation_time: now.toISOString(),
      expiry_time: expiry.toISOString(),
      mandate_status: 'ACTIVE',
      approval_requirements: {
        requires_approval_above: approvalPaise,
        requires_approval_above_inr: approvalPaise ? approvalPaise / 100 : null,
        currency: formData.currency,
        description: approvalPaise
          ? `Transactions exceeding ₹${(approvalPaise / 100).toLocaleString()} require supervisor approval`
          : 'Deterministic auto-pass within limits',
      },
    };
  }, [formData]);

  return (
    <AppShell>
      <Header
        title="Agent Payment Mandates"
        subtitle="Machine-readable governance envelopes defining deterministic purchasing bounds, multi-merchant scopes, and automated approval rules."
        badge="POLICY ENFORCEMENT"
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Refresh Mandates"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Machine Mandate</span>
            </button>
          </div>
        }
      />

      <main className="p-8 space-y-8 max-w-7xl">
        {/* KPI Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Mandates</span>
              <FileCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-slate-900">
              {metrics.totalCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Configured across all agents</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Envelopes</span>
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-emerald-600 flex items-center gap-2">
              {metrics.activeCount}
              <span className="text-xs font-mono font-normal bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                Enforcing
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Ready for sub-15ms payment checks</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Daily Spending Cap</span>
              <IndianRupee className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-slate-900">
              ₹{metrics.totalDailyAllocatedInr.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Combined daily ceiling allocation</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Inactive / Guarded</span>
              <Ban className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono-tabular text-slate-900">
              {metrics.expiredCount + metrics.revokedCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {metrics.expiredCount} Expired · {metrics.revokedCount} Revoked
            </p>
          </div>
        </div>

        {/* Agent Trust Registry & Ecosystem (PS #10 Bonus Feature) */}
        <AgentTrustRegistry />

        {/* Filter Tabs & Search Bar */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            {(['ALL', 'ACTIVE', 'EXPIRED', 'REVOKED'] as const).map((tab) => {
              const count =
                tab === 'ALL'
                  ? metrics.totalCount
                  : tab === 'ACTIVE'
                  ? metrics.activeCount
                  : tab === 'EXPIRED'
                  ? metrics.expiredCount
                  : metrics.revokedCount;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab === 'ALL' ? 'All Mandates' : tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === tab
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-200/70 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, name, merchant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Mandates Grid / List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading machine-readable mandates...</p>
          </div>
        ) : filteredMandates.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-900">No Mandates Found</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery
                ? `No mandates matched "${searchQuery}". Try clearing your search query.`
                : `No mandates under the "${activeTab}" filter. Create a new machine-readable mandate to start governing agent transactions.`}
            </p>
            {activeTab !== 'ALL' && (
              <button
                onClick={() => setActiveTab('ALL')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                Show All Mandates
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMandates.map((m) => {
              const id = getMandateId(m);
              const status = getStatus(m);
              const merchants = getMerchants(m);
              const categories = getCategories(m);
              const maxSingle = getMaxAmountInr(m);
              const dailyCap = getDailyLimitInr(m);
              const spentToday = getSpentTodayInr(m);
              const threshold = getApprovalThresholdInr(m);
              const expiry = getExpiryDate(m);
              const isExpired = expiry.getTime() < Date.now();
              const daysRemaining = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const dailyUsagePercent = dailyCap > 0 ? Math.min(100, Math.round((spentToday / dailyCap) * 100)) : 0;

              return (
                <div
                  key={id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                    status === 'ACTIVE'
                      ? 'border-slate-200'
                      : status === 'EXPIRED'
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Name & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              status === 'ACTIVE'
                                ? 'bg-emerald-500 animate-pulse'
                                : status === 'EXPIRED'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                              status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : status === 'EXPIRED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{m.name}</h4>
                        <div className="flex items-center gap-1 text-[11px] text-blue-600 font-mono mt-0.5">
                          <Cpu className="w-3 h-3 text-blue-500" />
                          <span>{m.agent?.name || m.agent_id || m.agentId || 'Assigned Agent'}</span>
                        </div>
                      </div>

                      {/* Mandate ID copy chip */}
                      <button
                        onClick={() => handleCopy(id, id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-mono transition-colors cursor-pointer"
                        title="Copy mandate_id"
                      >
                        {copiedId === id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[80px]">{id}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Allowed Merchants */}
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>Authorized Merchants</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {merchants.map((merchant, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-medium"
                          >
                            {merchant}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Scope / Categories */}
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span>Allowed Scope / Categories</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {categories.map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Financial Spending Bounds */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Max Single Tx:</span>
                        <span className="font-mono-tabular font-bold text-slate-900">
                          ₹{maxSingle.toLocaleString()} INR
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Daily Limit:</span>
                          <span className="font-mono-tabular font-bold text-slate-900">
                            ₹{dailyCap.toLocaleString()} INR
                          </span>
                        </div>
                        {/* Daily Progress */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              dailyUsagePercent > 80
                                ? 'bg-rose-500'
                                : dailyUsagePercent > 50
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${dailyUsagePercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>Spent today: ₹{spentToday.toLocaleString()}</span>
                          <span>{dailyUsagePercent}% used</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 font-medium">Approval Required:</span>
                        <span className="font-mono-tabular font-semibold text-amber-600">
                          {threshold ? `Above ₹${threshold.toLocaleString()}` : 'None (Autonomous)'}
                        </span>
                      </div>
                    </div>

                    {/* Validity & Expiry */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Expires: {expiry.toLocaleDateString()}
                      </span>
                      <span
                        className={
                          isExpired
                            ? 'text-rose-600 font-bold'
                            : daysRemaining <= 5
                            ? 'text-amber-600 font-bold'
                            : 'text-slate-500'
                        }
                      >
                        {isExpired ? 'Expired' : `${daysRemaining} days left`}
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setInspectMandate(m)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                        title="View Machine-Readable Protocol JSON"
                      >
                        <Code2 className="w-3 h-3" />
                        <span>JSON</span>
                      </button>
                      <button
                        onClick={() => handleOpenTestModal(m)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Test Payment Validation Against This Mandate"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Test</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleRevoke(id)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => handleExtend(id)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          Extend (+30d)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL 1: Machine-Readable JSON Inspector */}
        {inspectMandate && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative text-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Machine-Readable Mandate Protocol</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {getMandateId(inspectMandate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleCopy(
                        JSON.stringify(inspectMandate, null, 2),
                        'inspect-modal'
                      )
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
                  >
                    {copiedId === 'inspect-modal' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setInspectMandate(null)}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 overflow-auto max-h-96">
                <pre className="font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre">
                  {JSON.stringify(inspectMandate, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>Deterministic Mandate Standard v1.0</span>
                <button
                  onClick={() => setInspectMandate(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Test Payment Validation Against Mandate */}
        {testMandate && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
              <button
                onClick={() => setTestMandate(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Test Mandate Validation</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Mandate: {getMandateId(testMandate)} ({testMandate.name})
                  </p>
                </div>
              </div>

              <form onSubmit={handleRunTestValidation} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Amount (₹ INR)
                    </label>
                    <input
                      type="number"
                      value={testForm.amountInr}
                      onChange={(e) => setTestForm({ ...testForm, amountInr: e.target.value })}
                      placeholder="4999"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-hidden focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Merchant Name
                    </label>
                    <input
                      type="text"
                      value={testForm.merchant}
                      onChange={(e) => setTestForm({ ...testForm, merchant: e.target.value })}
                      placeholder="Amazon"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Category</label>
                    <input
                      type="text"
                      value={testForm.category}
                      onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                      placeholder="Electronics"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Product Description</label>
                    <input
                      type="text"
                      value={testForm.product}
                      onChange={(e) => setTestForm({ ...testForm, product: e.target.value })}
                      placeholder="Logitech K380"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={testLoading}
                  className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{testLoading ? 'Evaluating Bounds...' : 'Evaluate Against Mandate'}</span>
                </button>
              </form>

              {/* Validation Result Box */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    testResult.isValid && !testResult.requiresHumanApproval
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : testResult.requiresHumanApproval
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {testResult.isValid && !testResult.requiresHumanApproval ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>
                        {testResult.isValid && !testResult.requiresHumanApproval
                          ? 'MANDATE EVALUATION PASSED (APPROVED)'
                          : testResult.requiresHumanApproval
                          ? 'MANDATE CEILING EXCEEDED (HUMAN APPROVAL REQUIRED)'
                          : `MANDATE REJECTED (${testResult.reasonCode || 'BLOCKED'})`}
                      </span>
                    </span>
                  </div>

                  {testResult.message && (
                    <p className="text-[11px] leading-relaxed opacity-90">{testResult.message}</p>
                  )}

                  {testResult.checks && (
                    <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                      <div>
                        Merchant Match:{' '}
                        <span className={testResult.checks.merchantAllowed ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {testResult.checks.merchantAllowed ? '✓ ALLOWED' : '✗ DISALLOWED'}
                        </span>
                      </div>
                      <div>
                        Scope Match:{' '}
                        <span className={testResult.checks.scopeAllowed ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {testResult.checks.scopeAllowed ? '✓ ALLOWED' : '✗ DISALLOWED'}
                        </span>
                      </div>
                      <div>
                        Single Limit:{' '}
                        <span className={testResult.checks.withinSingleLimit ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {testResult.checks.withinSingleLimit ? '✓ OK' : '✗ EXCEEDED'}
                        </span>
                      </div>
                      <div>
                        Daily Limit:{' '}
                        <span className={testResult.checks.withinDailyLimit ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {testResult.checks.withinDailyLimit ? '✓ OK' : '✗ EXCEEDED'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 3: Create Machine-Readable Mandate */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Deploy Machine-Readable Mandate
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defines strict deterministic authorization envelopes for an autonomous agent
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Side */}
                <form onSubmit={handleCreateMandate} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Target Agent</label>
                    <select
                      value={formData.agentId}
                      onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      required
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (Trust: {a.trustScore}/100, Status: {a.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Mandate Title</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Amazon & Flipkart IT Peripherals"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Multi-Merchant Chips */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Authorized Merchants
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={formData.merchantInput}
                        onChange={(e) => setFormData({ ...formData, merchantInput: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addMerchant();
                          }
                        }}
                        placeholder="Type merchant & press Add (e.g. Amazon)"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addMerchant}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {formData.merchants.map((m, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-[11px] font-medium"
                        >
                          {m}
                          <button
                            type="button"
                            onClick={() => removeMerchant(idx)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span>Quick presets:</span>
                      {['Amazon', 'Flipkart', 'MakeMyTrip', 'Uber', 'AWS'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            if (!formData.merchants.includes(preset)) {
                              setFormData((prev) => ({
                                ...prev,
                                merchants: [...prev.merchants, preset],
                              }));
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Category Chips */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Allowed Product / Category Scope
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={formData.categoryInput}
                        onChange={(e) => setFormData({ ...formData, categoryInput: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCategory();
                          }
                        }}
                        placeholder="Type category & press Add (e.g. Electronics)"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addCategory}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {formData.categories.map((c, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium"
                        >
                          {c}
                          <button
                            type="button"
                            onClick={() => removeCategory(idx)}
                            className="text-blue-400 hover:text-blue-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span>Quick presets:</span>
                      {['Electronics', 'Office Supplies', 'Travel Tickets', 'Cloud Infrastructure'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            if (!formData.categories.includes(cat)) {
                              setFormData((prev) => ({
                                ...prev,
                                categories: [...prev.categories, cat],
                              }));
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer"
                        >
                          +{cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Financial Bounds */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Max Single Tx (₹ INR)
                      </label>
                      <input
                        type="number"
                        value={formData.maxAmountInr}
                        onChange={(e) => setFormData({ ...formData, maxAmountInr: e.target.value })}
                        placeholder="5000"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500 font-mono-tabular"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Daily Spending Limit (₹ INR)
                      </label>
                      <input
                        type="number"
                        value={formData.dailyLimitInr}
                        onChange={(e) => setFormData({ ...formData, dailyLimitInr: e.target.value })}
                        placeholder="15000"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500 font-mono-tabular"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Supervisor Approval Above (₹ INR)
                      </label>
                      <input
                        type="number"
                        value={formData.approvalThresholdInr}
                        onChange={(e) =>
                          setFormData({ ...formData, approvalThresholdInr: e.target.value })
                        }
                        placeholder="4000"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500 font-mono-tabular"
                      />
                      <span className="text-[10px] text-slate-400">Leave blank for full auto-approval</span>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Validity (Days)</label>
                      <input
                        type="number"
                        value={formData.validUntilDays}
                        onChange={(e) =>
                          setFormData({ ...formData, validUntilDays: e.target.value })
                        }
                        placeholder="30"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500 font-mono-tabular"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Product Name Pattern (Regex / Keywords)
                    </label>
                    <input
                      type="text"
                      value={formData.productPattern}
                      onChange={(e) => setFormData({ ...formData, productPattern: e.target.value })}
                      placeholder="Keyboard|Mouse|Monitor|Headphones"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500 font-mono text-[11px]"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-3.5 py-2 rounded-lg text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      Deploy Mandate Envelope
                    </button>
                  </div>
                </form>

                {/* Right Side: Machine-Readable Preview */}
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between text-white">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1.5 text-blue-400">
                        <Code2 className="w-3.5 h-3.5" /> Live Protocol Preview
                      </span>
                      <span>JSON Standard v1.0</span>
                    </div>

                    <div className="mt-3 overflow-auto max-h-[420px] font-mono text-[11px] text-emerald-400 leading-relaxed">
                      <pre className="whitespace-pre">{JSON.stringify(livePreviewJson, null, 2)}</pre>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Enforced deterministically on backend</span>
                    <span className="text-emerald-400 font-mono">Zero Trust Rail</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
