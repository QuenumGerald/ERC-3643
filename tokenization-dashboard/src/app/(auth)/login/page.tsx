"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShieldCheck, UserCheck, KeyRound } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("admin@trex.compliance")
  const [password, setPassword] = React.useState("••••••••")
  const [isLoading, setIsLoading] = React.useState(false)

  const handleLogin = (role: "ADMIN" | "ISSUER") => {
    setIsLoading(true)
    setTimeout(() => {
      // Set cookie in browser
      document.cookie = `auth_token=mock-jwt-role-${role}; path=/; max-age=86400; SameSite=Lax`
      router.push("/investors")
      router.refresh()
    }, 800)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden px-4">
      {/* Background gradients for premium aesthetics */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ERC-3643 Engine</h1>
          <p className="text-sm text-slate-400 mt-1">Compliance & Tokenization Dashboard</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleLogin("ADMIN"); }} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-950/50 border-slate-800 text-white focus:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950/50 border-slate-800 text-white focus:border-slate-700"
            />
          </div>

          <div className="pt-2 text-center text-xs text-slate-400">
            Select authentication role to login:
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              onClick={() => handleLogin("ADMIN")}
              disabled={isLoading}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white border-0 flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Button>
            <Button
              type="button"
              onClick={() => handleLogin("ISSUER")}
              disabled={isLoading}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white border-0 flex items-center gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Issuer
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
