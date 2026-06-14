import React, { useState, useEffect } from "react";
import { UserProfile, Transaction, AsyncJob } from "./types";
import { TrustLedgerAPI } from "./api";
import { mockAuthInstance } from "./firebase";
import SplashView from "./components/SplashView";
import DashboardView from "./components/DashboardView";
import TimelineAuditView from "./components/TimelineAuditView";
import ChatView from "./components/ChatView";
import CasualLaborHub from "./components/CasualLaborHub";
import ManualEntryDrawer from "./components/ManualEntryDrawer";
import BackgroundJobTracker from "./components/BackgroundJobTracker";
import { VoiceLoggingModal, ScanLedgerModal } from "./components/ActionModals";
import {
  ShieldAlert,
  Server,
  Layers,
  History,
  Bot,
  Users,
  LogOut,
  Sparkles,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  FileText
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "audit" | "chat" | "labor">("dashboard");

  // Loading and Polling state
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Foreground Job extraction tracker (Screen 3)
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Modals & Drawers controls
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  
  // Selected transaction for edit (Condition 3)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // 1. Monitor auth state and run heartbeat check
  useEffect(() => {
    const unsubscribe = mockAuthInstance.onAuthStateChanged(async (currentUser: any) => {
      if (currentUser) {
        setUser(currentUser);
        setToken(currentUser.token);
        // Initial dashboard refresh
        loadDashboard(currentUser.token);
      } else {
        setUser(null);
        setToken(null);
        setTransactions([]);
      }
    });

    // Check backend heartbeat
    checkBackendHeartbeat();

    return () => unsubscribe();
  }, []);

  // 2. Active Sync long-polling pipeline requirements (Screen 2)
  useEffect(() => {
    if (!token) return;

    // Synchronized pipeline checking server endpoint every 10 seconds for layout state updates
    const dashboardPoll = setInterval(() => {
      console.log("[POLLING PIPELINE] Syncing /transactions/dashboard...");
      loadDashboard(token, true); // silent reload
    }, 10000);

    return () => clearInterval(dashboardPoll);
  }, [token]);

  const checkBackendHeartbeat = async () => {
    try {
      const res = await fetch("https://trustledger-1.onrender.com/transactions/dashboard", {
        method: "HEAD"
      });
      setApiOnline(true);
    } catch {
      setApiOnline(false); // offline / CORS restricted
    }
  };

  const loadDashboard = async (authToken: string | null, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await TrustLedgerAPI.fetchDashboard(authToken);
      if (data.user) {
        setUser(data.user);
      }
      setTransactions(data.transactions);
    } catch (err: any) {
      console.error("Dashboard synchronization error:", err);
      setErrorText("API Server CORS error or Sleeping. Operating inside fully autonomous Local Gateway Simulation.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLogout = async () => {
    await mockAuthInstance.signOut();
  };

  // Submit manual ledger entry OR confirm compiled verification sheet (Screen 3)
  const handleLedgerSubmission = async (txData: Partial<Transaction>) => {
    try {
      const isManual = !editingTransaction && !activeJobId;
      const res = await TrustLedgerAPI.confirmTransaction(txData, token, isManual);
      
      setSuccessToast(`Success: Committed "${txData.item_name}" to graph securely!`);
      setIsManualOpen(false);
      setEditingTransaction(null);
      setActiveJobId(null);

      // Refresh dashboard state
      loadDashboard(token);
    } catch {
      setErrorText("Transaction submission index sync error.");
    }
  };

  // Triggered when editing unverified state (Condition 3)
  const handleEditMutation = async (txData: Partial<Transaction>) => {
    if (!txData.tx_id) return;
    try {
      await TrustLedgerAPI.updateTransaction(txData.tx_id, txData, token);
      setSuccessToast(`Mutated unverified transaction tx_id: ${txData.tx_id} successfully!`);
      setIsManualOpen(false);
      setEditingTransaction(null);

      // Refresh dashboard state
      loadDashboard(token);
    } catch {
      setErrorText("Transaction mutation edit request failed.");
    }
  };

  const handleTriggerEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsManualOpen(true);
  };

  // Job status callbacks (Screen 3)
  const handleJobCompleted = (completedJob: AsyncJob) => {
    if (completedJob.extracted_data) {
      // Pre-populate sheet and trigger drawer modal
      setEditingTransaction(completedJob.extracted_data as Transaction);
      setIsManualOpen(true);
    }
    setSuccessToast("Ledger media analyze complete! Please verify extraction parameters.");
  };

  const handleJobFailed = (failedJobId: string, errorText: string) => {
    setErrorText(`Cyber extraction failure: ${errorText}`);
  };

  const notifyPayoutScoreUpdate = (updatedScore: number) => {
    if (user) {
      setUser({
        ...user,
        trust_score: updatedScore
      });
    }
    // reload to catch fresh log node
    loadDashboard(token, true);
  };

  // Setup diagnostic banner dismissing
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

  // If unauthenticated: Splash & intuitive registration form
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0e0e0e]">
        {/* Diagnostic connection banner for user visibility */}
        <div className="bg-gray-950/80 border-b border-gray-900 py-2.5 px-4 text-center text-xs font-mono text-gray-400 flex items-center justify-center gap-2">
          <Server className={`w-3.5 h-3.5 ${apiOnline ? "text-emerald-500" : "text-amber-500 animate-pulse"}`} />
          <span>
            API CLUSTER HEARTBEAT STATUS:{" "}
            {apiOnline === null ? "CHECKING HEARTBEAT CODE..." : apiOnline ? "ONLINE (https://trustledger-1.onrender.com)" : "ADAPTIVE SANDBOX CORE FALLBACKS ENGAGED"}
          </span>
        </div>

        {errorText && (
          <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 py-3 text-center text-xs font-mono flex items-center justify-center gap-2 px-4 shadow-lg">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-bounce" />
            <span>{errorText}</span>
          </div>
        )}

        <SplashView
          onSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            setToken(loggedInUser.token);
            setSuccessToast(`Welcome to TrustLedger, logged in as ${loggedInUser.name}`);
            loadDashboard(loggedInUser.token);
          }}
          setError={(msg) => setErrorText(msg)}
        />
      </div>
    );
  }

  // Authenticated State Layout Core
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col md:flex-row text-white/90">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#1A1A1A] border-r border-white/10 p-6 flex flex-col justify-between hover:border-white/20 transition-all flex-shrink-0">
        <div className="space-y-8">
          {/* Sidebar Chain Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0EBD2B] rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#121212]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-md font-extrabold tracking-tight text-white font-mono uppercase">
                TRUSTLEDGER <span className="text-[#0EBD2B] font-black">CORE</span>
              </h1>
              <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase block font-semibold">
                SYSTEM INTERFACE
              </span>
            </div>
          </div>

          {/* Connected User Badge detail */}
          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-[10px] font-mono text-white/40 uppercase block font-bold mb-1">Authenticated Broker</span>
            <div className="text-xs font-bold text-white truncate">{user.name}</div>
            <div className="text-[10px] font-mono text-[#0EBD2B] mt-1 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#0EBD2B] animate-pulse" /> Score: {user.trust_score} / 100
            </div>
          </div>

          {/* Router State Buttons list */}
          <nav className="space-y-1.5">
            <span className="text-[9px] font-mono text-white/30 tracking-wider uppercase block mb-2 font-bold select-none">
              Ecosystem Views
            </span>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === "dashboard"
                  ? "bg-[#0EBD2B] text-[#121212] shadow-md shadow-[#0EBD2B]/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Layers className="w-4 h-4 flex-shrink-0" />
              HUD Scoreboard
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === "audit"
                  ? "bg-[#0EBD2B] text-[#121212] shadow-md shadow-[#0EBD2B]/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <History className="w-4 h-4 flex-shrink-0" />
              Graph Audit Timeline
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === "chat"
                  ? "bg-[#0EBD2B] text-[#121212] shadow-md shadow-[#0EBD2B]/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Bot className="w-4 h-4 flex-shrink-0" />
              Advisor AI Chat
            </button>

            <button
              onClick={() => setActiveTab("labor")}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all text-left ${
                activeTab === "labor"
                  ? "bg-[#0EBD2B] text-[#121212] shadow-md shadow-[#0EBD2B]/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              Workforce settling
            </button>
          </nav>
        </div>

        {/* Heartbeat Status and logout action in sidebar bottom */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 uppercase select-none">
            <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-[#0EBD2B]" : "bg-amber-500 animate-pulse"}`}></span>
            <span>Gateway: {apiOnline ? "FastAPI Connected" : "Local Gateway"}</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 bg-black/40 border border-white/5 rounded-lg text-[11px] font-mono uppercase text-red-400 hover:text-white hover:bg-red-950/20 hover:border-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out Token
          </button>
        </div>
      </aside>

      {/* MAIN LAYOUT */}
      <main className="flex-1 p-6 md:p-8 space-y-6 max-h-screen overflow-y-auto">
        
        {/* Banner notifications */}
        {errorText && (
          <div className="bg-red-500/15 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs font-mono flex items-center gap-2.5 shadow-lg relative">
            <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 animate-bounce" />
            <span>{errorText}</span>
          </div>
        )}

        {successToast && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-xs font-mono flex items-center gap-2.5 shadow-lg relative animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* SCREEN ROUTER */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <span className="w-10 h-10 rounded-xl bg-[#0EBD2B]/10 border border-[#0EBD2B]/30 flex items-center justify-center text-[#0EBD2B] animate-spin">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest animate-pulse">
              Syncing Graph Ledger Nodes...
            </div>
          </div>
        ) : (
          <div>
            {activeTab === "dashboard" && (
              <DashboardView
                user={user}
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

        {/* Absolute floating system process indicators (Screen 3) */}
        <BackgroundJobTracker
          jobId={activeJobId}
          token={token}
          onJobCompleted={handleJobCompleted}
          onJobFailed={handleJobFailed}
          onClearJob={() => setActiveJobId(null)}
        />

        {/* MODAL WINDOWS CONTROLS */}
        
        {/* Voice process Modal */}
        <VoiceLoggingModal
          isOpen={isVoiceOpen}
          onClose={() => setIsVoiceOpen(false)}
          onTriggerJob={(file) => {
            TrustLedgerAPI.processVoice(file, token)
              .then((res) => {
                setActiveJobId(res.job_id);
              })
              .catch((err) => {
                setErrorText("Failed to queue voice processing pipeline.");
              });
          }}
        />

        {/* Photo snapshot scan Modal */}
        <ScanLedgerModal
          isOpen={isLedgerOpen}
          onClose={() => setIsLedgerOpen(false)}
          onTriggerJob={(file) => {
            TrustLedgerAPI.processLedger(file, token)
              .then((res) => {
                setActiveJobId(res.job_id);
              })
              .catch((err) => {
                setErrorText("Failed to queue ledger scan processing pipeline.");
              });
          }}
        />

        {/* Drawer Manual Entry Form OR Transaction Verification Sheet */}
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
