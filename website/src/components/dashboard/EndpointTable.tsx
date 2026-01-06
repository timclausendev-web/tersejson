'use client'

interface Endpoint {
  endpoint: string
  count: number
  totalSaved: number
}

interface EndpointTableProps {
  endpoints: Endpoint[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes.toFixed(0)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

export function EndpointTable({ endpoints }: EndpointTableProps) {
  if (endpoints.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        No endpoint data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
              Endpoint
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">
              Requests
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">
              Bandwidth Saved
            </th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((endpoint, index) => (
            <tr
              key={endpoint.endpoint}
              className={`border-b border-zinc-800/50 ${
                index % 2 === 0 ? 'bg-zinc-900/30' : ''
              }`}
            >
              <td className="py-3 px-4">
                <code className="text-sm text-primary-400 bg-primary-950/30 px-2 py-0.5 rounded">
                  {endpoint.endpoint}
                </code>
              </td>
              <td className="py-3 px-4 text-right text-sm text-zinc-300">
                {formatNumber(endpoint.count)}
              </td>
              <td className="py-3 px-4 text-right text-sm text-green-400 font-medium">
                {formatBytes(endpoint.totalSaved)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
