"use client"

import * as React from "react"
import { useComplianceSettings, updateComplianceSettingsMutation, ComplianceSettings } from "@/hooks/graphql"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShieldCheck, UserPlus, FileSignature, Trash2, CheckCircle2 } from "lucide-react"

export default function SettingsPage() {
  const { settings, mutateSettings, isLoading } = useComplianceSettings()
  const { toast } = useToast()

  // Local component states
  const [complianceFlags, setComplianceFlags] = React.useState("")
  const [newIssuer, setNewIssuer] = React.useState("")
  const [issuersList, setIssuersList] = React.useState<string[]>([])
  const [newTopic, setNewTopic] = React.useState("")
  const [topicsList, setTopicsList] = React.useState<string[]>([])

  // Load hooks data into state
  React.useEffect(() => {
    if (settings) {
      setComplianceFlags(settings.complianceFlags)
      setIssuersList(settings.trustedIssuers)
      setTopicsList(settings.claimTopics)
    }
  }, [settings])

  // Save Settings
  const handleSaveSettings = async () => {
    const updated: ComplianceSettings = {
      complianceFlags,
      trustedIssuers: issuersList,
      claimTopics: topicsList
    }

    try {
      await updateComplianceSettingsMutation(updated)
      toast({
        title: "Settings Updated",
        description: "Compliance rules successfully updated and synchronized.",
        variant: "success"
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update compliance settings",
        variant: "destructive"
      })
    }
  }

  // Add Issuer
  const handleAddIssuer = () => {
    if (!newIssuer.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid 40-character Ethereum hex address.",
        variant: "destructive"
      })
      return
    }

    if (issuersList.some((iss) => iss.toLowerCase() === newIssuer.toLowerCase())) {
      toast({
        title: "Duplicate Address",
        description: "This issuer is already registered.",
        variant: "destructive"
      })
      return
    }

    setIssuersList([...issuersList, newIssuer])
    setNewIssuer("")
    toast({
      title: "Issuer Added",
      description: "Remember to save changes to commit.",
      variant: "default"
    })
  }

  // Remove Issuer
  const handleRemoveIssuer = (address: string) => {
    setIssuersList(issuersList.filter((iss) => iss !== address))
    toast({
      title: "Issuer Removed",
      description: "Remember to save changes to commit.",
      variant: "default"
    })
  }

  // Add Topic
  const handleAddTopic = () => {
    const trimmed = newTopic.trim()
    if (!trimmed) return

    if (topicsList.includes(trimmed)) {
      toast({
        title: "Duplicate Topic",
        description: "This claim topic is already registered.",
        variant: "destructive"
      })
      return
    }

    setTopicsList([...topicsList, trimmed])
    setNewTopic("")
    toast({
      title: "Claim Topic Added",
      description: "Remember to save changes to commit.",
      variant: "default"
    })
  }

  // Remove Topic
  const handleRemoveTopic = (topic: string) => {
    setTopicsList(topicsList.filter((t) => t !== topic))
    toast({
      title: "Claim Topic Removed",
      description: "Remember to save changes to commit.",
      variant: "default"
    })
  }

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Compliance & Settings
          </h1>
          <p className="text-slate-400 mt-1">
            Configure tokenized asset restriction parameters, claim checks, and trusted issuer signers.
          </p>
        </div>
        <Button
          onClick={handleSaveSettings}
          id="save-settings-btn"
          className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 self-start md:self-auto"
        >
          <CheckCircle2 className="h-4 w-4" />
          Save Rules Configuration
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Card 1: Compliance Flags */}
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-xl backdrop-blur-md space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            Compliance Flags
          </h2>
          <p className="text-xs text-slate-400 leading-normal">
            Enforced policies parsed by ERC-3643 Modular Compliance. Add comma-separated rule flags.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Active Restriction Flags
            </label>
            <Input
              value={complianceFlags}
              onChange={(e) => setComplianceFlags(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-white"
            />
          </div>
          <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-lg text-xs text-slate-500 space-y-1">
            <span className="font-bold text-slate-400">Supported Policies:</span>
            <span className="block">• KYC_REQUIRED: Requires active claim registry</span>
            <span className="block">• COUNTRY_FR_US: France and US country code whitelist</span>
          </div>
        </div>

        {/* Card 2: Trusted Issuers */}
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-xl backdrop-blur-md space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-400" />
            Trusted Issuers
          </h2>
          <p className="text-xs text-slate-400 leading-normal">
            Register signing authorities. Only identity claims signed by these addresses validate transfer checks.
          </p>
          
          <div className="flex gap-2">
            <Input
              placeholder="0x..."
              value={newIssuer}
              onChange={(e) => setNewIssuer(e.target.value)}
              id="new-issuer-input"
              className="bg-slate-950/80 border-slate-800 text-white text-xs"
            />
            <Button onClick={handleAddIssuer} size="sm" id="add-issuer-btn" className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white text-xs">
              Add
            </Button>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {issuersList.length === 0 ? (
              <span className="block text-xs text-slate-600 italic">No issuers declared.</span>
            ) : (
              issuersList.map((iss) => (
                <div key={iss} className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-900">
                  <span className="font-mono text-xs text-slate-400">{iss.slice(0, 10)}...{iss.slice(-8)}</span>
                  <button
                    onClick={() => handleRemoveIssuer(iss)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Claim Topics */}
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-xl backdrop-blur-md space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-indigo-400" />
            Claim Topics
          </h2>
          <p className="text-xs text-slate-400 leading-normal">
            Topics of identity verification that the token expects. Topic values are defined by identity providers.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1 (KYC)"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-white text-xs"
            />
            <Button onClick={handleAddTopic} size="sm" className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white text-xs">
              Add
            </Button>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {topicsList.length === 0 ? (
              <span className="block text-xs text-slate-600 italic">No claim topics declared.</span>
            ) : (
              topicsList.map((topic) => (
                <div key={topic} className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-900">
                  <span className="text-xs text-slate-400">Topic #{topic}</span>
                  <button
                    onClick={() => handleRemoveTopic(topic)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
