import React from "react";
import { Transaction } from "../types";
import { CheckCheck, AlertTriangle, Edit3, Lock, ShieldCheck, History, CornerDownRight } from "lucide-react";

interface TimelineAuditViewProps {
  transactions: Transaction[];
  onTriggerEdit: (tx: Transaction) => void;
}

export default function TimelineAuditView({ transactions, onTriggerEdit }: TimelineAuditViewProps) {
  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#0EBD2B] animate-pulse" />
          <h2 className="text-sm font-sans font-bold uppercase tracking-wider text-white">
            Historical Revenue Timeline
          </h2>
        </div>
        <div className="text-[10px] font-mono text-[#0EBD2B] uppercase tracking-widest bg-[#0EBD2B]/10 border border-[#0EBD2B]/20 px-2.5 py-1 rounded-full">
          Live Connection Secure
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
          <p className="text-xs font-mono text-white/40 uppercase">
            No logged transaction nodes on supply graph. Use action controls to begin.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 font-sans">
          {transactions.slice(0, 10).map((tx) => {
            const isSale = tx.direction === "SALE";
            
            // Format metric e.g. "5 Crate", "20 Derica", make first letter capitalization
            const unitFormatted = tx.unit_measure.charAt(0).toUpperCase() + tx.unit_measure.slice(1);
            const metricString = `${tx.quantity} ${unitFormatted}${tx.quantity > 1 ? "s" : ""}`;

            // Check security status flags
            const hasAnomaly = tx.is_anomaly === true;
            const isVerified = tx.verified === true && !hasAnomaly;
            const canEdit = !isVerified && !hasAnomaly;

            return (
              <div
                key={tx.tx_id}
                className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-white/[0.02] rounded-xl px-2 ${
                  hasAnomaly ? "border border-red-500/40 pl-3 bg-red-950/20 animate-pulse" : ""
                }`}
              >
                {/* Left Side: Meta & Item description */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white transition-colors hover:text-[#0EBD2B]">
                      {tx.item_name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-white/50 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                      {tx.direction}
                    </span>
                  </div>

                  {/* Quantity and unit description */}
                  <div className="text-xs text-white/40 flex items-center gap-1.5 font-mono">
                    <CornerDownRight className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-white font-semibold">{metricString}</span>
                    <span className="text-white/10">•</span>
                    <span>{tx.timestamp}</span>
                  </div>

                  {/* Context notes */}
                  {tx.context_notes && (
                    <p className="text-[11px] text-white/50 leading-relaxed font-sans pl-5 italic">
                      "{tx.context_notes}"
                    </p>
                  )}
                </div>

                {/* Right Side: Price tags, badging, edit activations */}
                <div className="flex flex-col md:items-end gap-2.5">
                  {/* Currency Format */}
                  <div className={`text-md font-mono font-bold ${isSale ? "text-[#0EBD2B]" : "text-orange-400"}`}>
                    {isSale ? "+" : "-"}₦{tx.amount.toLocaleString("en-NG")}
                  </div>

                  {/* Security / Integrity Status badges */}
                  <div className="flex flex-wrap gap-2">
                    {/* CONDITION 1: ANOMALY PRICE MISMATCH */}
                    {hasAnomaly && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-[8px] font-mono font-bold text-red-400 uppercase tracking-tighter">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        ANOMALY: PRICE MISMATCH
                      </span>
                    )}

                    {/* CONDITION 2: FINALIZED LOCK */}
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0EBD2B]/20 text-[#0EBD2B] text-[8px] font-mono font-bold uppercase tracking-tighter">
                        <CheckCheck className="w-3 h-3 text-[#0EBD2B]" />
                        VERIFIED SECURE
                      </span>
                    )}

                    {/* CONDITION 3: UNVERIFIED ALTERABLE STATE */}
                    {canEdit && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 text-[8px] font-mono font-bold text-white/50 uppercase tracking-tighter">
                        UNVERIFIED
                      </span>
                    )}

                    {/* Action buttons if editable */}
                    {canEdit && (
                      <button
                        onClick={() => onTriggerEdit(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/5 border border-white/5 hover:border-[#0EBD2B] hover:text-white rounded text-[9px] font-mono text-white/70 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-[#0EBD2B]" />
                        Edit Unverified
                      </button>
                    )}

                    {/* Disabled Lock Action Placeholders */}
                    {hasAnomaly && (
                      <button
                        disabled={true}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-black/20 border border-white/5 rounded text-[8px] font-mono text-white/30 cursor-not-allowed"
                      >
                        <Lock className="w-2.5 h-2.5" /> Blocked
                      </button>
                    )}

                    {isVerified && (
                      <button
                        disabled={true}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-black/20 border border-[#0EBD2B]/20 rounded text-[8px] font-mono text-emerald-450 cursor-not-allowed"
                      >
                        <Lock className="w-2.5 h-2.5 text-[#0EBD2B]" /> Locked
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
