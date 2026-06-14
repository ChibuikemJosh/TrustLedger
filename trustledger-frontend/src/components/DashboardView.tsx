import React from "react";
import { UserProfile, getReputationTier, Transaction } from "../types";
import { Mic, Camera, FilePlus, Users, ArrowUpRight, ArrowDownLeft, Shield, Landmark } from "lucide-react";

interface DashboardViewProps {
  user: UserProfile;
  transactions: Transaction[];
  onOpenVoice: () => void;
  onOpenLedger: () => void;
  onOpenManualEntry: () => void;
  onNavigateToLabor: () => void;
}

export default function DashboardView({
  user,
  transactions,
  onOpenVoice,
  onOpenLedger,
  onOpenManualEntry,
  onNavigateToLabor
}: DashboardViewProps) {
  const rep = getReputationTier(user.trust_score);
  
  // Calculate milestone status
  const nextMilestone = rep.boundary;
  const scoreProgress = (user.trust_score / 100) * 100;

  // Circular progress calculations
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Draw partial arc (offset to show circular meter gauge)
  const strokeDashoffset = circumference - (user.trust_score / 100) * circumference;

  // Stats
  const sales = transactions.filter((t) => t.direction === "SALE");
  const expenses = transactions.filter((t) => t.direction === "EXPENSE" || t.direction === "CASUAL_LABOR_PAYOUT");
  
  const totalSales = sales.reduce((acc, current) => acc + current.amount, 0);
  const totalExpenses = expenses.reduce((acc, current) => acc + current.amount, 0);
  const netEarnings = totalSales - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Top Bar Banner */}
      <div className="p-6 bg-gradient-to-tr from-[#1A1A1A] to-[#1e1e1e] border border-white/10 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white tracking-tight">{user.name}</h2>
            <Landmark className="w-4 h-4 text-[#0EBD2B]" />
          </div>
          <div className="text-xs text-white/40 flex items-center gap-1.5 font-mono">
            <span>{user.location.city}, {user.location.state}</span>
            <span className="text-white/10">•</span>
            <span>Country Default: Nigeria</span>
          </div>
        </div>

        {/* Dynamic Badge utilizing precisely matching Reputation Band color */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Ecosystem reputation:</span>
          <span
            className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border"
            style={{
              backgroundColor: `${rep.accent}1A`,
              borderColor: rep.accent,
              color: rep.accent
            }}
          >
            ● {rep.name}
          </span>
        </div>
      </div>

      {/* Grid: Speedometer and Money Stats Dashboard overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Card: Centerpiece HUD Speedometer */}
        <div className="lg:col-span-5 p-8 bg-[#1A1A1A] border border-white/5 rounded-2xl flex flex-col items-center justify-center relative min-h-[350px] overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-white pointer-events-none">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>
          </div>
          <div className="absolute top-4 left-4 flex items-center gap-1.5 text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">
            <Shield className="w-4 h-4" style={{ color: rep.accent }} /> Trust Reputation Speedometer
          </div>

          {/* Glowing Radial Progress ring */}
          <div className="relative flex items-center justify-center w-48 h-48 mt-4 transition-all duration-300">
            {/* SVG circle track and indicator */}
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
              {/* Back Circle */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="stroke-white/5 fill-none"
                strokeWidth={strokeWidth}
              />
              {/* Colored Gauge Indicator matching current reputation boundaries */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  stroke: rep.accent,
                  filter: `drop-shadow(0 0 8px ${rep.accent}70)`
                }}
              />
            </svg>

            {/* Inner Dashboard HUD value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-6xl font-black tracking-tighter text-white font-sans block">
                {user.trust_score}
              </span>
              <span
                className="text-[10px] font-mono tracking-widest uppercase font-bold"
                style={{ color: rep.accent }}
              >
                Tier {rep.tier} Status
              </span>
            </div>
          </div>

          {/* Dynamic Helper Milestones Text */}
          <div className="mt-8 text-center w-full max-w-[240px]">
            <div className="text-xs font-mono text-white/70">
              Next Milestone: <span className="font-bold text-white tracking-wide">{nextMilestone} ({rep.tier === 4 ? "Ecosystem Master" : "Advance Tier"})</span>
            </div>
            <div className="w-full bg-white/5 h-1 rounded-full mt-2 mx-auto overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${scoreProgress}%`,
                  backgroundColor: rep.accent
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Right Card: Financial Index Stats and Node Totals */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* NET FLOW ACCENT CARD */}
          <div className="p-6 bg-[#1A1A1A] border border-white/5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-white/40 uppercase tracking-widest font-bold">Net Market Cashflow</span>
              <span className="w-2 h-2 rounded-full bg-[#0EBD2B]"></span>
            </div>
            <div className="my-6">
              <div className="text-3xl font-extrabold text-white font-mono">
                {netEarnings >= 0 ? "+" : "-"}₦{Math.abs(netEarnings).toLocaleString("en-NG")}
              </div>
              <div className="text-[11px] text-white/40 font-mono mt-1">
                Compiled Graph Performance (NGN)
              </div>
            </div>
            <div className="text-xs font-mono text-white/50">
              Synced across <span className="text-white font-bold">{transactions.length} total nodes</span>
            </div>
          </div>

          {/* DIRECT GRID STATS */}
          <div className="space-y-4">
            
            {/* Sales Volume Box */}
            <div className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold">TOTAL GRAPH SALES</span>
                <div className="text-lg font-bold text-[#0EBD2B] mt-1 font-mono">
                  +₦{totalSales.toLocaleString("en-NG")}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#0EBD2B]/10 text-[#0EBD2B] flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            {/* Expenses Volume Box */}
            <div className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold">TOTAL LEDGER OUTS</span>
                <div className="text-lg font-bold text-orange-400 mt-1 font-mono">
                  -₦{totalExpenses.toLocaleString("en-NG")}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>

            {/* Role detail box */}
            <div className="p-4 bg-[#1A1A1A] border border-white/5 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 uppercase font-bold block">ACTIVE KEY IDENTITY ROLE</span>
                <span className="text-xs font-semibold text-gray-200 font-mono">{user.role} Authorization Token</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* SECTION: Core Action Controls */}
      <div>
        <h3 className="text-xs font-semibold tracking-wider text-white/40 uppercase font-mono mb-3">
          Core Action Controls Grid
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* BUTTON A: Quick Voice Log */}
          <button
            onClick={onOpenVoice}
            className="p-4 bg-[#1A1A1A] hover:bg-white/[0.02] border border-white/5 hover:border-[#0EBD2B] rounded-xl text-left flex flex-col items-start gap-1 group transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
              <Mic className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white transition-colors">
              Quick Voice Log
            </span>
            <span className="text-[9px] text-white/40 font-mono line-clamp-1">
              Record Pidgin Extractions
            </span>
          </button>

          {/* BUTTON B: Scan Ledger Snap */}
          <button
            onClick={onOpenLedger}
            className="p-4 bg-[#1A1A1A] hover:bg-white/[0.02] border border-white/5 hover:border-[#0EBD2B] rounded-xl text-left flex flex-col items-start gap-1 group transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white transition-colors">
              Scan Ledger Paper
            </span>
            <span className="text-[9px] text-white/40 font-mono line-clamp-1">
              Analyze Media Snaps
            </span>
          </button>

          {/* BUTTON C: Manual Drawer Entry */}
          <button
            onClick={onOpenManualEntry}
            className="p-4 bg-[#1A1A1A] hover:bg-white/[0.02] border border-white/5 hover:border-[#0EBD2B] rounded-xl text-left flex flex-col items-start gap-1 group transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center mb-2">
              <FilePlus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white transition-colors">
              Manual Ledger Entry
            </span>
            <span className="text-[9px] text-white/40 font-mono line-clamp-1">
              Slide Up Ledger Drawer
            </span>
          </button>

          {/* BUTTON D: Workforce Gigs */}
          <button
            onClick={onNavigateToLabor}
            className="p-4 bg-[#1A1A1A] hover:bg-white/[0.02] border border-white/5 hover:border-[#0EBD2B] rounded-xl text-left flex flex-col items-start gap-1 group transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white transition-colors">
              Casual Labor Settlement
            </span>
            <span className="text-[9px] text-white/40 font-mono line-clamp-1">
              Issue Workforce Payouts
            </span>
          </button>

        </div>
      </div>
    </div>
  );
}
