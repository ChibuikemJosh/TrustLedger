import React, { useState, useEffect } from "react";
import { Transaction, UnitMeasure, TransactionDirection } from "../types";
import { X, Lock, CheckCircle, HelpCircle } from "lucide-react";

interface ManualEntryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tx: Partial<Transaction>) => void;
  initialData?: Partial<Transaction> | null;
}

export default function ManualEntryDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData
}: ManualEntryDrawerProps) {
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitMeasure, setUnitMeasure] = useState<UnitMeasure>("item");
  const [direction, setDirection] = useState<TransactionDirection>("SALE");
  const [contextNotes, setContextNotes] = useState("");

  useEffect(() => {
    if (initialData) {
      setItemName(initialData.item_name || "");
      setAmount(initialData.amount !== undefined ? String(initialData.amount) : "");
      setQuantity(initialData.quantity !== undefined ? String(initialData.quantity) : "1");
      setUnitMeasure((initialData.unit_measure as UnitMeasure) || "item");
      setDirection(initialData.direction || "SALE");
      setContextNotes(initialData.context_notes || "");
    } else {
      setItemName("");
      setAmount("");
      setQuantity("1");
      setUnitMeasure("item");
      setDirection("SALE");
      setContextNotes("");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    // Validate float and integer values
    const cleanedAmount = parseFloat(amount.replace(/[^\d.]/g, ""));
    const cleanedQuantity = parseInt(quantity.replace(/[^\d]/g, ""), 10) || 1;

    const payload: Partial<Transaction> = {
      tx_id: initialData?.tx_id, // include if editing
      item_name: itemName,
      amount: isNaN(cleanedAmount) ? 0 : cleanedAmount,
      quantity: cleanedQuantity,
      unit_measure: unitMeasure,
      direction,
      context_notes: contextNotes
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm transition-opacity">
      {/* Drawer Container */}
      <div className="w-full max-w-2xl bg-[#1A1A1A] border-t border-white/5 rounded-t-3xl shadow-2xl p-6 md:p-8 animate-slide-up max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0EBD2B] animate-pulse"></span>
            <h2 className="text-lg font-sans font-bold uppercase tracking-wider text-white">
              {initialData?.tx_id ? "MUTATE / UPDATE LEDGER STATE" : "SECURE MANUAL LEDGER ENTRY"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-white/50 hover:text-white hover:bg-white/10 hover:border-[#0EBD2B]/35 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info label */}
        <div className="bg-[#0EBD2B]/5 border border-[#0EBD2B]/20 text-white/80 rounded-xl p-4 mb-6 hover:bg-[#0EBD2B]/10 transition-all flex items-start gap-3">
          <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#0EBD2B]" />
          <div className="text-xs font-mono leading-relaxed">
            All numerical units will automatically be normalized before committing to the <strong className="text-[#0EBD2B] font-bold">TrustLedger FastAPI Graph</strong> index. Make sure values align with physical delivery details.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Item Name */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 font-bold">Item Description / Name</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 bg-black/30 border border-white/5 rounded-lg text-white font-sans text-sm focus:outline-none focus:border-[#0EBD2B] focus:bg-black/50 transition-all"
                placeholder="e.g. Yellow Maize bags"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>

            {/* Price/Amount (float) */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 font-bold">Total Cost / Amount (₦ NGN)</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 bg-black/30 border border-white/5 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#0EBD2B] focus:bg-black/50 transition-all"
                placeholder="e.g. 45000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 font-bold">Quantity</label>
              <input
                type="number"
                min="1"
                required
                className="w-full px-3 py-2.5 bg-black/30 border border-white/5 rounded-lg text-white font-sans text-sm focus:outline-none focus:border-[#0EBD2B] focus:bg-black/50 transition-all"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            {/* Unit Measure Selector */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 font-bold">Unit Measure</label>
              <select
                className="w-full px-3 py-2.5 bg-black/30 border border-white/5 rounded-lg text-white text-sm font-mono cursor-pointer focus:outline-none focus:border-[#0EBD2B] focus:bg-black/50 transition-all"
                value={unitMeasure}
                onChange={(e) => setUnitMeasure(e.target.value as UnitMeasure)}
              >
                <option value="bag">bag</option>
                <option value="derica">derica</option>
                <option value="paint">paint</option>
                <option value="crate">crate</option>
                <option value="kilo">kilo</option>
                <option value="piece">piece</option>
                <option value="carton">carton</option>
                <option value="item">item</option>
              </select>
            </div>

            {/* Direction Toggle buttons */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 font-bold">Direction</label>
              <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setDirection("SALE")}
                  className={`flex-1 py-1.5 text-xs font-mono uppercase font-bold rounded-md transition-all cursor-pointer ${
                    direction === "SALE"
                      ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  SALE
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("EXPENSE")}
                  className={`flex-1 py-1.5 text-xs font-mono uppercase font-bold rounded-md transition-all cursor-pointer ${
                    direction === "EXPENSE"
                      ? "bg-red-500 text-black shadow-md shadow-red-500/20"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  EXPENSE
                </button>
              </div>
            </div>
          </div>

          {/* Context Notes / Narration */}
          <div>
            <label className="block text-xs font-mono text-white/50 mb-1 font-bold">Context Notes & Narration Details</label>
            <textarea
              className="w-full px-3 py-2.5 bg-black/30 border border-white/5 rounded-lg text-white text-sm font-sans placeholder-white/20 focus:outline-none focus:border-[#0EBD2B] focus:bg-black/50 transition-all h-24"
              placeholder="Provide supply context e.g. Customer, Logistics driver, market location, quality info..."
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 mt-4 rounded-xl text-sm font-mono tracking-wider font-bold uppercase transition-all bg-[#0EBD2B] text-black hover:bg-[#0EBD2B]/90 hover:shadow-lg hover:shadow-[#0EBD2B]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-black" />
            LOCK LEDGER STATE TO GRAPH
          </button>
        </form>
      </div>
    </div>
  );
}
