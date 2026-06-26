"use client"

import * as React from "react"
import { useToast } from "./use-toast"
import { X, AlertTriangle, CheckCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts, toast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-70 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => {
        let bgColor = "bg-slate-900 border-slate-800 text-white"
        let Icon = Info

        if (t.variant === "destructive") {
          bgColor = "bg-red-950 border-red-900 text-red-100"
          Icon = AlertTriangle
        } else if (t.variant === "success") {
          bgColor = "bg-green-950 border-green-900 text-green-100"
          Icon = CheckCircle
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-5 ${bgColor}`}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              {t.title && <h4 className="font-semibold text-sm">{t.title}</h4>}
              {t.description && (
                <p className="text-xs mt-1 opacity-90 leading-normal">
                  {t.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
