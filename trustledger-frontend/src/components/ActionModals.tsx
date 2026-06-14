import React, { useState, useEffect, useRef } from "react";
import { Mic, Camera, X, Play, Square, Loader2, Sparkles, FileText, Check } from "lucide-react";

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerJob: (file: File) => void;
}

export function VoiceLoggingModal({ isOpen, onClose, onTriggerJob }: VoiceModalProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  if (!isOpen) return null;

  const startRecording = () => {
    setDuration(0);
    setRecording(true);
    setSubmitted(false);
  };

  const stopAndSubmit = () => {
    setRecording(false);
    setSubmitted(true);
    
    // Generate a simulated .wav / .mp3 file
    const mockFile = new File(["dummy raw speech binary data"], "nigerian_market_voice_log.wav", {
      type: "audio/wav"
    });
    
    onTriggerJob(mockFile);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const getPresetPhrases = () => {
    return [
      "‘I sold 5 crates of eggs for 15,000 Naira to Aunty Ronke.’",
      "‘Issued raw logistics expense of 45,000 for cocoa transport cargo.’",
      "‘Log 20 paint measures of white garri for 18,000 NGN.’"
    ];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#1A1A1A] border border-white/5 p-6 rounded-2xl shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/40 border border-white/5 text-white/50 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-[#0EBD2B]/10 border border-[#0EBD2B]/20 text-[#0EBD2B] flex items-center justify-center animate-pulse">
            <Mic className="w-6 h-6" />
          </div>
        </div>

        <h3 className="text-md font-sans font-bold text-white uppercase tracking-wider mb-2">
          TrustLedger Quick Voice Log
        </h3>
        <p className="text-xs text-white/50 max-w-xs mx-auto mb-6 leading-relaxed">
          Record cash/trade transactions in Yoruba, Igbo, Hausa, Pidgin, or English. AI parses shorthands (e.g. "12k") automatically.
        </p>

        {/* Waves Animation */}
        <div className="h-16 flex items-center justify-center gap-1.5 mb-6">
          {recording ? (
            Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="w-1 bg-[#0EBD2B] rounded-full transition-all duration-150 animate-bounce"
                style={{
                  height: `${Math.random() * 40 + 10}px`
                }}
              ></span>
            ))
          ) : (
            <div className="text-white/30 font-mono text-[10px] uppercase border border-dashed border-white/5 px-4 py-2 rounded-lg">
              MIC DISCONNECTED • PRESS START
            </div>
          )}
        </div>

        {/* Duration counter */}
        {recording && (
          <div className="text-sm font-mono text-[#0EBD2B] mb-6 tracking-widest font-bold">
            00:{duration < 10 ? `0${duration}` : duration}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          {!recording && !submitted ? (
            <button
              onClick={startRecording}
              className="px-6 py-3 rounded-xl font-mono text-xs font-bold uppercase bg-[#0EBD2B] text-black hover:bg-[#0EBD2B]/90 transition-all shadow-lg shadow-[#0EBD2B]/10 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              START VOICE CAPTURE
            </button>
          ) : recording ? (
            <button
              onClick={stopAndSubmit}
              className="px-6 py-3 rounded-xl font-mono text-xs font-bold uppercase bg-red-600 text-white hover:bg-red-500 transition-all flex items-center gap-2 animate-bounce cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              RELEASE TO ANALYZE
            </button>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold py-2 bg-emerald-500/10 border border-emerald-500/20 px-4 rounded-xl">
              <Check className="w-4 h-4" /> DISPATCHED TO CYBER EXTRACTION
            </div>
          )}
        </div>

        {/* Preset suggestions */}
        <div className="mt-8 pt-4 border-t border-gray-800 text-left">
          <span className="text-[10px] font-mono tracking-wider uppercase text-amber-500 block mb-2 font-semibold">
            Try speaking these preset scenarios:
          </span>
          <div className="space-y-1.5">
            {getPresetPhrases().map((ph, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  startRecording();
                  setTimeout(() => {
                    stopAndSubmit();
                  }, 1200);
                }}
                className="text-[10px] font-mono text-left block w-full px-2.5 py-1.5 bg-gray-950 hover:bg-gray-900 border border-gray-900 rounded text-gray-400 hover:text-white transition-all lines-clamp-1"
              >
                {ph}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerJob: (file: File) => void;
}

export function ScanLedgerModal({ isOpen, onClose, onTriggerJob }: LedgerModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (templateType: string, customFile?: File) => {
    setSelectedTemplate(templateType);
    setUploading(true);

    // Capture the raw file object or generate a high-fidelity template representation
    const fileToUpload = customFile || new File(["dummy ocr image binary text"], `${templateType}_ledger_receipt.png`, {
      type: "image/png"
    });

    setTimeout(() => {
      onTriggerJob(fileToUpload);
      setUploading(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#1A1A1A] border border-white/5 p-6 rounded-2xl shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/40 border border-white/5 text-white/50 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#0EBD2B]/10 border border-[#0EBD2B]/20 text-[#0EBD2B] flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider">
              Scan Ledger Paper snapshot
            </h3>
            <p className="text-[11px] text-white/40">
              Snap farm invoices, hand-drawn paper sheets, or logistical cargo bills.
            </p>
          </div>
        </div>

        {/* Drag and Drop Simulator Box */}
        <div className="p-8 border-2 border-dashed border-white/5 hover:border-[#0EBD2B]/30 bg-black/30 rounded-xl text-center mb-6 transition-all group relative cursor-pointer font-sans">
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleSubmit("custom_upload", e.target.files[0]);
              }
            }}
          />
          <FileText className="w-8 h-8 text-white/20 mx-auto mb-2 group-hover:text-[#0EBD2B] transition-colors" />
          <div className="text-xs font-mono text-white/50 font-bold mb-1">
            Drag photo of sheet or click to upload
          </div>
          <div className="text-[10px] text-white/30 font-mono">
            JPEG, PNG, or PDF format max 10MB
          </div>
        </div>

        {/* Demo Templates selects */}
        <div>
          <span className="text-[10px] font-mono tracking-wider uppercase text-[#0EBD2B] block mb-3 font-bold">
            Or select a premium trader paper bill sample to simulate OCR:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleSubmit("basirat_bill")}
              disabled={uploading}
              className="p-3 bg-black/40 hover:bg-white/[0.02] border border-white/5 hover:border-[#0EBD2B]/30 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="text-xs font-mono font-bold text-white flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#0EBD2B]" /> Invoice #0239 Iya Basirat
              </div>
              <div className="text-[10px] text-white/40 font-mono mt-1">
                Hand-written invoice lines for Maize sacks, volume price: ₦145,000 NGN.
              </div>
            </button>

            <button
              onClick={() => handleSubmit("cocoa_delivery")}
              disabled={uploading}
              className="p-3 bg-black/40 hover:bg-white/[0.02] border border-white/5 hover:border-[#0EBD2B]/30 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="text-xs font-mono font-bold text-white flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Cocoa Transport Bill
              </div>
              <div className="text-[10px] text-white/40 font-mono mt-1">
                Logistics driver expense sheet, fuel clearance value: ₦25,000.
              </div>
            </button>
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 bg-[#1A1A1A]/95 flex flex-col items-center justify-center rounded-2xl">
            <Loader2 className="w-8 h-8 text-[#0EBD2B] animate-spin mb-2" />
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              UPLOADING HIGH-RES BINARY TEXT INDEX...
            </div>
            <div className="text-[10px] text-white/40 font-mono mt-1">
              Establishing token context encryption for secure Fast API payload
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
