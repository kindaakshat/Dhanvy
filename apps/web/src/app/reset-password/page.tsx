'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LeoBrand } from '@/components/LeoBrand';
import { fetchApi } from '@/lib/api';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  KeyRound,
} from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password strength calculation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const strengthScore = [hasMinLength, hasNumber, hasUpper, hasSpecial].filter(Boolean).length;
  const strengthColor =
    strengthScore <= 2
      ? 'bg-rose-500'
      : strengthScore === 3
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Password reset token is missing from the link. Please request a new link.');
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
      const res = await fetchApi<{ success: boolean; message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (res?.success) {
        setSuccess(true);
      } else {
        setError('Failed to reset password.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired password reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
      {!success ? (
        <>
          <div className="mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <KeyRound className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Set a new password</h1>
            <p className="text-xs text-slate-400 mt-1">
              Ensure your new password is at least 8 characters long.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-400 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!token && (
            <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
              Warning: No reset token detected in URL query. Please check your reset link.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                New Password
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

              {/* Password strength meter */}
              {password && (
                <div className="mt-2 space-y-1.5">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 1 ? strengthColor : 'bg-slate-800'}`} />
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 2 ? strengthColor : 'bg-slate-800'}`} />
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 3 ? strengthColor : 'bg-slate-800'}`} />
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 4 ? strengthColor : 'bg-slate-800'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Confirm New Password
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
                  placeholder="Re-enter your new password"
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
                <p className="text-[10px] text-rose-400 mt-1">Passwords do not match.</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating password...</span>
                </>
              ) : (
                <>
                  <span>Update Password</span>
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
            <h2 className="text-lg font-bold text-white">Password Updated!</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Your password has been successfully updated. You can now sign in to your control plane with your new credentials.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span>Sign In to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 sm:mb-8 text-center flex flex-col items-center gap-2 relative z-10">
        <LeoBrand size="lg" theme="dark" href="/" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-800">
          Security Verification
        </span>
      </div>

      <Suspense fallback={<div className="text-slate-400 text-xs">Loading reset form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
