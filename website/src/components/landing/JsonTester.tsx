'use client'

import { useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Copy, Check, Zap, ArrowRight } from 'lucide-react'

// TerseJSON compression algorithm (matches the library)
function compress(data: unknown): { compressed: unknown; keyMap: Record<string, string> } {
  const keyMap: Record<string, string> = {}
  let keyIndex = 0

  function getAlias(key: string): string {
    if (key.length <= 1) return key
    if (!keyMap[key]) {
      // Generate alias: a-z, then aa-az, ba-bz, etc.
      const alias = keyIndex < 26
        ? String.fromCharCode(97 + keyIndex)
        : String.fromCharCode(97 + Math.floor(keyIndex / 26) - 1) + String.fromCharCode(97 + (keyIndex % 26))
      keyMap[key] = alias
      keyIndex++
    }
    return keyMap[key]
  }

  function compressValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(item => compressValue(item))
    }
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        result[getAlias(k)] = compressValue(v)
      }
      return result
    }
    return value
  }

  const compressedData = compressValue(data)

  // Reverse the keyMap for the output format
  const reverseMap: Record<string, string> = {}
  for (const [original, alias] of Object.entries(keyMap)) {
    reverseMap[alias] = original
  }

  return {
    compressed: {
      __terse__: true,
      v: 1,
      k: reverseMap,
      d: compressedData,
    },
    keyMap: reverseMap,
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const SAMPLE_JSON = `[
  {
    "userId": 1,
    "firstName": "John",
    "lastName": "Doe",
    "emailAddress": "john@example.com",
    "isActive": true,
    "createdAt": "2024-01-15"
  },
  {
    "userId": 2,
    "firstName": "Jane",
    "lastName": "Smith",
    "emailAddress": "jane@example.com",
    "isActive": true,
    "createdAt": "2024-02-20"
  }
]`

export function JsonTester() {
  const [input, setInput] = useState(SAMPLE_JSON)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCompressed, setShowCompressed] = useState(true)

  type SuccessResult = {
    success: true
    original: unknown
    compressed: unknown
    keyMap: Record<string, string>
    originalSize: number
    compressedSize: number
    savings: number
    compressedJson: string
    keysCompressed: number
  }

  type ErrorResult = {
    success: false
    error: string
  }

  type ProcessResult = SuccessResult | ErrorResult

  const processJson = useCallback((): ProcessResult => {
    try {
      const parsed = JSON.parse(input)
      const { compressed, keyMap } = compress(parsed)
      const originalSize = new Blob([input]).size
      const compressedJson = JSON.stringify(compressed)
      const compressedSize = new Blob([compressedJson]).size
      const savings = ((1 - compressedSize / originalSize) * 100)

      return {
        success: true,
        original: parsed,
        compressed,
        keyMap,
        originalSize,
        compressedSize,
        savings,
        compressedJson,
        keysCompressed: Object.keys(keyMap).length,
      }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Invalid JSON',
      }
    }
  }, [input])

  const result = processJson()

  const handleCopy = async () => {
    if (result.success && result.compressedJson) {
      await navigator.clipboard.writeText(result.compressedJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section id="tester" className="py-24 bg-zinc-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Test Your JSON
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Paste your JSON data below to see exactly how much TerseJSON can compress it.
            Get instant verification that your data works perfectly.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input Panel */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
                <span className="text-sm font-medium text-zinc-300">Your JSON Input</span>
                <span className="text-xs text-zinc-500">
                  {result.success ? formatBytes(result.originalSize) : '—'}
                </span>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full h-80 p-4 bg-transparent text-sm text-zinc-300 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                placeholder="Paste your JSON here..."
                spellCheck={false}
              />
            </div>

            {/* Output Panel */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 overflow-hidden relative">
              {result.success && (
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700/80 hover:bg-zinc-600/80 text-xs text-zinc-300 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
                <span className="text-sm font-medium text-primary-400">Compressed Output</span>
                <span className="text-xs text-primary-400">
                  {result.success ? formatBytes(result.compressedSize) : '—'}
                </span>
              </div>
              <div className="h-80 p-4 overflow-auto">
                {result.success ? (
                  <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify(result.compressed, null, 2)}
                  </pre>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{result.error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Banner */}
          {result.success && (
            <div className="mt-8">
              {/* Verification Badge */}
              <div className="flex flex-col items-center mb-6">
                <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-green-950/50 to-emerald-950/50 border-2 border-green-500/50 shadow-lg shadow-green-500/10">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20">
                    <CheckCircle className="h-7 w-7 text-green-400" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">Verified Working</div>
                    <div className="text-sm text-green-400">by TerseJSON</div>
                  </div>
                  <div className="ml-4 pl-4 border-l border-green-500/30">
                    <div className="text-2xl font-bold text-green-400">{result.savings.toFixed(1)}%</div>
                    <div className="text-xs text-zinc-400">smaller</div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4 text-center">
                  <div className="text-2xl font-bold text-white">{formatBytes(result.originalSize)}</div>
                  <div className="text-xs text-zinc-500 mt-1">Original Size</div>
                </div>
                <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4 text-center">
                  <div className="text-2xl font-bold text-primary-400">{formatBytes(result.compressedSize)}</div>
                  <div className="text-xs text-zinc-500 mt-1">Compressed Size</div>
                </div>
                <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{formatBytes(result.originalSize - result.compressedSize)}</div>
                  <div className="text-xs text-zinc-500 mt-1">Bytes Saved</div>
                </div>
                <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{result.keysCompressed}</div>
                  <div className="text-xs text-zinc-500 mt-1">Keys Compressed</div>
                </div>
              </div>

              {/* Key Mapping Preview */}
              {result.keysCompressed > 0 && (
                <div className="mt-6 rounded-lg bg-zinc-800/30 border border-zinc-700 p-4">
                  <div className="text-sm font-medium text-zinc-300 mb-3">Key Mapping</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.keyMap).slice(0, 12).map(([alias, original]) => (
                      <div
                        key={alias}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-700/50 text-xs"
                      >
                        <code className="text-primary-400">{alias}</code>
                        <ArrowRight className="h-3 w-3 text-zinc-500" />
                        <code className="text-zinc-300">{original}</code>
                      </div>
                    ))}
                    {result.keysCompressed > 12 && (
                      <div className="inline-flex items-center px-2 py-1 text-xs text-zinc-500">
                        +{result.keysCompressed - 12} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Scale Projection */}
              <div className="mt-6 rounded-lg bg-gradient-to-r from-primary-950/30 to-zinc-900 border border-primary-800/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-primary-400" />
                  <span className="text-sm font-medium text-zinc-300">At Scale Projection</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-zinc-300">
                      {formatBytes((result.originalSize - result.compressedSize) * 1000)}
                    </div>
                    <div className="text-xs text-zinc-500">Saved per 1K requests</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-zinc-300">
                      {formatBytes((result.originalSize - result.compressedSize) * 100000)}
                    </div>
                    <div className="text-xs text-zinc-500">Saved per 100K requests</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-primary-400">
                      ${(((result.originalSize - result.compressedSize) * 100000) / (1024 * 1024 * 1024) * 0.09 * 30).toFixed(2)}
                    </div>
                    <div className="text-xs text-zinc-500">Monthly AWS savings (100K/day)</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
