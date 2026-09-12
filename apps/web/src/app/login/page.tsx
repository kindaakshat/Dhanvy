'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LeoBrand } from '@/components/LeoBrand';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('demo@trustlayer.dev');
  const [password, setPassword] = useState('DemoPassword123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  React.useEffect(() => {
    router.replace(returnUrl);
  }, [router, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    router.push(returnUrl);
  };

  const handleDemoSignIn = () => {
    setEmail('demo@trustlayer.dev');
    setPassword('DemoPassword123!');
  };

  return (
    <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Sign in to your control plane</h1>
        <p className="text-xs text-slate-400 mt-1">Access autonomous agents, mandates, and payment reliability feeds</p>
      </div>

      <div className="mb-5 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between gap-2 text-xs text-blue-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
          <span>Demo credentials pre-filled. Click <strong>Sign In</strong> to enter.</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
          READY
        </span>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-400 text-xs animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Address */}
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

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider font-mono">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1"
            />
            <span className="text-xs text-slate-400">Remember me for 30 days</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* 1-Click Demo Login Helper */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDemoSignIn}
            className="w-full py-2 px-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Use SecOps Demo Credentials (demo@trustlayer.dev)</span>
          </button>
        </div>
      </form>

      {/* Footer / Signup Link */}
      <div className="mt-6 pt-5 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 sm:mb-8 text-center flex flex-col items-center gap-2 relative z-10">
        <LeoBrand size="lg" theme="dark" href="/" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-800">
          Agentic Commerce Control Plane
        </span>
      </div>

      <Suspense fallback={<div className="text-slate-400 text-xs">Loading login form...</div>}>
        <LoginForm />
      </Suspense>

      {/* Security note */}
      <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-500 font-mono relative z-10">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Enterprise Encrypted Session • SHA-256 Hash Chaining</span>
      </div>
    </div>
  );
}
