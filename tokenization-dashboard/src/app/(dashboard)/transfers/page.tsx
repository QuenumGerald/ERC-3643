"use client"

import * as React from "react"
import { useToast } from "@/components/ui/use-toast"
import { RefreshCw, ArrowRightLeft, ShieldX, ShieldCheck, Wifi, WifiOff } from "lucide-react"

interface RealtimeEvent {
  id: string
  type: "Transfer" | "ComplianceTransfer" | "TransferRefused"
  from: string
  to: string
  amount: string
  timestamp: string
  status: "SUCCESS" | "REFUSED"
  reason?: string
}

export default function TransfersPage() {
  const { toast } = useToast()
  const [events, setEvents] = React.useState<RealtimeEvent[]>([])
  const [wsStatus, setWsStatus] = React.useState<"CONNECTING" | "CONNECTED" | "DISCONNECTED">("DISCONNECTED")
  const wsRef = React.useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Simulation timer for fallback
  const simulationIntervalRef = React.useRef<NodeJS.Timeout | null>(null)

  // Function to add events
  const addEvent = React.useCallback((newEvent: Omit<RealtimeEvent, "id" | "timestamp">) => {
    const event: RealtimeEvent = {
      ...newEvent,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString()
    }
    
    setEvents((prev) => [event, ...prev].slice(0, 50)) // limit to 50 items

    if (event.type === "TransferRefused" || event.status === "REFUSED") {
      toast({
        title: "Compliance Transfer Refused",
        description: `Refused transfer of ${event.amount} TCT from ${event.from.slice(0, 6)}... to ${event.to.slice(0, 6)}... Reason: ${event.reason || "Identity not verified."}`,
        variant: "destructive"
      })
    }
  }, [toast])

  // Setup WebSocket Connection
  const connectWebSocket = React.useCallback(() => {
    if (typeof window === "undefined") return

    setWsStatus("CONNECTING")
    
    // Resolve ws endpoint (default to ws://localhost:4000 or fallback mock)
    const isDemo = process.env.NEXT_PUBLIC_NODE_ENV === "demo"
    const wsUrl = isDemo
      ? (process.env.NEXT_PUBLIC_WS_URL || "wss://sepolia-indexer.tokenization-suite.com/events")
      : (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/events")
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setWsStatus("CONNECTED")
        console.log("WebSocket connected successfully")
      }

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          addEvent({
            type: parsed.type || "Transfer",
            from: parsed.from || "0x0000000000000000000000000000000000000000",
            to: parsed.to || "0x0000000000000000000000000000000000000000",
            amount: parsed.amount || "0",
            status: parsed.status || "SUCCESS",
            reason: parsed.reason
          })
        } catch (e) {
          console.error("Failed to parse websocket message", e)
        }
      }

      ws.onclose = () => {
        setWsStatus("DISCONNECTED")
        console.warn("WebSocket closed. Attempting reconnect...")
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000)
      }

      ws.onerror = (err) => {
        console.error("WebSocket error", err)
        ws.close()
      }

    } catch (error) {
      setWsStatus("DISCONNECTED")
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000)
    }
  }, [addEvent])

  // Simulation Fallback for demonstrations and robust test environments
  const startEventSimulation = React.useCallback(() => {
    const wallets = [
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      "0x15d34AAf54a67C68101F3096d24822206B223456",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x2B5AD5c4795c026514f8317c7a215E218DcCD6Cf"
    ]

    simulationIntervalRef.current = setInterval(() => {
      const isSuccess = Math.random() > 0.3
      const fromIdx = Math.floor(Math.random() * wallets.length)
      let toIdx = Math.floor(Math.random() * wallets.length)
      while (toIdx === fromIdx) {
        toIdx = Math.floor(Math.random() * wallets.length)
      }

      const from = wallets[fromIdx]
      const to = wallets[toIdx]
      const amount = (Math.floor(Math.random() * 500) + 10).toString()

      if (isSuccess) {
        addEvent({
          type: Math.random() > 0.5 ? "Transfer" : "ComplianceTransfer",
          from,
          to,
          amount,
          status: "SUCCESS"
        })
      } else {
        const reasons = [
          "Identity not verified.",
          "Token paused.",
          "Recipient balance limit exceeded.",
          "Sender's wallet is frozen."
        ]
        addEvent({
          type: "TransferRefused",
          from,
          to,
          amount,
          status: "REFUSED",
          reason: reasons[Math.floor(Math.random() * reasons.length)]
        })
      }
    }, 6000)
  }, [addEvent])

  React.useEffect(() => {
    connectWebSocket()
    startEventSimulation()

    // Load initial mock event list for immediate rendering
    setEvents([
      {
        id: "ev1",
        type: "Transfer",
        from: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        to: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        amount: "250",
        timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
        status: "SUCCESS"
      },
      {
        id: "ev2",
        type: "TransferRefused",
        from: "0x15d34AAf54a67C68101F3096d24822206B223456",
        to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        amount: "1500",
        timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
        status: "REFUSED",
        reason: "Identity not verified."
      },
      {
        id: "ev3",
        type: "ComplianceTransfer",
        from: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        to: "0x2B5AD5c4795c026514f8317c7a215E218DcCD6Cf",
        amount: "400",
        timestamp: new Date(Date.now() - 180000).toLocaleTimeString(),
        status: "SUCCESS"
      }
    ])

    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current)
    }
  }, [connectWebSocket, startEventSimulation])

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Realtime Transfers
          </h1>
          <p className="text-slate-400 mt-1">
            Live monitor block events for token transfers and modular compliance validations.
          </p>
        </div>

        {/* WebSocket Connection Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${
          wsStatus === "CONNECTED"
            ? "bg-green-950/40 border-green-800 text-green-400"
            : wsStatus === "CONNECTING"
            ? "bg-amber-950/40 border-amber-800 text-amber-400 animate-pulse"
            : "bg-red-950/40 border-red-800 text-red-400"
        }`}>
          {wsStatus === "CONNECTED" ? (
            <>
              <Wifi className="h-3.5 w-3.5" />
              WS Active (Simulating Fallback)
            </>
          ) : wsStatus === "CONNECTING" ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              Disconnected (Simulating Local)
            </>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-slate-900/10 border border-slate-900 rounded-xl overflow-hidden backdrop-blur-md">
        
        {/* Header bar */}
        <div className="bg-slate-900/40 p-4 border-b border-slate-900 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-300">Transaction Stream</span>
          <span className="text-xs text-slate-500 italic">Simulating new events every 6s</span>
        </div>

        {/* Stream List */}
        <div className="divide-y divide-slate-900 max-h-[600px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-500/50" />
              <span>Awaiting block events...</span>
            </div>
          ) : (
            events.map((ev) => {
              const isRefused = ev.status === "REFUSED"
              
              return (
                <div key={ev.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/10 transition-colors">
                  
                  {/* Left: Icon + Type */}
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${
                      isRefused
                        ? "bg-red-950/20 border-red-900/50 text-red-400"
                        : ev.type === "ComplianceTransfer"
                        ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400"
                        : "bg-indigo-950/20 border-indigo-900/50 text-indigo-400"
                    }`}>
                      {isRefused ? (
                        <ShieldX className="h-5 w-5" />
                      ) : (
                        <ShieldCheck className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{ev.type}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded font-mono">
                          {ev.timestamp}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <span className="font-mono">{ev.from.slice(0, 6)}...{ev.from.slice(-4)}</span>
                        <ArrowRightLeft className="h-3 w-3 text-slate-600" />
                        <span className="font-mono">{ev.to.slice(0, 6)}...{ev.to.slice(-4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount + Status */}
                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-left md:text-right">
                      <span className="text-sm font-bold text-white">{ev.amount} TCT</span>
                      <span className="block text-[10px] text-slate-500">ERC-3643 Token Suite</span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isRefused
                          ? "bg-red-950/40 border-red-800 text-red-400"
                          : "bg-green-950/40 border-green-800 text-green-400"
                      }`}>
                        {isRefused ? "BLOCKED" : "COMPLIANT"}
                      </span>
                      {isRefused && ev.reason && (
                        <span className="text-[10px] text-red-400/80 mt-1 max-w-[150px] text-right truncate">
                          {ev.reason}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
