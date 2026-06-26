"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Users, RefreshCw, Layers, Settings, LogOut, Cpu } from "lucide-react"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = React.useState<string | null>(null)

  React.useEffect(() => {
    // Read mock role from cookie
    const cookies = document.cookie.split("; ")
    const tokenCookie = cookies.find((c) => c.startsWith("auth_token="))
    if (tokenCookie) {
      const val = tokenCookie.split("=")[1]
      if (val.includes("ADMIN")) {
        setRole("ADMIN")
      } else if (val.includes("ISSUER")) {
        setRole("ISSUER")
      }
    }
  }, [pathname])

  const handleLogout = () => {
    // Delete cookie and redirect
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
    router.push("/login")
    router.refresh()
  }

  const links = [
    { href: "/investors", label: "Investors", icon: Users },
    { href: "/transfers", label: "Realtime Transfers", icon: RefreshCw },
    { href: "/actions", label: "Operations & Import", icon: Layers },
    { href: "/settings", label: "Compliance & Settings", icon: Settings },
  ]

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/investors" className="flex items-center gap-2 font-bold text-lg bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            <Cpu className="h-5 w-5 text-indigo-400" />
            <span>T-REX Suite</span>
          </Link>
          <nav className="hidden md:flex gap-1">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-slate-900 text-white font-medium shadow-sm border border-slate-800"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {role && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${
              role === "ADMIN" 
                ? "bg-indigo-950/50 border-indigo-800 text-indigo-300"
                : "bg-emerald-950/50 border-emerald-800 text-emerald-300"
            }`}>
              {role}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
