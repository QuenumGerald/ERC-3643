import { Navigation } from "@/components/navigation"
import { Toaster } from "@/components/ui/toast"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navigation />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
