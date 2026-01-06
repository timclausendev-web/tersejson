import type { Metadata } from 'next'
import { RybbitAnalytics } from '@/components/RybbitAnalytics'
import './globals.css'

export const metadata: Metadata = {
  title: 'TerseJSON - Transparent JSON Key Compression',
  description: 'Reduce API bandwidth by up to 80% with zero code changes. TerseJSON automatically compresses JSON keys for Express APIs.',
  keywords: ['JSON', 'compression', 'API', 'bandwidth', 'Express', 'optimization'],
  authors: [{ name: 'Tim Carter' }],
  openGraph: {
    title: 'TerseJSON - Transparent JSON Key Compression',
    description: 'Reduce API bandwidth by up to 80% with zero code changes.',
    url: 'https://tersejson.com',
    siteName: 'TerseJSON',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TerseJSON - Transparent JSON Key Compression',
    description: 'Reduce API bandwidth by up to 80% with zero code changes.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        {children}
        <RybbitAnalytics />
      </body>
    </html>
  )
}
