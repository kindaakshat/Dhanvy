'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Terminal, Copy, Check, ArrowRight, Code2 } from 'lucide-react';

export function DeveloperSection() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');

  const requestCode = `{
  "agent": "shopping-agent",
  "merchant": "Amazon",
  "amount": 399900,
  "currency": "INR",
  "idempotencyKey": "idemp_leo_8841b9",
  "userIntentPrompt": "Buy Logitech keyboard under ₹5,000"
}`;

  const responseCode = `{
  "success": true,
  "data": {
    "decision": "APPROVED",
    "riskScore": 5,
    "decisionReasons": [
      "ALL_POLICIES_SATISFIED"
    ],
    "checks": [
      { "name": "Agent identity", "status": "PASSED" },
      { "name": "Agent capability", "status": "PASSED" },
      { "name": "Mandate bounds", "status": "PASSED" },
      { "name": "Intent alignment", "status": "PASSED" },
      { "name": "Idempotency check", "status": "PASSED" }
    ],
    "razorpayOrder": {
      "orderId": "order_TL_0AF9E83F46DF",
      "amount": 399900,
      "mode": "TEST_MODE"
    }
  }
}`;

  const handleCopy = () => {
    const textToCopy = activeTab === 'request' ? requestCode : responseCode;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="developers" className="w-full bg-slate-950 text-slate-100 rounded-3xl border border-slate-800/90 p-8 md:p-14 shadow-2xl relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Copy & Links */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-medium text-slate-300">
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Developer-First Architecture</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            Give your agents payment capabilities without giving them unrestricted authority.
          </h2>

          <p className="text-base text-slate-400 leading-relaxed max-w-lg">
            LEO sits directly between your autonomous agent and your payment infrastructure. With a single API call, evaluate spend authority before any money moves.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/simulator"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-slate-950 font-semibold text-sm hover:bg-slate-100 transition-all shadow-md"
            >
              <span>Read the developer docs</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium text-sm transition-all"
            >
              <span>API Reference</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Code Window */}
        <div className="lg:col-span-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden font-mono text-xs">
          {/* Top Window Bar */}
          <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              </div>
              <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                <button
                  onClick={() => setActiveTab('request')}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    activeTab === 'request'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  POST /authorize
                </button>
                <button
                  onClick={() => setActiveTab('response')}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    activeTab === 'response'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Response (200 OK)
                </button>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
              title="Copy snippet"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Code Body */}
          <div className="p-5 overflow-x-auto bg-slate-950/80">
            <pre className="text-slate-300 leading-relaxed">
              <code>{activeTab === 'request' ? requestCode : responseCode}</code>
            </pre>
          </div>

          <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
            <span>Deterministic JSON schema</span>
            <span>Live Endpoint: https://dhanvy-api.vercel.app/api/authorize</span>
          </div>
        </div>
      </div>
    </div>
  );
}
