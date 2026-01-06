import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SessionProvider } from 'next-auth/react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <SessionProvider session={session}>
      <DashboardLayout>{children}</DashboardLayout>
    </SessionProvider>
  )
}
