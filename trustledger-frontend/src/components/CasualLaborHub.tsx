import React, { useState } from "react";
import { TrustLedgerAPI } from "../api";
import { Users, Phone, DollarSign, FileText, CheckCircle2, Navigation, RefreshCw, Landmark, Sparkles } from "lucide-react";

interface CasualLaborHubProps {
  token: string | null;
  onPayoutSuccess: (updatedRepScore: number) => void;
  setError: (msg: string) => void;
}

export default function CasualLaborHub({ token, onPayoutSuccess, setError }: CasualLaborHubProps) {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ reputation: number } | null>(null);

  // Quick Worker Presets
  const workerPresets = [
    { name: "Baba Tobi (Cocoa Driver)", phone: "08031234567", defaultAmount: "25000" },
    { name: "Chidi (Mile 12 Loader)", phone: "07062483109", defaultAmount: "12500" },
    { name: "Musa (Grain Stack Harvester)", phone: "09087541293", defaultAmount: "35000" }
  ];

  const handlePresetSelect = (preset: typeof workerPresets[0]) => {
    setPhone(preset.phone);
    setAmount(preset.defaultAmount);
    setNarration(`Payment for loading ${preset.name.split(" ")[0]}'s scheduled crops cargo`);
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Please specify the target worker phone number.");
      return;
    }

    // Validate Nigerian phone format
    const cleanPhone = phone.replace(/\s+/g, "");
    const nigeriaPhoneRegex = /^(?:\+234\d{10}|070\d{8}|080\d{8}|090\d{8}|081\d{8})$/;
    if (!nigeriaPhoneRegex.test(cleanPhone)) {
      setError("Invalid worker phone format. Must be +234... or Nigerian prefix (070, 080, 090, 081) followed by 8 digits.");
      return;
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setError("Please provide a valid currency payout amount.");
      return;
    }

    if (!narration.trim()) {
      setError("Please fill in the contract narration/memo.");
      return;
    }

    setLoading(true);
    setSuccessInfo(null);

    try {
      const response = await TrustLedgerAPI.triggerPayout({
        worker_phone: phone,
        amount: payAmount,
        narration: narration
      }, token);

      setSuccessInfo({ reputation: response.reputation_metric });
      onPayoutSuccess(response.reputation_metric);

      // Clear input fields
      setPhone("");
      setAmount("");
      setNarration("");
    } catch (err: any) {
      setError(err?.message || "Outbound workforce gig settlement failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#0EBD2B]" />
          <div>
            <h2 className="text-md font-sans font-bold uppercase tracking-wider text-white">
              Casual Labor Payouts
            </h2>
            <p className="text-[10px] text-white/40 font-mono">
              Secure outbound payroll distribution to drivers, clearers, & logistics harvesters.
            </p>
          </div>
        </div>
        <div className="bg-[#0EBD2B]/15 border border-[#0EBD2B]/20 px-2.5 py-1 rounded text-[10px] font-mono text-[#0EBD2B] flex items-center gap-1 uppercase font-bold">
          <Landmark className="w-3.5 h-3.5" /> SECURE WEB PAYOUT
        </div>
      </div>

      {/* Success Alert Block highlighting updated reputation */}
      {successInfo && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl space-y-2 animate-pulse">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
              WORKFORCE PAYROLL SETTLED SUCCESSFUL
            </h3>
          </div>
          <p className="text-xs font-sans leading-relaxed text-gray-300">
            Outbound currency payment has been locked fully into the Graph supply nodes. Your reputation has climbed!
          </p>
          <div className="text-xs font-mono">
            Updated Ecosystem Trust Score: <span className="font-extrabold text-white text-md px-1.5 py-0.5 rounded bg-emerald-500/20">{successInfo.reputation} Points</span>
          </div>
        </div>
      )}

      {/* Quick Workers Selectors */}
      <div>
        <span className="text-[10px] font-mono tracking-wider uppercase text-white/40 block mb-2 font-bold">
          Nigeria Market Field Workers Quick Select:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {workerPresets.map((wp, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetSelect(wp)}
              className="px-3 py-2 text-left bg-black/40 hover:bg-white/[0.02] border border-white/5 hover:border-[#0EBD2B] rounded-lg text-xs font-mono transition-all flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-white/80 group-hover:text-[#0EBD2B] transition-colors">{wp.name}</div>
                <div className="text-white/40 text-[10px] mt-0.5">{wp.phone}</div>
              </div>
              <span className="text-[10px] text-[#0EBD2B] font-bold">₦{Number(wp.defaultAmount).toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex py-2 items-center">
        <div className="flex-grow border-t border-white/5"></div>
        <span className="flex-shrink mx-4 text-white/20 font-mono text-[9px] uppercase tracking-widest">or specify worker coordinates</span>
        <div className="flex-grow border-t border-white/5"></div>
      </div>

      {/* Settlement Form */}
      <form onSubmit={handlePayoutSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Worker phone number */}
          <div>
            <label className="block text-xs font-mono text-white/50 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Target Phone Number
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#0EBD2B]"
              placeholder="e.g. 08031234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-[9px] text-white/30 font-mono mt-1">
              Supports Nigeria formats (+234... or regional zero prefixes)
            </p>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-mono text-white/50 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> Outbound Amount (₦ NGN)
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="1"
              className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#0EBD2B]"
              placeholder="e.g. 25000.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

        </div>

        {/* Narration memos */}
        <div>
          <label className="block text-xs font-mono text-white/50 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Narration & Contract Memo
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-white font-sans text-sm focus:outline-none focus:border-[#0EBD2B]"
            placeholder="e.g. Payment for loading 50 bags of cocoa Cargo"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
          />
        </div>

        {/* Info panel highlighting automatic validation */}
        <div className="bg-[#0EBD2B]/5 border border-[#0EBD2B]/10 p-3 rounded-lg text-[11px] font-mono text-white/50 leading-normal flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#0EBD2B] flex-shrink-0 mt-0.5 animate-pulse" />
          <span>
            <strong>Zero Merchant ID Policy:</strong> Identities are extracted natively from the auth JWT tokens. Gig payments automatically contribute <strong>+5 bonus points</strong> towards your market reputation level.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-4 rounded-xl text-sm font-mono tracking-wider font-bold uppercase transition-all bg-[#0EBD2B] text-[#121212] hover:bg-[#0EBD2B]/90 hover:shadow-lg hover:shadow-[#0EBD2B]/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              DISPATCHING OUTBOUND WIRE TRANSACTIONS...
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              DISPATCH SECURE OUTBOUND PAYROLL
            </>
          )}
        </button>
      </form>
    </div>
  );
}
