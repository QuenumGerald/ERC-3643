"use client"

import * as React from "react"
import { useInvestors, addInvestorMutation, updateInvestorMutation, Investor } from "@/hooks/graphql"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit2, Download, Search, ChevronLeft, ChevronRight, Check, X, ShieldAlert } from "lucide-react"

export default function InvestorsPage() {
  const { investors, mutateInvestors, isLoading } = useInvestors()
  const { toast } = useToast()

  // Form State
  const [wallet, setWallet] = React.useState("")
  const [status, setStatus] = React.useState<"VERIFIED" | "PENDING" | "BLOCKED">("VERIFIED")
  const [kycDate, setKycDate] = React.useState("")
  const [isFrozen, setIsFrozen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
  const [sortBy, setSortBy] = React.useState<"wallet" | "kycDate">("kycDate")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 5

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid 40-character hex Ethereum address starting with 0x",
        variant: "destructive"
      })
      return
    }

    if (!kycDate) {
      toast({
        title: "Required Field",
        description: "Please select a KYC certification date",
        variant: "destructive"
      })
      return
    }

    const payload: Investor = {
      wallet,
      status,
      kycDate,
      isFrozen
    }

    try {
      if (isEditing) {
        await updateInvestorMutation(payload)
        toast({
          title: "Investor Updated",
          description: `Successfully modified properties for ${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
          variant: "success"
        })
      } else {
        await addInvestorMutation(payload)
        toast({
          title: "Investor Added",
          description: `Successfully registered ${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
          variant: "success"
        })
      }
      resetForm()
    } catch (err) {
      toast({
        title: "Operation Failed",
        description: "Could not save investor changes",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setWallet("")
    setStatus("VERIFIED")
    setKycDate("")
    setIsFrozen(false)
    setIsEditing(false)
  }

  const handleEdit = (inv: Investor) => {
    setWallet(inv.wallet)
    setStatus(inv.status)
    setKycDate(inv.kycDate)
    setIsFrozen(inv.isFrozen)
    setIsEditing(true)
  }

  const toggleFreeze = async (inv: Investor) => {
    try {
      const updated = { ...inv, isFrozen: !inv.isFrozen }
      await updateInvestorMutation(updated)
      toast({
        title: inv.isFrozen ? "Wallet Unfrozen" : "Wallet Frozen",
        description: `Wallet ${inv.wallet.slice(0, 6)} state changed successfully.`,
        variant: "success"
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update freeze state",
        variant: "destructive"
      })
    }
  }

  // Export CSV Handler
  const exportToCSV = () => {
    const headers = ["Wallet Address", "Status", "KYC Date", "Frozen Status"]
    const rows = investors.map(inv => [
      inv.wallet,
      inv.status,
      inv.kycDate,
      inv.isFrozen ? "FROZEN" : "ACTIVE"
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `T-REX_Investor_Registry_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Complete",
      description: "Investor CSV registry successfully generated & downloaded.",
      variant: "success"
    })
  }

  // Filter & Sort math
  const processedInvestors = React.useMemo(() => {
    let result = [...investors]

    if (searchQuery) {
      result = result.filter(inv =>
        inv.wallet.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== "ALL") {
      result = result.filter(inv => inv.status === statusFilter)
    }

    result.sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      return 0
    })

    return result
  }, [investors, searchQuery, statusFilter, sortBy, sortOrder])

  // Pagination math
  const totalPages = Math.ceil(processedInvestors.length / itemsPerPage) || 1
  const paginatedInvestors = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return processedInvestors.slice(startIndex, startIndex + itemsPerPage)
  }, [processedInvestors, currentPage])

  React.useEffect(() => {
    // Reset page if filters filter out records
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Investor Registry
          </h1>
          <p className="text-slate-400 mt-1">
            Register and manage KYC-verified identities for compliant asset transfers.
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          id="export-csv-btn"
          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white flex items-center gap-2 self-start md:self-auto"
        >
          <Download className="h-4 w-4" />
          Export CSV Registry
        </Button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Add/Edit Investor form */}
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-xl backdrop-blur-md space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-400" />
            {isEditing ? "Edit Registry Item" : "Register New Investor"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4" id="investor-form">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Ethereum Wallet Address
              </label>
              <Input
                placeholder="0x..."
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                disabled={isEditing}
                id="investor-wallet-input"
                className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-600 focus:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Identity Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                id="investor-status-select"
                className="w-full h-9 rounded-md border border-slate-800 bg-slate-950/80 px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-700"
              >
                <option value="VERIFIED">VERIFIED ( France / US )</option>
                <option value="PENDING">PENDING ( Awaiting Claim )</option>
                <option value="BLOCKED">BLOCKED ( Compliance Failure )</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                KYC Verification Date
              </label>
              <Input
                type="date"
                value={kycDate}
                onChange={(e) => setKycDate(e.target.value)}
                id="investor-kyc-date"
                className="bg-slate-950/80 border-slate-800 text-white focus:border-slate-700 font-sans"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-900">
              <div>
                <span className="block text-sm font-semibold text-white">Freeze Balance</span>
                <span className="block text-xs text-slate-400">Lock investor's asset movements</span>
              </div>
              <input
                type="checkbox"
                checked={isFrozen}
                onChange={(e) => setIsFrozen(e.target.checked)}
                id="investor-freeze-checkbox"
                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" id="submit-investor-btn" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                {isEditing ? "Save Changes" : "Register Identity"}
              </Button>
              {isEditing && (
                <Button type="button" onClick={resetForm} className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right column: Data Table */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-900/60 p-6 rounded-xl backdrop-blur-md flex flex-col justify-between space-y-6">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by wallet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:border-slate-700"
              />
            </div>

            <div className="flex gap-2 self-end sm:self-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-800 bg-slate-950/80 px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">Verified Only</option>
                <option value="PENDING">Pending Only</option>
                <option value="BLOCKED">Blocked Only</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-950/30">
            <Table>
              <TableHeader className="bg-slate-900/60">
                <TableRow className="border-slate-900">
                  <TableHead className="text-slate-400 font-bold hover:text-white cursor-pointer select-none" onClick={() => {
                    setSortBy("wallet")
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }}>
                    Wallet Address {sortBy === "wallet" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-slate-400 font-bold">Status</TableHead>
                  <TableHead className="text-slate-400 font-bold hover:text-white cursor-pointer select-none" onClick={() => {
                    setSortBy("kycDate")
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }}>
                    KYC Date {sortBy === "kycDate" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-slate-400 font-bold">Freeze</TableHead>
                  <TableHead className="text-slate-400 font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="border-slate-900">
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      Loading registry items...
                    </TableCell>
                  </TableRow>
                ) : paginatedInvestors.length === 0 ? (
                  <TableRow className="border-slate-900">
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No investors found matching the filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvestors.map((inv) => (
                    <TableRow key={inv.wallet} className="border-slate-900 hover:bg-slate-900/30">
                      <TableCell className="font-mono text-xs text-slate-300">
                        {inv.wallet.slice(0, 10)}...{inv.wallet.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold uppercase border ${
                          inv.status === "VERIFIED"
                            ? "bg-green-950/40 border-green-800 text-green-400"
                            : inv.status === "PENDING"
                            ? "bg-amber-950/40 border-amber-800 text-amber-400"
                            : "bg-red-950/40 border-red-800 text-red-400"
                        }`}>
                          {inv.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-300 text-xs">{inv.kycDate}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleFreeze(inv)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all duration-200 ${
                            inv.isFrozen
                              ? "bg-red-950/30 border-red-800/60 text-red-400 hover:bg-red-900/20"
                              : "bg-emerald-950/20 border-emerald-900/40 text-emerald-400 hover:bg-emerald-900/10"
                          }`}
                        >
                          {inv.isFrozen ? (
                            <>
                              <ShieldAlert className="h-3 w-3" />
                              FROZEN
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3" />
                              ACTIVE
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(inv)}
                          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-900"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-900">
            <span className="text-xs text-slate-500">
              Showing Page {currentPage} of {totalPages} ({processedInvestors.length} records)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-slate-950 border-slate-900 hover:bg-slate-900 text-slate-300 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-slate-950 border-slate-900 hover:bg-slate-900 text-slate-300 disabled:opacity-30"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
