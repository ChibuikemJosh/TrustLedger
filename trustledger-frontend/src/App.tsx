import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "./firebase"; // Real, live client initialization hook
import { UserProfile, Transaction, AsyncJob } from "./types";
import { TrustLedgerAPI } from "./api";

// --- CORE APP MODULE IMPORTS ---
import SplashView from "./components/SplashView";
import DashboardView from "./components/DashboardView";
import TimelineAuditView from "./components/TimelineAuditView";
import ChatView from "./components/ChatView";
import CasualLaborHub from "./components/CasualLaborHub";
import ManualEntryDrawer from "./components/ManualEntryDrawer";
import BackgroundJobTracker from "./components/BackgroundJobTracker";
import { VoiceLoggingModal, ScanLedgerModal } from "./components/ActionModals";

// --- THEME ICON MATRIX ---
import {
  ShieldAlert,
  Server,
  Layers,
  History,
  Bot,
  Users,
  LogOut,
  Sparkles,
  CheckCircle
} from "lucide-react";

export default function App() {
  // Live State Machine Drivers
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "audit" | "chat" | "labor">("dashboard");

  // Telemetry, Pipeline & Diagnostics States
  const [initializing, setInitializing] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Screen 3 Floating Pipeline Worker Hook Anchor
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Overlay Drawers View Layer toggles
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState<boolean>(false);
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);

  // Condition 3 Selection Data Store Matrix
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // 1. MONITOR AUTHENTICATION STATE & PULL REAL SECURE CRYTOGRAPHIC TOKENS
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userInstance) => {
      setInitializing(true);
      if (userInstance) {
        try {
          // Force fetch clean production signed token string directly from Google Auth Node
          const secureToken = await userInstance.getIdToken(true);
          setFirebaseUser(userInstance);
          setToken(secureToken);
          
          // Execute Initial Synchronized Load Strategy
          await loadDashboard(secureToken);
        } catch (err) {
          console.error("Token verification error setup:", err);
          setErrorText("Security context assignment failed.");
        }
      } else {
        // Purge memory cache frames upon authorization termination
        setFirebaseUser(null);
        setProfile(null);
        setToken(null);
        setTransactions([]);
      }
      setInitializing(false);
    });

    checkBackendHeartbeat();
    return () => unsubscribe();
  }, []);

  // 2. ACTIVE LONG-POLLING RUNTIME SCHEDULER (5-SECOND STATE MATRIX SYNCHRONIZER)
  useEffect(() => {
    if (!token) return;

    const dashboardPoll = setInterval(() => {
      console.log("[POLLING PIPELINE] Syncing /transactions/dashboard...");
      loadDashboard(token, true); // True flag executes continuous silent pipeline reload
    }, 5000);

    return () => clearInterval(dashboardPoll);
  }, [token]);

  const checkBackendHeartbeat = async () => {
    try {
      await fetch("https://trustledger-1.onrender.com/transactions/dashboard", {
        method: "HEAD"
      });
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  };

  const loadDashboard = async (authToken: string | null, silent = false) => {
    if (!authToken) return;
    if (!silent) setLoading(true);
    try {
      const data = await TrustLedgerAPI.fetchDashboard(authToken);
      if (data.user) {
        setProfile(data.user);
      }
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Dashboard core infrastructure alignment error:", err);
      setErrorText("API connection timed out. Sync failure detected.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      setErrorText("Session sign-out mutation error.");
    }
  };

  // 3. SECURE MUTATION LOGS HANDLERS (SCREEN 3 ENGINE MECHANICS)
  const handleLedgerSubmission = async (txData: Partial<Transaction>) => {
    try {
      const isManual = !editingTransaction && !activeJobId;
      await TrustLedgerAPI.confirmTransaction(txData, token, isManual);

      setSuccessToast(`Success: Committed "${txData.item_name}" to ledger graph securely!`);
      setIsManualOpen(false);
      setEditingTransaction(null);
      setActiveJobId(null);

      await loadDashboard(token);
    } catch {
      setErrorText("Transaction pipeline submission sync rejection error.");
    }
  };

  const handleEditMutation = async (txData: Partial<Transaction>) => {
    if (!txData.tx_id) return;
    try {
      await TrustLedgerAPI.updateTransaction(txData.tx_id, txData, token);
      setSuccessToast(`Mutated unverified transaction tx_id: ${txData.tx_id} successfully!`);
      setIsManualOpen(false);
      setEditingTransaction(null);

      await loadDashboard(token);
    } catch {
      setErrorText("Transaction target mutation request failed.");
    }
  };

  const handleTriggerEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsManualOpen(true);
  };

  const handleJobCompleted = (completedJob: AsyncJob) => {
    if (completedJob.extracted_data) {
      setEditingTransaction(completedJob.extracted_data as Transaction);
      setIsManualOpen(true);
    }
    setSuccessToast("Ledger media extraction complete! Verification sheet loaded.");
  };

  const handleJobFailed = (failedJobId: string, errorDescription: string) => {
    setErrorText(`Cyber extraction pipeline failure: ${errorDescription}`);
  };

  const notifyPayoutScoreUpdate = (updatedScore: number) => {
    if (profile) {
      setProfile({ ...profile, trust_score: updatedScore });
    }
    loadDashboard(token, true);
  };

  // Global Toast Timing Automations
  useEffect(() => {
    if (errorText) {
      const timer = setTimeout(() => setErrorText(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorText]);

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Initial App Mount Interceptor Loading Framework
  if (initializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#121212] font-mono text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-9 w-9 animate-spin rounded-xl bg-[#0EBD2B]/10 border border-[#0EBD2B] flex items-center justify-center text-[#0EBD2B]">
            ⚡
          </div>
          <p className="text-xs uppercase tracking-widest text-white/40 font-bold animate-pulse">
            Bootstrapping TrustLedger Security Nodes...
          </p>
        </div>
      </div>
    );
  }

  // UNAUTHENTICATED GATEWAY ENTRY ROUTE (SPLASHVIEW)
  if (!firebaseUser || !profile) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex flex-col justify-between">
        <div className="bg-gray-950/80 border-b border-white/5 py-2.5 px-4 text-center text-[11px] font-mono text-gray-400 flex items-center justify-center gap-2">
          <Server className={`w-3.5 h-3.5 ${apiOnline ? "text-emerald-500" : "text-amber-500 animate-pulse"}`} />
          <span className="uppercase font-bold tracking-wider">
            API SYSTEM GATEWAY STATUS:{" "}
            {apiOnline === null ? "POLLING CORE HEARTBEAT..." : apiOnline ? "ONLINE (https://trustledger-1.onrender.com)" : "ADAPTIVE SANDBOX MODE ACTIVATED"}
          </span>
        </div>

        {errorText && (
          <div className="bg-red-950/40 border-b border-red-500/20 text-red-400 py-3 text-center text-xs font-mono flex items-center justify-center gap-2 px-4">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-bounce" />
            <span>{errorText}</span>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center">
          <SplashView
            onSuccess={async (loggedInUser) => {
              const liveToken = await auth.currentUser?.getIdToken(true);
              setToken(liveToken || null);
              await loadDashboard(liveToken || null);
            }}
            setError={(msg) => setErrorText(msg)}
          />
        </div>
      </div>
    );
  }

  // Dynamic Theme Palette Matrix parsing boundary limits
  const getReputationConfig = (score: number) => {
    if (score <= 60) return { name: "Growing Node", hex: "#9C1908" };
    if (score <= 75) return { name: "Trusted Tier", hex: "#CE6D11" };
    if (score <= 90) return { name: "Established Merchant", hex: "#DDE00D" };
    return { name: "Elite Supplier", hex: "#0EBD2B" };
  };

  const currentReputation = getReputationConfig(profile.trust_score);

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col md:flex-row text-white/90">
      
      {/* SIDEBAR NAVIGATION ENGINE */}
      <aside className="w-full md:w-66 bg-[#1A1A1A] border-r border-white/5 p-6 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: currentReputation.hex }}>
              <div className="w-3 h-3 bg-[#121212] rotate-45 transform" />
            </div>
            <div>
              <h1 className="text-md font-extrabold tracking-tight text-white font-mono uppercase">
                TRUSTLEDGER <span style={{ color: currentReputation.hex }}>CORE</span>
              </h1>
              <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase block font-black">
                SUPPLY ENGINE v2026
              </span>
            </div>
          </div>

          {/* DYNAMIC PROFILE CARD ATTACHMENT */}
          <div className="p-4 bg-black/40 rounded-xl border border-white/5 transition-colors">
            <span className="text-[9px] font-mono text-white/30 uppercase block font-black mb-1">Authenticated Broker</span>
            <div className="text-xs font-extrabold text-white truncate font-sans">{profile.name}</div>
            <div className="text-[10px] font-mono mt-1.5 font-bold flex items-center gap-1.5" style={{ color: currentReputation.hex }}>
              <Sparkles className="w-3 h-3 animate-pulse" /> {currentReputation.name} ({profile.trust_score}/100)
            </div>
          </div>

          <nav className="space-y-2">
            <span className="text-[9px] font-mono text-white/30 tracking-wider uppercase block mb-2 font-bold">
              Ecosystem Maps
            </span>

            {[
              { id: "dashboard", label: "HUD Scoreboard", icon: Layers },
              { id: "audit", label: "Graph Audit Trail", icon: History },
              { id: "chat", label: "Advisor AI Chat", icon: Bot },
              { id: "labor", label: "Workforce Settlement", icon: Users }
            ].map((tabConfig) => {
              const IconComponent = tabConfig.icon;
              const isSelected = activeTab === tabConfig.id;
              return (
                <button
                  key={tabConfig.id}
                  onClick={() => setActiveTab(tabConfig.id as any)}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                    isSelected
                      ? "bg-white text-[#121212] shadow-xl"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <IconComponent className="w-4 h-4 flex-shrink-0" />
                  {tabConfig.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 uppercase select-none font-bold">
            <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
            <span>Gateway: {apiOnline ? "Production Cluster" : "Offline Sandbox"}</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 bg-black/40 border border-white/5 rounded-lg text-[11px] font-mono uppercase text-red-400 hover:text-white hover:bg-red-950/20 hover:border-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out Token
          </button>
        </div>
      </aside>

      {/* COMPONENT VIEWPORT CONTAINER WINDOW */}
      <main className="flex-1 p-6 md:p-8 space-y-6 max-h-screen overflow-y-auto">
        
        {errorText && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-mono flex items-center gap-2.5 shadow-lg">
            <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 animate-bounce" />
            <span>{errorText}</span>
          </div>
        )}

        {successToast && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-mono flex items-center gap-2.5 shadow-lg">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <span className="w-8 h-8 rounded-lg border-2 border-t-transparent animate-spin" style={{ borderColor: currentReputation.hex, borderTopColor: "transparent" }}></span>
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest font-bold animate-pulse">
              Syncing Ledger Nodes From Cluster...
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === "dashboard" && (
              <DashboardView
                user={profile}
                transactions={transactions}
                onOpenVoice={() => setIsVoiceOpen(true)}
                onOpenLedger={() => setIsLedgerOpen(true)}
                onOpenManualEntry={() => {
                  setEditingTransaction(null);
                  setIsManualOpen(true);
                }}
                onNavigateToLabor={() => setActiveTab("labor")}
              />
            )}

            {activeTab === "audit" && (
              <TimelineAuditView
                transactions={transactions}
                onTriggerEdit={handleTriggerEditClick}
              />
            )}

            {activeTab === "chat" && <ChatView token={token} />}

            {activeTab === "labor" && (
              <CasualLaborHub
                token={token}
                onPayoutSuccess={notifyPayoutScoreUpdate}
                setError={(msg) => setErrorText(msg)}
              />
            )}
          </div>
        )}

        {/* SCREEN 3 PIPELINE TASK BACKGROUND TRACKER */}
        <BackgroundJobTracker
          jobId={activeJobId}
          token={token}
          onJobCompleted={handleJobCompleted}
          onJobFailed={handleJobFailed}
          onClearJob={() => setActiveJobId(null)}
        />

        {/* MULTIPART VOICE SUBMISSION CONTROLLER */}
        <VoiceLoggingModal
          isOpen={isVoiceOpen}
          onClose={() => setIsVoiceOpen(false)}
          onTriggerJob={(fileBlob) => {
            setIsVoiceOpen(false);
            TrustLedgerAPI.processVoice(fileBlob, token)
              .then((res) => setActiveJobId(res.job_id))
              .catch(() => setErrorText("Failed to queue async voice processing worker."));
          }}
        />

        {/* MULTIPART SNAPSHOT IMAGE LEDGER PROCESSING CONTROLLER */}
        <ScanLedgerModal
          isOpen={isLedgerOpen}
          onClose={() => setIsLedgerOpen(false)}
          onTriggerJob={(fileBlob) => {
            setIsLedgerOpen(false);
            TrustLedgerAPI.processLedger(fileBlob, token)
              .then((res) => setActiveJobId(res.job_id))
              .catch(() => setErrorText("Failed to queue async image processing worker."));
          }}
        />

        {/* COMPREHENSIVE VERIFICATION LAYER & DRAWER SHEET MUTATOR */}
        <ManualEntryDrawer
          isOpen={isManualOpen}
          onClose={() => {
            setIsManualOpen(false);
            setEditingTransaction(null);
          }}
          initialData={editingTransaction}
          onSubmit={editingTransaction?.tx_id ? handleEditMutation : handleLedgerSubmission}
        />

      </main>
    </div>
  );
}
