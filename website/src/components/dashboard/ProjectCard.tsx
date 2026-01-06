'use client'

import { useState } from 'react'
import { Copy, Check, MoreVertical, Trash2, RefreshCw, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Project {
  _id: string
  name: string
  apiKey: string
  createdAt: string
}

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
  onRegenerateKey: (id: string) => void
}

export function ProjectCard({ project, onDelete, onRegenerateKey }: ProjectCardProps) {
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  async function copyApiKey() {
    await navigator.clipboard.writeText(project.apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const maskedKey = `${project.apiKey.slice(0, 6)}...${project.apiKey.slice(-4)}`

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{project.name}</h3>
          <p className="text-sm text-zinc-500">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-10 z-20 w-48 bg-zinc-800 rounded-lg border border-zinc-700 shadow-xl py-1">
                <button
                  onClick={() => {
                    onRegenerateKey(project._id)
                    setShowMenu(false)
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate API Key
                </button>
                <button
                  onClick={() => {
                    onDelete(project._id)
                    setShowMenu(false)
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-zinc-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Project
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          API Key
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg text-sm text-zinc-300 font-mono">
            {maskedKey}
          </code>
          <button
            onClick={copyApiKey}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Copy API Key"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Link
        href={`/dashboard/projects/${project._id}`}
        className="inline-flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
      >
        View Analytics
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
