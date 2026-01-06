'use client'

import { useState, useMemo } from 'react'
import { Wifi, Signal, DollarSign, Cloud } from 'lucide-react'

// Connection speeds in Mbps
const CONNECTIONS = {
  '3g': { name: '3G', speed: 1.5, icon: Signal },
  '4g': { name: '4G LTE', speed: 20, icon: Signal },
  '5g': { name: '5G', speed: 100, icon: Signal },
  'wifi': { name: 'WiFi', speed: 50, icon: Wifi },
}

// Cloud provider bandwidth pricing ($/GB)
const CLOUD_PROVIDERS = {
  aws: { name: 'AWS', pricePerGB: 0.09, color: 'text-orange-400' },
  gcp: { name: 'Google Cloud', pricePerGB: 0.12, color: 'text-blue-400' },
  azure: { name: 'Azure', pricePerGB: 0.087, color: 'text-cyan-400' },
  vercel: { name: 'Vercel', pricePerGB: 0.15, color: 'text-white' },
}

type ConnectionType = keyof typeof CONNECTIONS
type CloudProvider = keyof typeof CLOUD_PROVIDERS

export function SavingsCalculator() {
  const [requestsPerDay, setRequestsPerDay] = useState(10000)
  const [avgResponseSize, setAvgResponseSize] = useState(50) // KB
  const [compressionRatio] = useState(0.65) // 65% savings
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>('aws')

  const calculations = useMemo(() => {
    const originalBytesPerDay = requestsPerDay * avgResponseSize * 1024
    const compressedBytesPerDay = originalBytesPerDay * (1 - compressionRatio)
    const savedBytesPerDay = originalBytesPerDay - compressedBytesPerDay
    const savedBytesPerMonth = savedBytesPerDay * 30
    const savedGBPerMonth = savedBytesPerMonth / (1024 * 1024 * 1024)

    // Cost calculations
    const pricePerGB = CLOUD_PROVIDERS[cloudProvider].pricePerGB
    const monthlyCostSavings = savedGBPerMonth * pricePerGB
    const yearlyCostSavings = monthlyCostSavings * 12

    const results: Record<ConnectionType, { original: number; compressed: number; saved: number }> = {} as Record<ConnectionType, { original: number; compressed: number; saved: number }>

    for (const [key, conn] of Object.entries(CONNECTIONS)) {
      const speedBps = conn.speed * 1000000 / 8 // Convert Mbps to bytes per second
      results[key as ConnectionType] = {
        original: originalBytesPerDay / speedBps,
        compressed: compressedBytesPerDay / speedBps,
        saved: savedBytesPerDay / speedBps,
      }
    }

    return {
      originalBytesPerDay,
      compressedBytesPerDay,
      savedBytesPerDay,
      savedPerMonth: savedBytesPerMonth,
      savedGBPerMonth,
      monthlyCostSavings,
      yearlyCostSavings,
      connectionTimes: results,
    }
  }, [requestsPerDay, avgResponseSize, compressionRatio, cloudProvider])

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes.toFixed(0)} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  function formatTime(seconds: number): string {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`
    return `${(seconds / 3600).toFixed(1)} hrs`
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }

  function formatCurrency(amount: number): string {
    if (amount < 1) return `$${amount.toFixed(2)}`
    if (amount < 1000) return `$${amount.toFixed(0)}`
    if (amount < 10000) return `$${(amount / 1000).toFixed(1)}K`
    return `$${(amount / 1000).toFixed(0)}K`
  }

  return (
    <section className="py-24 bg-zinc-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Calculate Your Savings
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            See how much bandwidth, time, and money you can save based on your API traffic.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Sliders */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Requests per day */}
            <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
              <label className="block text-sm font-medium text-zinc-300 mb-4">
                Requests per day
              </label>
              <input
                type="range"
                min="100"
                max="1000000"
                step="100"
                value={requestsPerDay}
                onChange={(e) => setRequestsPerDay(Number(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="mt-3 text-2xl font-bold text-white">
                {formatNumber(requestsPerDay)} requests
              </div>
            </div>

            {/* Avg response size */}
            <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
              <label className="block text-sm font-medium text-zinc-300 mb-4">
                Average response size
              </label>
              <input
                type="range"
                min="1"
                max="500"
                step="1"
                value={avgResponseSize}
                onChange={(e) => setAvgResponseSize(Number(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="mt-3 text-2xl font-bold text-white">
                {avgResponseSize} KB
              </div>
            </div>
          </div>

          {/* Cloud Provider Selector */}
          <div className="flex justify-center gap-2 mb-8">
            {Object.entries(CLOUD_PROVIDERS).map(([key, provider]) => (
              <button
                key={key}
                onClick={() => setCloudProvider(key as CloudProvider)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  cloudProvider === key
                    ? 'bg-primary-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                <Cloud className="h-4 w-4" />
                {provider.name}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <div className="bg-gradient-to-br from-primary-950/50 to-zinc-900 rounded-xl p-6 border border-primary-800/30">
              <div className="text-sm text-zinc-400 mb-2">Daily Bandwidth Saved</div>
              <div className="text-2xl font-bold text-primary-400">
                {formatBytes(calculations.savedBytesPerDay)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-950/50 to-zinc-900 rounded-xl p-6 border border-blue-800/30">
              <div className="text-sm text-zinc-400 mb-2">Monthly Savings</div>
              <div className="text-2xl font-bold text-blue-400">
                {formatBytes(calculations.savedPerMonth)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-950/50 to-zinc-900 rounded-xl p-6 border border-green-800/30">
              <div className="flex items-center gap-1 text-sm text-zinc-400 mb-2">
                <DollarSign className="h-3.5 w-3.5" />
                Monthly Cost Saved
              </div>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(calculations.monthlyCostSavings)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                at ${CLOUD_PROVIDERS[cloudProvider].pricePerGB}/GB
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-950/50 to-zinc-900 rounded-xl p-6 border border-yellow-800/30">
              <div className="flex items-center gap-1 text-sm text-zinc-400 mb-2">
                <DollarSign className="h-3.5 w-3.5" />
                Yearly Cost Saved
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                {formatCurrency(calculations.yearlyCostSavings)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {CLOUD_PROVIDERS[cloudProvider].name} egress fees
              </div>
            </div>
          </div>

          {/* Cost breakdown callout */}
          {calculations.yearlyCostSavings > 100 && (
            <div className="mb-12 p-6 rounded-xl bg-gradient-to-r from-green-950/30 to-emerald-950/30 border border-green-800/30">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Save {formatCurrency(calculations.yearlyCostSavings)} per year on {CLOUD_PROVIDERS[cloudProvider].name}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Based on {formatBytes(calculations.savedPerMonth)}/month bandwidth reduction at ${CLOUD_PROVIDERS[cloudProvider].pricePerGB}/GB
                  </p>
                </div>
                <div className="text-4xl font-bold text-green-400">
                  {formatCurrency(calculations.yearlyCostSavings)}
                  <span className="text-lg text-zinc-500">/year</span>
                </div>
              </div>
            </div>
          )}

          {/* Connection comparison */}
          <div className="bg-zinc-800/30 rounded-xl p-6 border border-zinc-700">
            <h3 className="text-lg font-semibold text-white mb-6">
              Loading Time by Connection
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(CONNECTIONS).map(([key, conn]) => {
                const times = calculations.connectionTimes[key as ConnectionType]
                const Icon = conn.icon
                return (
                  <div key={key} className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-medium text-zinc-300">{conn.name}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">Before</span>
                        <span className="text-sm text-zinc-400">{formatTime(times.original / requestsPerDay)}/req</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">After</span>
                        <span className="text-sm text-primary-400 font-medium">{formatTime(times.compressed / requestsPerDay)}/req</span>
                      </div>
                      <div className="pt-2 border-t border-zinc-800">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-green-400">Saved/day</span>
                          <span className="text-sm text-green-400 font-bold">{formatTime(times.saved)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
