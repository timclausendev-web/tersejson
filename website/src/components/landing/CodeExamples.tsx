'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

const EXAMPLES = {
  express: {
    name: 'Express',
    language: 'javascript',
    code: `import express from 'express'
import { terse } from 'tersejson/express'

const app = express()

// Add TerseJSON middleware
app.use(terse())

app.get('/api/users', (req, res) => {
  // Your response is automatically compressed
  res.json([
    { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
    // ... hundreds more
  ])
})

app.listen(3000)`,
  },
  client: {
    name: 'Client',
    language: 'javascript',
    code: `import { fetch } from 'tersejson/client'

// Drop-in replacement for fetch
const users = await fetch('/api/users').then(r => r.json())

// Access data normally - TerseJSON expands it automatically
console.log(users[0].firstName) // "John"
console.log(users[0].lastName)  // "Doe"

// Works with any framework
// React, Vue, Svelte, vanilla JS...`,
  },
  axios: {
    name: 'Axios',
    language: 'javascript',
    code: `import axios from 'axios'
import { createAxiosInterceptors } from 'tersejson/integrations'

// Create interceptors
const { request, response } = createAxiosInterceptors()

// Add to axios
axios.interceptors.request.use(request)
axios.interceptors.response.use(response)

// Use axios normally
const { data: users } = await axios.get('/api/users')
console.log(users[0].firstName) // "John"`,
  },
  reactQuery: {
    name: 'React Query',
    language: 'javascript',
    code: `import { useQuery } from '@tanstack/react-query'
import { createSWRFetcher } from 'tersejson/integrations'

// Create TerseJSON-enabled fetcher
const terseFetcher = createSWRFetcher()

function Users() {
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => terseFetcher('/api/users')
  })

  return users?.map(user => (
    <div key={user.email}>{user.firstName}</div>
  ))
}`,
  },
  analytics: {
    name: 'Analytics',
    language: 'javascript',
    code: `import { terse } from 'tersejson/express'

app.use(terse({
  analytics: {
    apiKey: 'your-api-key',
    projectId: 'my-api',
    reportToCloud: true
  }
}))

// Or local-only analytics
app.use(terse({
  analytics: true // Local stats only
}))

// View your compression stats at tersejson.com/dashboard`,
  },
}

type ExampleKey = keyof typeof EXAMPLES

export function CodeExamples() {
  const [activeExample, setActiveExample] = useState<ExampleKey>('express')
  const [copied, setCopied] = useState(false)

  const example = EXAMPLES[activeExample]

  async function copyCode() {
    await navigator.clipboard.writeText(example.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Easy Integration
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Get started in minutes with our pre-built integrations for popular frameworks.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Tab buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {Object.entries(EXAMPLES).map(([key, ex]) => (
              <button
                key={key}
                onClick={() => setActiveExample(key as ExampleKey)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeExample === key
                    ? 'bg-primary-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {ex.name}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-sm text-zinc-500">{example.name}</span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-sm text-zinc-300 overflow-x-auto bg-transparent">
              <code>{example.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
