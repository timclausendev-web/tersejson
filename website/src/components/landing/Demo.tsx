'use client'

import { useState, useMemo } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Sample data presets
const PRESETS = {
  users: {
    name: 'User List',
    data: [
      { firstName: 'John', lastName: 'Doe', emailAddress: 'john@example.com', phoneNumber: '+1-555-0101', createdAt: '2024-01-15', updatedAt: '2024-03-20' },
      { firstName: 'Jane', lastName: 'Smith', emailAddress: 'jane@example.com', phoneNumber: '+1-555-0102', createdAt: '2024-02-20', updatedAt: '2024-03-18' },
      { firstName: 'Bob', lastName: 'Wilson', emailAddress: 'bob@example.com', phoneNumber: '+1-555-0103', createdAt: '2024-03-01', updatedAt: '2024-03-21' },
    ],
  },
  products: {
    name: 'Product Catalog',
    data: [
      { productName: 'Wireless Headphones', productDescription: 'High-quality audio', productPrice: 199.99, stockQuantity: 150, categoryName: 'Electronics' },
      { productName: 'Laptop Stand', productDescription: 'Ergonomic design', productPrice: 79.99, stockQuantity: 300, categoryName: 'Accessories' },
      { productName: 'USB-C Hub', productDescription: 'Multi-port adapter', productPrice: 49.99, stockQuantity: 500, categoryName: 'Electronics' },
    ],
  },
  logs: {
    name: 'Log Entries',
    data: [
      { timestamp: '2024-03-21T10:30:00Z', logLevel: 'INFO', serviceName: 'api-gateway', messageContent: 'Request processed', requestId: 'req-123' },
      { timestamp: '2024-03-21T10:30:01Z', logLevel: 'DEBUG', serviceName: 'auth-service', messageContent: 'Token validated', requestId: 'req-124' },
      { timestamp: '2024-03-21T10:30:02Z', logLevel: 'ERROR', serviceName: 'database', messageContent: 'Connection timeout', requestId: 'req-125' },
    ],
  },
}

// Simulate TerseJSON compression
function compress(data: object[]) {
  const keys = [...new Set(data.flatMap(obj => Object.keys(obj)))]
  const keyMap: Record<string, string> = {}

  keys.forEach((key, i) => {
    if (key.length > 1) {
      keyMap[String.fromCharCode(97 + i)] = key
    }
  })

  const reverseMap = Object.fromEntries(
    Object.entries(keyMap).map(([k, v]) => [v, k])
  )

  const compressedData = data.map(obj => {
    const newObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      newObj[reverseMap[key] || key] = value
    }
    return newObj
  })

  return {
    __terse__: true,
    v: 1,
    k: keyMap,
    d: compressedData,
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function Demo() {
  const [activePreset, setActivePreset] = useState<keyof typeof PRESETS>('users')
  const [showCompressed, setShowCompressed] = useState(false)

  const data = PRESETS[activePreset].data
  const compressed = useMemo(() => compress(data), [data])

  const originalJson = JSON.stringify(data, null, 2)
  const compressedJson = JSON.stringify(compressed, null, 2)

  const originalSize = new Blob([JSON.stringify(data)]).size
  const compressedSize = new Blob([JSON.stringify(compressed)]).size
  const savings = Math.round((1 - compressedSize / originalSize) * 100)

  return (
    <section id="demo" className="py-24 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            See It In Action
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Watch how TerseJSON transforms your API responses in real-time.
            Try different data types to see the compression in action.
          </p>
        </div>

        {/* Preset selector */}
        <div className="flex justify-center gap-3 mb-8">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setActivePreset(key as keyof typeof PRESETS)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activePreset === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Code comparison */}
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Original */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-sm text-zinc-500">Original Response</span>
              <span className="text-sm font-mono text-zinc-400">{formatBytes(originalSize)}</span>
            </div>
            <pre className="p-4 text-sm text-zinc-300 overflow-auto max-h-96 bg-transparent">
              <code>{originalJson}</code>
            </pre>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2 z-10">
            <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/25">
              <ArrowRight className="h-6 w-6 text-white" />
            </div>
          </div>

          {/* Compressed */}
          <div className="rounded-xl border border-primary-800/50 bg-zinc-900/50 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary-800/50 bg-zinc-900 relative">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary-500/80" />
                <div className="h-3 w-3 rounded-full bg-primary-400/80" />
                <div className="h-3 w-3 rounded-full bg-primary-300/80" />
              </div>
              <span className="text-sm text-primary-400">Compressed Response</span>
              <span className="text-sm font-mono text-primary-400">{formatBytes(compressedSize)}</span>
            </div>
            <pre className="p-4 text-sm text-zinc-300 overflow-auto max-h-96 bg-transparent relative">
              <code>{compressedJson}</code>
            </pre>
          </div>
        </div>

        {/* Savings banner */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-xl bg-gradient-to-r from-primary-950/50 to-primary-900/30 border border-primary-800/50">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-zinc-300">
                Saved <span className="font-bold text-white">{formatBytes(originalSize - compressedSize)}</span>
              </span>
            </div>
            <div className="h-6 w-px bg-zinc-700" />
            <div className="text-2xl font-bold text-primary-400">{savings}% smaller</div>
            <div className="h-6 w-px bg-zinc-700" />
            <span className="text-zinc-400">with just {data.length} items</span>
          </div>
        </div>
      </div>
    </section>
  )
}
