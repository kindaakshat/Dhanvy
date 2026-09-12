'use client';

import React, { useEffect, useState, useRef } from 'react';

interface MetricItem {
  value: number;
  suffix?: string;
  prefix?: string;
  isString?: string;
  label: string;
  description: string;
}

interface MetricsCounterProps {
  metrics?: MetricItem[];
}

export function MetricsCounter({ metrics }: MetricsCounterProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const defaultMetrics: MetricItem[] = [
    {
      value: 17,
      label: 'Authorization checks',
      description: 'Deterministic policy evaluation steps in each transaction pipeline.',
    },
    {
      value: 9,
      label: 'Attack scenarios',
      description: 'Adversarial agent vectors simulated & neutralized in Attack Lab.',
    },
    {
      value: 100,
      suffix: '%',
      label: 'Current evaluation-set accuracy',
      description: 'Zero false approvals across all verified adversarial test suites.',
    },
    {
      value: 256,
      isString: 'SHA-256',
      label: 'Cryptographic audit chain',
      description: 'Tamper-evident sequential hash linking across every decision.',
    },
  ];

  const items = metrics || defaultMetrics;

  return (
    <div ref={containerRef} className="w-full py-16 border-y border-slate-200 bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-12">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">
              Evaluation Harness Ground Truth
            </span>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Deterministic guarantees, measured rigorously.
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
            Current evaluation harness
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item, index) => (
            <div key={index} className="space-y-2 border-l-2 border-slate-300 pl-5">
              <div className="text-4xl md:text-5xl font-extrabold font-mono-tabular tracking-tight text-slate-900">
                {item.isString ? (
                  item.isString
                ) : (
                  <Counter target={item.value} isVisible={isVisible} suffix={item.suffix} prefix={item.prefix} />
                )}
              </div>
              <div className="text-sm font-bold text-slate-900">{item.label}</div>
              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Counter({
  target,
  isVisible,
  suffix = '',
  prefix = '',
}: {
  target: number;
  isVisible: boolean;
  suffix?: string;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    let start = 0;
    const duration = 1200; // ms
    const stepTime = 25;
    const totalSteps = duration / stepTime;
    const increment = target / totalSteps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isVisible, target]);

  return (
    <span>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}
