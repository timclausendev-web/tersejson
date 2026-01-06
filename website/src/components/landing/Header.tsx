'use client'

import Link from 'next/link'
import { Github, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { isPaidFeaturesEnabled } from '@/lib/feature-flags'

export function Header() {
  const showPricing = isPaidFeaturesEnabled()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">TJ</span>
              </div>
              <span className="font-semibold text-lg">TerseJSON</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#tester" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Try It
              </a>
              <Link href="/docs" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Docs
              </Link>
              {showPricing && (
                <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              )}
              <a
                href="https://github.com/timclausendev-web/tersejson"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/tersejson"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Package className="h-4 w-4" />
                npm
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
