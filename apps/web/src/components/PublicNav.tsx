'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LeoBrand } from './LeoBrand';
import { ArrowRight, Menu, X } from 'lucide-react';

export function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-10">
          <LeoBrand size="md" href="/" />

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#product"
              className="hover:text-slate-900 transition-colors"
            >
              Product
            </a>
            <a
              href="#solutions"
              className="hover:text-slate-900 transition-colors"
            >
              Solutions
            </a>
            <a
              href="#developers"
              className="hover:text-slate-900 transition-colors"
            >
              Developers
            </a>
            <a
              href="#security"
              className="hover:text-slate-900 transition-colors"
            >
              Security
            </a>
            <a
              href="#audit"
              className="hover:text-slate-900 transition-colors"
            >
              Resources
            </a>
          </nav>
        </div>

        {/* Right CTAs */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm hover:shadow"
          >
            <span>Get started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:text-slate-900"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-6 py-5 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-700">
            <a
              href="#product"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-slate-900"
            >
              Product
            </a>
            <a
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-slate-900"
            >
              Solutions
            </a>
            <a
              href="#developers"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-slate-900"
            >
              Developers
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-slate-900"
            >
              Security
            </a>
            <a
              href="#audit"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-slate-900"
            >
              Resources
            </a>
          </nav>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              className="text-center py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="text-center py-2.5 rounded-lg text-sm font-medium bg-slate-900 text-white"
            >
              Get started →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
