'use client'

import { ArrowRight, Zap, Github, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/hero/hero-1.webp)' }}
      />
      <div className="absolute inset-0 bg-zinc-950/80" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary-950/20 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-950/50 border border-primary-800/50 text-primary-400 text-sm mb-8">
            <Zap className="h-4 w-4" />
            <span>Reduce API bandwidth by up to 80%</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="text-white">Transparent JSON</span>
            <br />
            <span className="gradient-text">Key Compression</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            TerseJSON automatically compresses repetitive JSON keys in your API responses.
            Zero code changes required. Works with Express, Axios, React Query, and more.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" className="group">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/timclausendev-web/tersejson"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" size="lg">
                  <Github className="mr-2 h-5 w-5" />
                  View on GitHub
                </Button>
              </a>
            </div>
          </div>

          {/* Install command */}
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
            <Package className="h-5 w-5 text-zinc-500" />
            <code className="text-sm text-zinc-300">npm install tersejson</code>
            <button
              onClick={() => navigator.clipboard.writeText('npm install tersejson')}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {[
            { value: '80%', label: 'Bandwidth Savings' },
            { value: '0', label: 'Code Changes' },
            { value: '< 1ms', label: 'Overhead' },
            { value: '6+', label: 'Framework Integrations' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-sm text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
