"use client"

import * as React from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string }

const toastReducer = (state: Toast[], action: ToastAction): Toast[] => {
  switch (action.type) {
    case "ADD_TOAST":
      return [...state, action.toast]
    case "REMOVE_TOAST":
      return state.filter((t) => t.id !== action.id)
    default:
      return state
  }
}

const listeners: Array<(toasts: Toast[]) => void> = []
let memoryState: Toast[] = []

function dispatch(action: ToastAction) {
  memoryState = toastReducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>(memoryState)

  React.useEffect(() => {
    listeners.push(setToasts)
    return () => {
      const index = listeners.indexOf(setToasts)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  const toast = ({ title, description, variant = "default" }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    dispatch({
      type: "ADD_TOAST",
      toast: { id, title, description, variant },
    })

    setTimeout(() => {
      dispatch({ type: "REMOVE_TOAST", id })
    }, 4000)
  }

  return {
    toasts,
    toast,
  }
}
