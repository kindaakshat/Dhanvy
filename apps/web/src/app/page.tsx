'use client';

import React from 'react';
import { LiquidNav } from '@/components/landing/LiquidNav';
import { LiquidHero } from '@/components/landing/LiquidHero';
import { LiquidFooter } from '@/components/landing/LiquidFooter';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#faf8fd] text-slate-900 selection:bg-purple-600 selection:text-white flex flex-col font-sans">
      {/* 1. Liquid Glass Top Navigation */}
      <LiquidNav />

      {/* 2. Hero Section Alone (Liquid Glass Aesthetic) */}
      <main className="flex-1">
        <LiquidHero />
      </main>

      {/* 3. Liquid Glass Footer */}
      <LiquidFooter />
    </div>
  );
}
