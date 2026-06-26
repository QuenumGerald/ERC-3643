"use client"

import * as React from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { addInvestorMutation, Investor } from "@/hooks/graphql"
import { Flame, Coins, UploadCloud, FileText, Check, AlertCircle, Trash2 } from "lucide-react"

export default function ActionsPage() {
  const { toast } = useToast()

  // Mint Form State
  const [mintOpen, setMintOpen] = React.useState(false)
  const [mintWallet, setMintWallet] = React.useState("")
  const [mintAmount, setMintAmount] = React.useState("")
  const [isMinting, setIsMinting] = React.useState(false)

  // Burn Form State
  const [burnOpen, setBurnOpen] = React.useState(false)
  const [burnWallet, setBurnWallet] = React.useState("")
  const [burnAmount, setBurnAmount] = React.useState("")
  const [isBurning, setIsBurning] = React.useState(false)

  // CSV Drag and Drop State
  const [isDragging, setIsDragging] = React.useState(false)
  const [parsedRows, setParsedRows] = React.useState<Investor[]>([])
  const [fileName, setFileName] = React.useState("")

  // Handle Minting
  const handleMint = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mintWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Wallet Address",
        description: "Please enter a valid Ethereum address.",
        variant: "destructive"
      })
      return
    }
    const amountNum = parseFloat(mintAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive token quantity to mint.",
        variant: "destructive"
      })
      return
    }

    setIsMinting(true)
    setTimeout(() => {
      setIsMinting(false)
      setMintOpen(false)
      toast({
        title: "Mint Successful",
        description: `Minted ${mintAmount} TCT to ${mintWallet.slice(0, 6)}...${mintWallet.slice(-4)}`,
        variant: "success"
      })
      setMintWallet("")
      setMintAmount("")
    }, 1500)
  }

  // Handle Burning
  const handleBurn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!burnWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Wallet Address",
        description: "Please enter a valid Ethereum address.",
        variant: "destructive"
      })
      return
    }
    const amountNum = parseFloat(burnAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive token quantity to burn.",
        variant: "destructive"
      })
      return
    }

    setIsBurning(true)
    setTimeout(() => {
      setIsBurning(false)
      setBurnOpen(false)
      toast({
        title: "Tokens Burned",
        description: `Burned ${burnAmount} TCT from ${burnWallet.slice(0, 6)}...${burnWallet.slice(-4)}`,
        variant: "success"
      })
      setBurnWallet("")
      setBurnAmount("")
    }, 1500)
  }

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Handle Drag Leave
  const handleDragLeave = () => {
    setIsDragging(false)
  }

  // File Parser Logic
  const parseCSV = (content: string) => {
    const lines = content.split("\n")
    const tempRows: Investor[] = []
    
    // Skip header line, run through rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const cols = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""))
      
      // Expected structure: Wallet, Status, KYCDate, Freeze
      const wallet = cols[0]
      const status = (cols[1] || "VERIFIED").toUpperCase() as any
      const kycDate = cols[2] || new Date().toISOString().split("T")[0]
      const isFrozen = cols[3]?.toUpperCase() === "FREEZE" || cols[3]?.toUpperCase() === "TRUE" || cols[3]?.toUpperCase() === "FROZEN"

      if (wallet && wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
        tempRows.push({
          wallet,
          status: ["VERIFIED", "PENDING", "BLOCKED"].includes(status) ? status : "VERIFIED",
          kycDate,
          isFrozen
        })
      }
    }
    return tempRows
  }

  // Handle Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const parsed = parseCSV(text)
        setParsedRows(parsed)
        setFileName(file.name)
        toast({
          title: "CSV Parsed",
          description: `Found ${parsed.length} valid investor rows in ${file.name}.`,
          variant: "success"
        })
      }
      reader.readAsText(file)
    } else {
      toast({
        title: "Unsupported File",
        description: "Please upload a valid .csv file.",
        variant: "destructive"
      })
    }
  }

  // Handle manual input upload
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const parsed = parseCSV(text)
        setParsedRows(parsed)
        setFileName(file.name)
        toast({
          title: "CSV Parsed",
          description: `Found ${parsed.length} valid investor rows in ${file.name}.`,
          variant: "success"
        })
      }
      reader.readAsText(file)
    }
  }

  // Batch import processed CSV rows
  const handleBatchImport = async () => {
    if (parsedRows.length === 0) return

    let importedCount = 0
    for (const inv of parsedRows) {
      try {
        await addInvestorMutation(inv)
        importedCount++
      } catch (err) {
        console.error("Failed to import investor", inv.wallet)
      }
    }

    toast({
      title: "Batch Import Completed",
      description: `Successfully registered ${importedCount} of ${parsedRows.length} investors to the registry.`,
      variant: "success"
    })
    
    // Clear list
    setParsedRows([])
    setFileName("")
  }

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Token Operations
        </h1>
        <p className="text-slate-400 mt-1">
          Perform administrative token management actions and load batch files to the registry.
        </p>
      </div>

      {/* Grid containing core options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Box 1: Mint/Burn admin triggers */}
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-xl backdrop-blur-md flex flex-col justify-between h-full space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-indigo-400" />
              Token Management
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Directly mint compliant tokens to verified investor addresses or burn tokens to reduce circulation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Mint Modal Trigger */}
            <Dialog open={mintOpen} onOpenChange={setMintOpen}>
              <DialogTrigger asChild>
                <Button id="mint-btn" className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 font-bold py-6">
                  <Coins className="h-5 w-5" />
                  Mint Tokens
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Mint Compliant Tokens</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Create new tokens and allocate them to a verified investor. Address must be registered in compliance database.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleMint} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Recipient Address
                    </label>
                    <Input
                      placeholder="0x..."
                      value={mintWallet}
                      onChange={(e) => setMintWallet(e.target.value)}
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Quantity to Mint
                    </label>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-700"
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMintOpen(false)}
                      className="bg-transparent border-slate-800 text-slate-300 hover:bg-slate-900"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isMinting}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2"
                    >
                      {isMinting ? "Minting..." : "Execute Mint"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Burn Modal Trigger */}
            <Dialog open={burnOpen} onOpenChange={setBurnOpen}>
              <DialogTrigger asChild>
                <Button id="burn-btn" className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white flex items-center gap-2 font-bold py-6">
                  <Flame className="h-5 w-5 text-red-500" />
                  Burn Tokens
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-red-500">Burn Compliant Tokens</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Destroy tokens from an investor's balance. This reduces the token's total supply.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBurn} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Source Wallet Address
                    </label>
                    <Input
                      placeholder="0x..."
                      value={burnWallet}
                      onChange={(e) => setBurnWallet(e.target.value)}
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Quantity to Burn
                    </label>
                    <Input
                      type="number"
                      placeholder="500"
                      value={burnAmount}
                      onChange={(e) => setBurnAmount(e.target.value)}
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-700"
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBurnOpen(false)}
                      className="bg-transparent border-slate-800 text-slate-300 hover:bg-slate-900"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isBurning}
                      className="bg-red-600 hover:bg-red-500 text-white flex items-center gap-2"
                    >
                      {isBurning ? "Burning..." : "Execute Burn"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

          </div>
        </div>

        {/* Box 2: Drag and Drop CSV parser */}
        <div className="bg-slate-900/20 border border-slate-900/60 p-6 rounded-xl backdrop-blur-md space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-emerald-400" />
              Batch CSV Import
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Upload or drag a CSV registry file containing columns: `Wallet, Status, KYCDate, Freeze` to register multiple identities.
            </p>
          </div>

          {/* Drag area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? "border-emerald-500 bg-emerald-950/10 text-emerald-300"
                : "border-slate-800 bg-slate-950/50 hover:bg-slate-950/80 text-slate-400"
            }`}
            onClick={() => document.getElementById("csv-file-picker")?.click()}
          >
            <input
              type="file"
              id="csv-file-picker"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
            
            <UploadCloud className={`h-12 w-12 mb-4 ${isDragging ? "text-emerald-400" : "text-slate-600"}`} />
            
            <span className="text-sm font-bold text-slate-200">
              {fileName ? fileName : "Drag & Drop CSV file here"}
            </span>
            <span className="text-xs text-slate-500 mt-1">
              or click to browse local files
            </span>
          </div>

          {/* Parsed list preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 bg-slate-950/60 border border-slate-900 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300">
                    Ready to Import: {parsedRows.length} rows
                  </span>
                </div>
                <button
                  onClick={() => { setParsedRows([]); setFileName("") }}
                  className="text-xs text-slate-500 hover:text-red-400"
                >
                  Clear File
                </button>
              </div>

              {/* Rows peek */}
              <div className="max-h-[120px] overflow-y-auto divide-y divide-slate-900 text-xs font-mono">
                {parsedRows.slice(0, 5).map((row, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-slate-400">
                    <span>{row.wallet.slice(0, 6)}...{row.wallet.slice(-4)}</span>
                    <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-emerald-400">
                      {row.status}
                    </span>
                  </div>
                ))}
                {parsedRows.length > 5 && (
                  <div className="pt-2 text-center text-[10px] text-slate-600 italic">
                    + {parsedRows.length - 5} more rows
                  </div>
                )}
              </div>

              <Button
                onClick={handleBatchImport}
                id="batch-import-btn"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Commit Batch Upload
              </Button>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
