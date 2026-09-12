'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ShieldCheck,
  Bot,
  User,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface TimelineStep {
  step: number;
  time: string; // e.g. "10:32:01"
  timestamp: string; // ISO
  title: string; // e.g. "Agent requested ₹1,299"
  action: string;
  actor: string;
  actorType?: 'AGENT' | 'SYSTEM' | 'GATEWAY' | 'USER' | 'SUPERVISOR' | string;
  status: 'PASSED' | 'FAILED' | 'WARNING' | 'INFO';
  latency?: string; // e.g. "+14ms"
  details: string;
}

interface AuditTimelineProps {
  transactionId?: string;
  timeline: TimelineStep[];
  decision?: string;
  amountInr?: string;
  merchant?: string;
  compact?: boolean;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  transactionId,
  timeline,
  decision,
  amountInr,
  merchant,
  compact = false,
}) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const toggleExpand = (stepNumber: number) => {
    setExpandedStep(expandedStep === stepNumber ? null : stepNumber);
  };

  const getActorIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'AGENT':
        return <Bot className="w-3.5 h-3.5 text-indigo-400" />;
      case 'GATEWAY':
        return <CreditCard className="w-3.5 h-3.5 text-violet-400" />;
      case 'USER':
      case 'SUPERVISOR':
        return <User className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> PASSED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
            <XCircle className="w-3 h-3" /> FAILED
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> REVIEW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar if provided */}
      {(transactionId || decision) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>TRANSACTION AUDIT TIMELINE</span>
            </div>
            {transactionId && (
              <span className="text-slate-500 truncate max-w-[180px]">
                {transactionId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {amountInr && (
              <span className="font-bold text-slate-200">
                ₹{amountInr} {merchant ? `at ${merchant}` : ''}
              </span>
            )}
            {decision && (
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  decision === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : decision === 'BLOCKED'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {decision}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Chronological Timeline Track */}
      <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {timeline.map((item, idx) => {
          const isExpanded = expandedStep === item.step;
          const isPassed = item.status === 'PASSED';
          const isFailed = item.status === 'FAILED';
          const isWarning = item.status === 'WARNING';

          return (
            <div key={idx} className="relative group">
              {/* Timeline node icon */}
              <div
                className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                  isPassed
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                    : isFailed
                    ? 'bg-red-950 border-red-500 text-red-400'
                    : isWarning
                    ? 'bg-amber-950 border-amber-500 text-amber-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {item.step}
              </div>

              {/* Step Card */}
              <div
                onClick={() => toggleExpand(item.step)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isExpanded
                    ? 'bg-slate-900 border-indigo-500/40 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* Timestamp: exact format "10:32:01 — Agent requested ₹1,299" */}
                    <span className="font-mono font-bold text-xs text-indigo-400 shrink-0">
                      {item.time}
                    </span>
                    <span className="text-slate-600 font-bold">—</span>
                    <span className="text-sm font-semibold text-slate-100">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    {item.latency && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {item.latency}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-800">
                      {getActorIcon(item.actorType)}
                      <span className="truncate max-w-[130px]">{item.actor}</span>
                    </div>

                    {getStatusBadge(item.status)}

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs font-mono animate-in fade-in duration-150">
                    <p className="text-slate-300 leading-relaxed font-sans">
                      {item.details}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-400">
                      <div>
                        <span className="text-slate-600">Action: </span>
                        <span className="text-indigo-300 font-semibold">{item.action}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Actor Type: </span>
                        <span className="text-slate-300">{item.actorType || 'SYSTEM'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Step: </span>
                        <span className="text-slate-300">#{item.step} of 7</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Precise Time: </span>
                        <span className="text-slate-300 truncate">{item.timestamp}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
