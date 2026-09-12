'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, AlertTriangle, Lock, ChevronDown, ChevronUp } from 'lucide-react';

export interface AgentTrustProfile {
  id: string;
  name: string;
  platform: string;
  trustScore: number;
  status: 'ACTIVE' | 'REVIEW' | 'SUSPENDED';
  historicalAccuracy: string;
  disputeRate: string;
  limitStatus: string;
}

const AGENT_PROFILES: AgentTrustProfile[] = [
  {
    id: 'agent_shop_01',
    name: 'Sierra Commerce Agent',
    platform: 'Sierra AI',
    trustScore: 94.2,
    status: 'ACTIVE',
    historicalAccuracy: '98.4%',
    disputeRate: '0.4%',
    limitStatus: 'Ceiling: ₹5,000',
  },
  {
    id: 'agent_travel_01',
    name: 'Agentforce Travel Bot',
    platform: 'Salesforce Agentforce',
    trustScore: 88.5,
    status: 'ACTIVE',
    historicalAccuracy: '96.1%',
    disputeRate: '1.2%',
    limitStatus: 'Ceiling: ₹15,000',
  },
  {
    id: 'agent_sub_01',
    name: 'Kore.ai Procure Agent',
    platform: 'Kore.ai',
    trustScore: 99.2,
    status: 'ACTIVE',
    historicalAccuracy: '99.8%',
    disputeRate: '0.0%',
    limitStatus: 'Ceiling: ₹25,000',
  },
  {
    id: 'agent_rogue_01',
    name: 'Decagon Return Bot',
    platform: 'Decagon / Gorgias',
    trustScore: 32.0,
    status: 'SUSPENDED',
    historicalAccuracy: '41.2%',
    disputeRate: '28.5%',
    limitStatus: '🔒 PAYMENTS FROZEN',
  },
];

/* Official SVG Brand Logos */
function PlatformLogo({ platform }: { platform: string }) {
  if (platform.includes('Sierra')) {
    // Sierra AI Official Geometric Emblem
    return (
      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 17L12 4L20 17H15L12 12L9 17H4Z"
            fill="#10B981"
            stroke="#059669"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  if (platform.includes('Salesforce') || platform.includes('Agentforce')) {
    // Official Salesforce Cloud Logo
    return (
      <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04Z"
            fill="#00A1E0"
          />
        </svg>
      </div>
    );
  }

  if (platform.includes('Kore')) {
    // Official Kore.ai Hexagon Cube Logo
    return (
      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="#6366F1" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 22V12" stroke="#6366F1" strokeWidth="2" />
          <path d="M21 7L12 12L3 7" stroke="#6366F1" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // Decagon Official Decagon Polygon Logo
  return (
    <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon
          points="12,2 17.5,3.8 21.4,8.1 22,14 19,19.1 14,22 8,22 3,19.1 2,14 2.6,8.1 7.5,3.8"
          fill="#F43F5E"
          stroke="#E11D48"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

export function AgentTrustRegistry({
  onSelectAgent,
  selectedAgentId,
}: {
  onSelectAgent?: (agentId: string) => void;
  selectedAgentId?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-2xl bg-white/90 border border-slate-200/80 p-4 shadow-xs space-y-3 transition-all">
      {/* Compact Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 tracking-tight">Agentic Commerce Trust Registry</span>
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
            PS #10 Trust Engine
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>{collapsed ? 'Expand Registry' : 'Collapse'}</span>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Collapsible Cards Grid */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {AGENT_PROFILES.map((agent) => {
            const isSelected = selectedAgentId === agent.id;
            const isSuspended = agent.status === 'SUSPENDED';

            return (
              <div
                key={agent.id}
                onClick={() => onSelectAgent && onSelectAgent(agent.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-indigo-500/20'
                    : isSuspended
                    ? 'bg-rose-50/40 border-rose-200/70 hover:border-rose-300'
                    : 'bg-slate-50/60 border-slate-200/70 hover:bg-white hover:border-slate-300'
                }`}
              >
                {/* Header with Official SVG Logo */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlatformLogo platform={agent.platform} />
                    <div className="min-w-0">
                      <div className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`}>
                        {agent.platform}
                      </div>
                      <div className={`font-bold truncate text-[11px] ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {agent.name}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 shrink-0 ${
                      isSuspended
                        ? 'bg-rose-500 text-white'
                        : isSelected
                        ? 'bg-emerald-400 text-slate-950 font-black'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isSuspended ? <Lock className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                    {agent.status}
                  </span>
                </div>

                {/* Score & Gauge */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>Trust Score</span>
                    <span
                      className={`font-mono font-bold ${
                        agent.trustScore >= 90
                          ? 'text-emerald-500'
                          : agent.trustScore >= 70
                          ? 'text-amber-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {agent.trustScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        agent.trustScore >= 90
                          ? 'bg-emerald-500'
                          : agent.trustScore >= 70
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${agent.trustScore}%` }}
                    />
                  </div>
                </div>

                {/* Accuracy / Limits */}
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/50">
                  <span className={isSelected ? 'text-slate-400' : 'text-slate-400'}>Accuracy: {agent.historicalAccuracy}</span>
                  <span className={isSelected ? 'text-indigo-200 font-medium' : isSuspended ? 'text-rose-600 font-bold' : 'text-slate-600 font-medium'}>
                    {agent.limitStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
