import { Header } from '@/components/landing/Header'
import { Footer } from '@/components/landing/Footer'
import Link from 'next/link'
import { ArrowRight, Package, Server, Globe, BarChart3 } from 'lucide-react'

const sections = [
  {
    title: 'Getting Started',
    icon: Package,
    items: [
      { title: 'Installation', href: '#installation' },
      { title: 'Quick Start', href: '#quick-start' },
      { title: 'How It Works', href: '#how-it-works' },
    ],
  },
  {
    title: 'Server Setup',
    icon: Server,
    items: [
      { title: 'Express Middleware', href: '#express' },
      { title: 'Configuration Options', href: '#configuration' },
      { title: 'Key Patterns', href: '#key-patterns' },
    ],
  },
  {
    title: 'Client Setup',
    icon: Globe,
    items: [
      { title: 'Fetch Wrapper', href: '#fetch' },
      { title: 'Axios Integration', href: '#axios' },
      { title: 'React Query / SWR', href: '#react-query' },
    ],
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    items: [
      { title: 'Enabling Analytics', href: '#analytics' },
      { title: 'Dashboard Setup', href: '#dashboard' },
      { title: 'API Reference', href: '#api' },
    ],
  },
]

export default function DocsPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-white mb-4">Documentation</h1>
            <p className="text-lg text-zinc-400 mb-12">
              Everything you need to integrate TerseJSON into your application.
            </p>

            {/* Quick links */}
            <div className="grid sm:grid-cols-2 gap-4 mb-16">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <div
                    key={section.title}
                    className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-lg bg-primary-950/50 border border-primary-800/30 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                    </div>
                    <ul className="space-y-2">
                      {section.items.map((item) => (
                        <li key={item.title}>
                          <a
                            href={item.href}
                            className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                          >
                            <ArrowRight className="h-3 w-3" />
                            {item.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>

            {/* Installation */}
            <section id="installation" className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-4">Installation</h2>
              <p className="text-zinc-400 mb-4">
                Install TerseJSON from npm:
              </p>
              <pre className="bg-zinc-900 rounded-lg p-4 mb-4">
                <code className="text-sm text-zinc-300">npm install tersejson</code>
              </pre>
            </section>

            {/* Quick Start */}
            <section id="quick-start" className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-4">Quick Start</h2>

              <h3 className="text-lg font-semibold text-white mb-3">1. Add the Express middleware</h3>
              <pre className="bg-zinc-900 rounded-lg p-4 mb-6 overflow-x-auto">
                <code className="text-sm text-zinc-300">{`import express from 'express'
import { terse } from 'tersejson/express'

const app = express()

// Add TerseJSON middleware
app.use(terse())

app.get('/api/users', (req, res) => {
  res.json([
    { firstName: 'John', lastName: 'Doe' },
    { firstName: 'Jane', lastName: 'Smith' },
  ])
})

app.listen(3000)`}</code>
              </pre>

              <h3 className="text-lg font-semibold text-white mb-3">2. Use the client wrapper</h3>
              <pre className="bg-zinc-900 rounded-lg p-4 mb-6 overflow-x-auto">
                <code className="text-sm text-zinc-300">{`import { fetch } from 'tersejson/client'

// Drop-in replacement for fetch
const users = await fetch('/api/users').then(r => r.json())

// Access data normally
console.log(users[0].firstName) // "John"`}</code>
              </pre>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-zinc-400 mb-4">
                TerseJSON compresses repetitive JSON keys in API responses:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-zinc-400 mb-6">
                <li>Server middleware intercepts JSON responses</li>
                <li>Arrays of objects have their keys compressed to short aliases</li>
                <li>A key mapping is sent with the response</li>
                <li>Client wrapper transparently expands data using JavaScript Proxies</li>
                <li>Your code continues to access original key names</li>
              </ol>
              <p className="text-zinc-400">
                This process is completely transparent - no changes needed to your business logic.
              </p>
            </section>

            {/* Express Configuration */}
            <section id="configuration" className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-4">Configuration Options</h2>
              <pre className="bg-zinc-900 rounded-lg p-4 overflow-x-auto">
                <code className="text-sm text-zinc-300">{`app.use(terse({
  // Only compress arrays with 2+ items (default: 2)
  minArrayLength: 2,

  // Only compress keys with 3+ characters (default: 3)
  minKeyLength: 3,

  // Max nesting depth to traverse (default: 10)
  maxDepth: 10,

  // Key pattern: 'alpha' | 'numeric' | 'short' | 'prefixed'
  keyPattern: 'alpha',

  // Skip compression for specific routes
  shouldCompress: (req) => !req.path.includes('/graphql'),

  // Enable analytics
  analytics: {
    apiKey: 'your-api-key',
    projectId: 'my-api',
    reportToCloud: true
  }
}))`}</code>
              </pre>
            </section>

            {/* More sections would go here */}

            <div className="mt-16 pt-8 border-t border-zinc-800">
              <p className="text-zinc-500 text-sm">
                For the complete API reference, visit the{' '}
                <a
                  href="https://github.com/timclausendev-web/tersejson"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300"
                >
                  GitHub repository
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
