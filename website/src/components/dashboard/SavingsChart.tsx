'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DailyData {
  date: string
  events: number
  originalBytes: number
  compressedBytes: number
  bytesSaved: number
  objects: number
}

interface SavingsChartProps {
  data: DailyData[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes.toFixed(0)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function SavingsChart({ data }: SavingsChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      savedMB: d.bytesSaved / (1024 * 1024),
    }))
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-zinc-500">
        No data available for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2aa5ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2aa5ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#71717a"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatBytes(value * 1024 * 1024)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          labelStyle={{ color: '#fafafa', fontWeight: 500 }}
          itemStyle={{ color: '#2aa5ff' }}
          formatter={(value) => [formatBytes((value as number) * 1024 * 1024), 'Saved']}
        />
        <Area
          type="monotone"
          dataKey="savedMB"
          stroke="#2aa5ff"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorSaved)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
