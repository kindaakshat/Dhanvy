'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LeoBrand } from '@/components/LeoBrand';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  // Password strength calculation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const strengthScore = [hasMinLength, hasNumber, hasUpper, hasSpecial].filter(Boolean).length;
  const strengthColor =
    strengthScore === 0
      ? 'bg-slate-200'
      : strengthScore <= 2
      ? 'bg-rose-500'
      : strengthScore === 3
      ? 'bg-amber-500'
      : 'bg-emerald-500';
  const strengthText =
    strengthScore === 0
      ? 'Enter a password'
      : strengthScore <= 2
      ? 'Weak password'
      : strengthScore === 3
      ? 'Good password'
      : 'Strong password';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await signup(name.trim(), email.trim(), password);
      if (res.success) {
        router.push('/dashboard');
      } else {
        setError(res.error || 'Failed to create account.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 sm:mb-8 text-center flex flex-col items-center gap-2 relative z-10">
        <LeoBrand size="lg" theme="dark" href="/" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-800">
          Control Plane Security
        </span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Workspace banner callout */}
        <div className="mb-6 p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-left">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create your secure payment workspace</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Protect every agent-initiated payment with mandates, verification, approval and auditability.
          </p>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-white tracking-tight">Create your account</h1>
          <p className="text-xs text-slate-400 mt-1">Get started with autonomous payment governance in seconds</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-400 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
              Work Email Address
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
            <label className="block text-[11px] font-medium text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Strength:</span>
                  <span className="font-semibold text-slate-300">{strengthText}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                  <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 1 ? strengthColor : 'bg-slate-800'}`} />
                  <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 2 ? strengthColor : 'bg-slate-800'}`} />
                  <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 3 ? strengthColor : 'bg-slate-800'}`} />
                  <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 4 ? strengthColor : 'bg-slate-800'}`} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[10px] text-rose-400 mt-1">Passwords do not match yet.</p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Passwords match
              </p>
            )}
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
                <span>Creating workspace...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer / Login Link */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Security note */}
      <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-500 font-mono relative z-10">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>256-bit TLS Encryption & SHA-256 Audit Trail</span>
      </div>
    </div>
  );
}
