'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { LogOut, CreditCard, User } from 'lucide-react'
import { isPaidFeaturesEnabled } from '@/lib/feature-flags'

export default function SettingsPage() {
  const { data: session } = useSession()
  const showBilling = isPaidFeaturesEnabled()

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400">Manage your account settings</p>
      </div>

      {/* Profile section */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-zinc-700 flex items-center justify-center">
                <span className="text-xl font-medium text-white">
                  {session?.user?.email?.[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-white">{session?.user?.name || 'No name set'}</p>
              <p className="text-sm text-zinc-400">{session?.user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Billing section (hidden by default) */}
      {showBilling && (
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-white">Billing</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
              <div>
                <p className="text-sm text-zinc-400">Current Plan</p>
                <p className="font-medium text-white">Free</p>
              </div>
              <Button variant="secondary" size="sm">
                Upgrade
              </Button>
            </div>

            <p className="text-sm text-zinc-500">
              Upgrade to access advanced analytics, more projects, and longer data retention.
            </p>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="bg-zinc-900/50 rounded-xl border border-red-900/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <LogOut className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Account</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Sign out of your account or delete it permanently.
          </p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
