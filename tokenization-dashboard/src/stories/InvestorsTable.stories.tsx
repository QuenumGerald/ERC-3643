import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Edit2, ShieldAlert, Check } from "lucide-react";

// Inline mock wrapper to represent the component in Storybook
const InvestorsTableMock = ({
  investors,
  isLoading,
  isEmpty,
}: {
  investors: Array<{ wallet: string; status: string; kycDate: string; isFrozen: boolean }>;
  isLoading?: boolean;
  isEmpty?: boolean;
}) => {
  return (
    <div className="bg-slate-950 p-6 rounded-xl border border-slate-900 text-white max-w-4xl mx-auto">
      <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-950/30">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="border-slate-900">
              <TableHead className="text-slate-400 font-bold">Wallet Address</TableHead>
              <TableHead className="text-slate-400 font-bold">Status</TableHead>
              <TableHead className="text-slate-400 font-bold">KYC Date</TableHead>
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
            ) : isEmpty || investors.length === 0 ? (
              <TableRow className="border-slate-900">
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No investors found matching the filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              investors.map((inv) => (
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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      inv.isFrozen
                        ? "bg-red-950/30 border-red-800/60 text-red-400"
                        : "bg-emerald-950/20 border-emerald-900/40 text-emerald-400"
                    }`}>
                      {inv.isFrozen ? <ShieldAlert className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      {inv.isFrozen ? "FROZEN" : "ACTIVE"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <button className="h-8 w-8 text-slate-400 hover:text-white rounded hover:bg-slate-900 inline-flex items-center justify-center">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const meta: Meta<typeof InvestorsTableMock> = {
  title: "Components/InvestorsTable",
  component: InvestorsTableMock,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof InvestorsTableMock>;

export const Populated: Story = {
  args: {
    investors: [
      { wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", status: "VERIFIED", kycDate: "2026-06-15", isFrozen: false },
      { wallet: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", status: "VERIFIED", kycDate: "2026-06-20", isFrozen: false },
      { wallet: "0x15d34AAf54a67C68101F3096d24822206B223456", status: "PENDING", kycDate: "2026-06-25", isFrozen: true },
      { wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", status: "BLOCKED", kycDate: "2026-06-10", isFrozen: false },
    ],
    isLoading: false,
    isEmpty: false,
  },
};

export const Loading: Story = {
  args: {
    investors: [],
    isLoading: true,
    isEmpty: false,
  },
};

export const Empty: Story = {
  args: {
    investors: [],
    isLoading: false,
    isEmpty: true,
  },
};
