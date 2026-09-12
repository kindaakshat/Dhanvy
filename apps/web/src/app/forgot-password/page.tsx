'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LeoBrand } from '@/components/LeoBrand';
import { fetchApi } from '@/lib/api';
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi<{
        success: boolean;
        message: string;
        devResetUrl?: string;
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });

      setSubmitted(true);
      if (res?.devResetUrl) {
        setDevResetUrl(res.devResetUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 sm:mb-8 text-center flex flex-col items-center gap-2 relative z-10">
        <LeoBrand size="lg" theme="dark" href="/" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-800">
          Account Recovery
        </span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        {!submitted ? (
          <>
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <KeyRound className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Reset your password</h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter the email address associated with your account and we will generate a secure reset link.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-400 text-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching reset link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-5 text-center py-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Reset Link Dispatched</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                If an account exists for <span className="text-slate-200 font-semibold">{email}</span>, a cryptographic password reset link has been issued.
              </p>
            </div>

            {/* Development helper link */}
            {devResetUrl && (
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-left">
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold block mb-1">
                  Local Dev Reset Link:
                </span>
                <Link
                  href={devResetUrl}
                  className="text-xs text-blue-300 hover:text-blue-200 flex items-center gap-1.5 underline break-all"
                >
                  <span>Open Reset Password Page</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Back to sign in */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
