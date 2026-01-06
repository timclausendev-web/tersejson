'use client'

import { useEffect, useState } from 'react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { SavingsChart } from '@/components/dashboard/SavingsChart'
import { EndpointTable } from '@/components/dashboard/EndpointTable'
import { Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface Stats {
  totalEvents: number
  totalOriginalBytes: number
  totalCompressedBytes: number
  totalBytesSaved: number
  totalObjects: number
}

interface DailyData {
  date: string
  events: number
  originalBytes: number
  compressedBytes: number
  bytesSaved: number
  objects: number
}

interface Endpoint {
  endpoint: string
  count: number
  totalSaved: number
}

interface Project {
  _id: string
  name: string
  apiKey: string
  createdAt: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    totalOriginalBytes: 0,
    totalCompressedBytes: 0,
    totalBytesSaved: 0,
    totalObjects: 0,
  })
  const [dailyStats, setDailyStats] = useState<DailyData[]>([])
  const [topEndpoints, setTopEndpoints] = useState<Endpoint[]>([])
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchStats(selectedProject)
    }
  }, [selectedProject, days])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
      if (data.projects?.length > 0) {
        setSelectedProject(data.projects[0]._id)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats(projectId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/stats?days=${days}`)
      const data = await res.json()
      setStats(data.totals || stats)
      setDailyStats(data.dailyStats || [])
      setTopEndpoints(data.topEndpoints || [])
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <Plus className="h-8 w-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
        <p className="text-zinc-400 mb-6 max-w-sm">
          Create your first project to start tracking compression analytics.
        </p>
        <Link href="/dashboard/projects">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">Monitor your compression analytics</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Project selector */}
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>

          {/* Time range selector */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stats cards */}
      <StatsCards stats={stats} />

      {/* Chart */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Bandwidth Saved Over Time</h2>
        <SavingsChart data={dailyStats} />
      </div>

      {/* Top endpoints */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Top Endpoints</h2>
        <EndpointTable endpoints={topEndpoints} />
      </div>
    </div>
  )
}
