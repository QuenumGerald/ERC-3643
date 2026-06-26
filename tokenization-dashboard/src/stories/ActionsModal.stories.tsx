import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Coins, Flame, UploadCloud, FileText, Check } from "lucide-react";

// Inline mock wrapper to represent the Action Panels in Storybook
const ActionsModalMock = ({
  fileName,
  rowCount,
  isDragging,
}: {
  fileName?: string;
  rowCount?: number;
  isDragging?: boolean;
}) => {
  return (
    <div className="bg-slate-950 p-8 rounded-xl text-white max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Token Operations
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Storybook interactive mock preview of administrator panels and batch loaders.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Token Management Panel */}
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-indigo-400" />
              Token Management
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Directly mint compliant tokens to verified investor addresses or burn tokens.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 font-bold py-6">
              <Coins className="h-5 w-5" />
              Mint Tokens
            </Button>

            <Button className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white flex items-center gap-2 font-bold py-6">
              <Flame className="h-5 w-5 text-red-500" />
              Burn Tokens
            </Button>
          </div>
        </div>

        {/* Batch CSV Import Panel */}
        <div className="bg-slate-900/20 border border-slate-900/60 p-6 rounded-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-emerald-400" />
              Batch CSV Import
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Upload or drag a CSV registry file to register multiple identities.
            </p>
          </div>

          {/* Drag Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? "border-emerald-500 bg-emerald-950/10 text-emerald-300"
                : "border-slate-800 bg-slate-950/50 hover:bg-slate-950/80 text-slate-400"
            }`}
          >
            <UploadCloud className={`h-12 w-12 mb-4 ${isDragging ? "text-emerald-400" : "text-slate-600"}`} />
            
            <span className="text-sm font-bold text-slate-200">
              {fileName ? fileName : "Drag & Drop CSV file here"}
            </span>
            <span className="text-xs text-slate-500 mt-1">
              or click to browse local files
            </span>
          </div>

          {/* Preview rows if rowCount > 0 */}
          {rowCount && rowCount > 0 && (
            <div className="space-y-4 bg-slate-950/60 border border-slate-900 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300">
                    Ready to Import: {rowCount} rows
                  </span>
                </div>
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                Commit Batch Upload
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const meta: Meta<typeof ActionsModalMock> = {
  title: "Components/ActionsPanel",
  component: ActionsModalMock,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof ActionsModalMock>;

export const Default: Story = {
  args: {
    isDragging: false,
  },
};

export const DraggingFile: Story = {
  args: {
    isDragging: true,
  },
};

export const FileUploaded: Story = {
  args: {
    fileName: "investor_list_2026.csv",
    rowCount: 24,
    isDragging: false,
  },
};
