import { Suspense } from 'react'
import { DashboardShell } from './DashboardShell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
          <div className="w-10 h-10 border-2 border-[#08E1F7]/30 border-t-[#08E1F7] rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  )
}
