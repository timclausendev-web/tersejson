import { Zap, Shield, Code2, BarChart3, Globe, Boxes } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'Zero Code Changes',
    description: 'Drop-in middleware and client wrapper. Your existing code works unchanged.',
  },
  {
    icon: Shield,
    title: 'Transparent Proxies',
    description: 'Client-side proxies let you access data with original keys. No expansion needed.',
  },
  {
    icon: Code2,
    title: 'TypeScript Ready',
    description: 'Full TypeScript support with generics. Type safety throughout.',
  },
  {
    icon: BarChart3,
    title: 'Built-in Analytics',
    description: 'Track compression stats, bandwidth savings, and per-endpoint performance.',
  },
  {
    icon: Globe,
    title: 'Framework Agnostic',
    description: 'Works with Express, Axios, React Query, SWR, Angular, jQuery, and more.',
  },
  {
    icon: Boxes,
    title: 'Flexible Patterns',
    description: 'Choose from 5 key patterns or create custom generators. Deep nested support.',
  },
]

export function Features() {
  return (
    <section className="py-24 bg-zinc-900/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Why TerseJSON?
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Built for production. Designed for developers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group p-6 rounded-xl bg-zinc-800/30 border border-zinc-800 hover:border-primary-800/50 transition-all hover:bg-zinc-800/50"
              >
                <div className="h-12 w-12 rounded-lg bg-primary-950/50 border border-primary-800/30 flex items-center justify-center mb-4 group-hover:bg-primary-900/30 transition-colors">
                  <Icon className="h-6 w-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-400">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
