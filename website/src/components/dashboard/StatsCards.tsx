'use client'

import { TrendingUp, Database, Zap, BarChart3 } from 'lucide-react'

interface StatsCardsProps {
  stats: {
    totalEvents: number
    totalOriginalBytes: number
    totalCompressedBytes: number
    totalBytesSaved: number
    totalObjects: number
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes.toFixed(0)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

export function StatsCards({ stats }: StatsCardsProps) {
  const compressionRatio = stats.totalOriginalBytes > 0
    ? ((1 - stats.totalCompressedBytes / stats.totalOriginalBytes) * 100).toFixed(1)
    : '0'

  const cards = [
    {
      title: 'Bandwidth Saved',
      value: formatBytes(stats.totalBytesSaved),
      description: 'Total bytes saved',
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-950/30',
      borderColor: 'border-green-800/30',
    },
    {
      title: 'Compression Ratio',
      value: `${compressionRatio}%`,
      description: 'Average savings',
      icon: Zap,
      color: 'text-primary-400',
      bgColor: 'bg-primary-950/30',
      borderColor: 'border-primary-800/30',
    },
    {
      title: 'Total Requests',
      value: formatNumber(stats.totalEvents),
      description: 'Compressed responses',
      icon: BarChart3,
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/30',
      borderColor: 'border-purple-800/30',
    },
    {
      title: 'Objects Processed',
      value: formatNumber(stats.totalObjects),
      description: 'JSON objects compressed',
      icon: Database,
      color: 'text-orange-400',
      bgColor: 'bg-orange-950/30',
      borderColor: 'border-orange-800/30',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className={`p-6 rounded-xl border ${card.borderColor} ${card.bgColor}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <span className="text-sm font-medium text-zinc-400">{card.title}</span>
            </div>
            <div className={`text-3xl font-bold ${card.color} mb-1`}>
              {card.value}
            </div>
            <div className="text-sm text-zinc-500">{card.description}</div>
          </div>
        )
      })}
    </div>
  )
}
