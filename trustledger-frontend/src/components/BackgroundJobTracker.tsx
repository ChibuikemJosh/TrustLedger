import React, { useEffect, useState } from "react";
import { AsyncJob } from "../types";
import { TrustLedgerAPI } from "../api";
import { Loader2, AlertTriangle, Cpu, CheckCircle2, ShieldAlert } from "lucide-react";

interface BackgroundJobTrackerProps {
  jobId: string | null;
  token: string | null;
  onJobCompleted: (jobData: AsyncJob) => void;
  onJobFailed: (jobId: string, error: string) => void;
  onClearJob: () => void;
}

export default function BackgroundJobTracker({
  jobId,
  token,
  onJobCompleted,
  onJobFailed,
  onClearJob
}: BackgroundJobTrackerProps) {
  const [jobState, setJobState] = useState<AsyncJob | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJobState(null);
      return;
    }

    // Set initial processing state representation
    setJobState({
      job_id: jobId,
      status: "processing"
    });

    let isSubscribed = true;
    const pollInterval = setInterval(async () => {
      try {
        const responseData = await TrustLedgerAPI.fetchJobStatus(jobId, token);
        if (!isSubscribed) return;

        setJobState(responseData);

        if (responseData.status === "completed") {
          clearInterval(pollInterval);
          setTimeout(() => {
            onJobCompleted(responseData);
          }, 1000);
        } else if (responseData.status === "failed") {
          clearInterval(pollInterval);
          onJobFailed(jobId, responseData.error || "Cyber core failed to parse raw speech audio elements.");
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        // Keep polling even if transient network fails
        console.warn("Polling encounter error, retrying...", err);
      }
    }, 2000); // 2 seconds poll requirement

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [jobId, token]);

  if (!jobId || !jobState) return null;

  const isFailed = jobState.status === "failed";
  const isCompleted = jobState.status === "completed";

  return (
    <div className={`fixed bottom-6 right-6 z-40 max-w-sm w-full p-4 rounded-xl border bg-[#1A1A1A] shadow-2xl transition-all duration-300 transform translate-y-0 ${
      isFailed
        ? "border-red-600 outline-2 outline-red-500/30 ring-2 ring-red-500/20"
        : isCompleted
        ? "border-emerald-500"
        : "border-[#0EBD2B]/60"
    }`}>
      <div className="flex items-start gap-3">
        {/* Spinner / Icon */}
        <div className="mt-0.5">
          {isFailed ? (
            <ShieldAlert className="w-5 h-5 text-red-500 animate-bounce" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <Loader2 className="w-5 h-5 text-[#0EBD2B] animate-spin" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              {isFailed ? "PIPELINE ABORTED" : isCompleted ? "PARSED SECURELY" : "AI PROCESSING LEDGER MEDIA"}
            </span>
            <span className="text-[9px] font-mono text-white/30">
              JOB IND: {jobId.slice(0, 15)}...
            </span>
          </div>

          <p className="text-[11px] text-white/50 font-mono leading-relaxed">
            {isFailed
              ? "Cyber Core rejected binary formats or extracted no ledger structures."
              : isCompleted
              ? "Mapping parsed floats into editable verification drawer..."
              : "Analyzing sound waves & pattern boundaries with FastAPI clusters."}
          </p>

          {isFailed && (
            <div className="bg-red-500/10 border border-red-500/20 p-2 rounded text-[10px] font-mono text-red-400 select-all mt-2 max-h-16 overflow-y-auto">
              {jobState.error || "Error code: 400 Bad Request Payload"}
            </div>
          )}

          {/* Action to dismiss if failed */}
          {(isFailed || isCompleted) && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={onClearJob}
                className="text-[10px] uppercase font-mono tracking-wider font-bold text-white/40 hover:text-white cursor-pointer"
              >
                DISMISS TRACKER
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
