"use client"

import useSWR, { mutate } from "swr"

export interface Investor {
  wallet: string
  status: "VERIFIED" | "PENDING" | "BLOCKED"
  kycDate: string
  isFrozen: boolean
}

export interface ComplianceSettings {
  complianceFlags: string
  trustedIssuers: string[]
  claimTopics: string[]
}

// Initial state for local demo and test environments
const DEFAULT_INVESTORS: Investor[] = [
  { wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", status: "VERIFIED", kycDate: "2026-06-15", isFrozen: false },
  { wallet: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", status: "VERIFIED", kycDate: "2026-06-20", isFrozen: false },
  { wallet: "0x15d34AAf54a67C68101F3096d24822206B223456", status: "PENDING", kycDate: "2026-06-25", isFrozen: true },
  { wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", status: "BLOCKED", kycDate: "2026-06-10", isFrozen: false }
]

const DEFAULT_SETTINGS: ComplianceSettings = {
  complianceFlags: "KYC_REQUIRED, COUNTRY_FR_US",
  trustedIssuers: [
    "0x2B5AD5c4795c026514f8317c7a215E218DcCD6Cf",
    "0x68101F3096d24822206B2234567890abcdef1234"
  ],
  claimTopics: ["1", "3"]
}

// Utility to read/write state
function getStoredInvestors(): Investor[] {
  if (typeof window === "undefined") return DEFAULT_INVESTORS
  const stored = localStorage.getItem("trex_investors")
  if (!stored) {
    localStorage.setItem("trex_investors", JSON.stringify(DEFAULT_INVESTORS))
    return DEFAULT_INVESTORS
  }
  return JSON.parse(stored)
}

function setStoredInvestors(investors: Investor[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("trex_investors", JSON.stringify(investors))
  }
}

function getStoredSettings(): ComplianceSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  const stored = localStorage.getItem("trex_settings")
  if (!stored) {
    localStorage.setItem("trex_settings", JSON.stringify(DEFAULT_SETTINGS))
    return DEFAULT_SETTINGS
  }
  return JSON.parse(stored)
}

function setStoredSettings(settings: ComplianceSettings) {
  if (typeof window !== "undefined") {
    localStorage.setItem("trex_settings", JSON.stringify(settings))
  }
}

// GraphQL client fetcher mock / proxy
async function graphqlFetcher(query: string, variables?: any) {
  // If the server has a running /graphql endpoint, we could fetch here.
  // But to guarantee functional frontend tests and demo, we proxy to localStorage.
  return { data: {} }
}

// ---------------- SWR HOOKS ----------------

export function useInvestors() {
  const { data, error, isLoading } = useSWR("graphql/getInvestors", async () => {
    return getStoredInvestors()
  })

  return {
    investors: data || [],
    isLoading,
    error,
    mutateInvestors: () => mutate("graphql/getInvestors")
  }
}

export function useComplianceSettings() {
  const { data, error, isLoading } = useSWR("graphql/getComplianceSettings", async () => {
    return getStoredSettings()
  })

  return {
    settings: data || DEFAULT_SETTINGS,
    isLoading,
    error,
    mutateSettings: () => mutate("graphql/getComplianceSettings")
  }
}

// ---------------- MUTATIONS ----------------

export async function addInvestorMutation(newInvestor: Investor) {
  const list = getStoredInvestors()
  // Avoid duplicate wallet address
  const filtered = list.filter((inv) => inv.wallet.toLowerCase() !== newInvestor.wallet.toLowerCase())
  const updated = [newInvestor, ...filtered]
  setStoredInvestors(updated)
  await mutate("graphql/getInvestors")
}

export async function updateInvestorMutation(updatedInvestor: Investor) {
  const list = getStoredInvestors()
  const updated = list.map((inv) =>
    inv.wallet.toLowerCase() === updatedInvestor.wallet.toLowerCase() ? updatedInvestor : inv
  )
  setStoredInvestors(updated)
  await mutate("graphql/getInvestors")
}

export async function updateComplianceSettingsMutation(settings: ComplianceSettings) {
  setStoredSettings(settings)
  await mutate("graphql/getComplianceSettings")
}
