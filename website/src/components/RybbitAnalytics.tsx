'use client'

import Script from 'next/script'

export function RybbitAnalytics() {
  const siteId = process.env.NEXT_PUBLIC_RYBBIT_SITE_ID
  const rybbitUrl = process.env.NEXT_PUBLIC_RYBBIT_URL

  if (!siteId || !rybbitUrl) {
    return null
  }

  return (
    <Script
      src={`${rybbitUrl}/api/script.js`}
      data-site-id={siteId}
      strategy="afterInteractive"
    />
  )
}
