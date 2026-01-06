'use client'

import { useEffect, useState } from 'react'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Project {
  _id: string
  name: string
  apiKey: string
  createdAt: string
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newProjectName.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName }),
      })
      const data = await res.json()
      if (data.project) {
        setProjects([data.project, ...projects])
        setShowCreateModal(false)
        setNewProjectName('')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setCreating(false)
    }
  }

  async function deleteProject(id: string) {
    if (!confirm('Are you sure you want to delete this project? All analytics data will be lost.')) {
      return
    }

    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      setProjects(projects.filter((p) => p._id !== id))
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  async function regenerateApiKey(id: string) {
    if (!confirm('Are you sure you want to regenerate the API key? The old key will stop working immediately.')) {
      return
    }

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateApiKey: true }),
      })
      const data = await res.json()
      if (data.project) {
        setProjects(projects.map((p) => (p._id === id ? data.project : p)))
      }
    } catch (error) {
      console.error('Failed to regenerate API key:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-zinc-400">Manage your TerseJSON projects</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center bg-zinc-900/50 rounded-xl border border-zinc-800">
          <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <Plus className="h-8 w-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
          <p className="text-zinc-400 mb-6 max-w-sm">
            Create your first project to get an API key for tracking analytics.
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onDelete={deleteProject}
              onRegenerateKey={regenerateApiKey}
            />
          ))}
        </div>
      )}

      {/* Create project modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-md p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Create New Project</h2>
              <form onSubmit={createProject}>
                <div className="mb-6">
                  <label htmlFor="projectName" className="block text-sm font-medium text-zinc-300 mb-2">
                    Project Name
                  </label>
                  <input
                    id="projectName"
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My API"
                    required
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Project'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
