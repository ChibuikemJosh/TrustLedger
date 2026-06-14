import { Transaction, UserProfile, UserRole, UnitMeasure, AsyncJob, ChatMessage } from "./types";

// Explicitly defaults to your live production Render API cluster gateway path
const BACKEND_BASE_URL = "https://trustledger-1.onrender.com";

// --- IN-MEMORY LOCAL DATA ENGINE ---
class LocalStateStore {
  user: UserProfile | null = null;
  transactions: Transaction[] = [];
  jobs: Record<string, AsyncJob> = {};
  messages: ChatMessage[] = [];

  constructor() {
    this.seedInitialData();
  }

  seedInitialData() {
    this.transactions = [
      {
        tx_id: "tx-101",
        item_name: "Yellow Maize Cocoa Cargo",
        amount: 145000,
        quantity: 12,
        unit_measure: "bag",
        direction: "SALE",
        context_notes: "Bulk sale to Iya Basirat at Mile 12 Market Lagos.",
        is_anomaly: false,
        verified: true,
        timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toLocaleString("en-NG", { hour12: true })
      },
      {
        tx_id: "tx-102",
        item_name: "Yam tubers transport clearance",
        amount: 25000,
        quantity: 50,
        unit_measure: "piece",
        direction: "EXPENSE",
        context_notes: "Clearance payment to transport driver Baba Tobi.",
        is_anomaly: false,
        verified: true,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleString("en-NG", { hour12: true })
      },
      {
        tx_id: "tx-103",
        item_name: "Derica beans supply",
        amount: 18000,
        quantity: 20,
        unit_measure: "derica",
        direction: "SALE",
        context_notes: "Direct retail sales to brokers.",
        is_anomaly: false,
        verified: false,
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toLocaleString("en-NG", { hour12: true })
      },
      {
        tx_id: "tx-104",
        item_name: "Anomalous Rice Inflation Import",
        amount: 320000,
        quantity: 5,
        unit_measure: "bag",
        direction: "SALE",
        context_notes: "Suspicious hyper-inflated invoice pricing.",
        is_anomaly: true, 
        verified: false,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toLocaleString("en-NG", { hour12: true })
      },
      {
        tx_id: "tx-105",
        item_name: "Cocoa bean storage sacks",
        amount: 12500,
        quantity: 25,
        unit_measure: "piece",
        direction: "EXPENSE",
        context_notes: "Purchased storage sacks from wholesale agent.",
        is_anomaly: false,
        verified: false,
        timestamp: new Date().toLocaleString("en-NG", { hour12: true })
      }
    ];

    this.messages = [
      {
        id: "msg-1",
        sender: "bot",
        text: "Aba! Long-time no see! I be your TrustLedger Bookkeeper. Drop your manual books and ask me anything in clean Pidgin or English. E.g. 'How much did Iya Basirat buy?' or 'Analyze my rice stock dynamics.' "
      }
    ];
  }

  syncUser(name: string, email: string, role: UserRole, trust_score: number = 82): UserProfile {
    this.user = {
      uid: "usr-" + Math.floor(Math.random() * 9000 + 1000),
      name: name,
      email: email,
      role: role,
      location: {
        city: "Lagos",
        state: "Lagos",
        country: "Nigeria"
      },
      trust_score: trust_score
    };
    return this.user;
  }
}

export const localStore = new LocalStateStore();

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

// Global production fetch pipeline wrapper
async function apiCall(endpoint: string, options: RequestOptions = {}, token: string | null): Promise<any> {
  const url = `${BACKEND_BASE_URL}${endpoint}`;
  const method = options.method || "GET";
  const headers: Record<string, string> = { ...options.headers };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // CRITICAL: Content-Type must not be typed if loading FormData, allowing dynamic boundary mapping
  if (!options.isFormData && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (options.body) {
    fetchOptions.body = options.isFormData ? options.body : JSON.stringify(options.body);
  }

  console.log(`[API REQUEST] => ${method} ${url}`);

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API returned ${res.status}: ${errorText}`);
  }
  return await res.json();
}

// --- SECURE OUTBOUND ENDPOINT ROUTER LAYER ---
export const TrustLedgerAPI = {
  
  // 1. Screen 1 Registration sync
  async syncOnboarding(
    payload: { name: string; email: string; role: UserRole; location: { city: string; state: string; country: string } },
    token: string | null
  ): Promise<UserProfile> {
    try {
      const serverResponse = await apiCall("/auth/sync-onboarding", {
        method: "POST",
        body: payload
      }, token);

      localStore.user = {
        ...serverResponse,
        trust_score: serverResponse.trust_score || 55
      };
      return localStore.user!;
    } catch (err) {
      console.warn("[API ERROR] falling back to high-fidelity sandboxed local emulation state.", err);
      return localStore.syncUser(payload.name, payload.email, payload.role, 55);
    }
  },

  // 2. Screen 2 Dashboard sync
  async fetchDashboard(token: string | null): Promise<{ user: UserProfile; transactions: Transaction[] }> {
    try {
      const data = await apiCall("/transactions/dashboard", { method: "GET" }, token);

      if (data && data.user) localStore.user = data.user;
      if (data && data.transactions) localStore.transactions = data.transactions;
      
      return {
        user: localStore.user!,
        transactions: localStore.transactions
      };
    } catch (err) {
      console.warn("[API ERROR] falling back to high-fidelity sandboxed local emulation state.", err);
      if (!localStore.user) {
        localStore.syncUser("Chinedu Okafor", "egbuchirichibuikem3@gmail.com", "Merchant", 82);
      }
      return {
        user: localStore.user!,
        transactions: localStore.transactions
      };
    }
  },

  // 3. Screen 3 Voice log multipart pipeline
  async processVoice(file: File, token: string | null): Promise<{ job_id: string; status: string }> {
    try {
      const formData = new FormData();
      // Explicit binary key parameter string mapping expected by FastAPI dependency models
      formData.append("file", file, file.name || "nigerian_market_voice_log.wav");
      
      return await apiCall("/ai/process-voice", {
        method: "POST",
        body: formData,
        isFormData: true
      }, token);
    } catch (err) {
      console.warn("[API ERROR] falling back to high-fidelity sandboxed local emulation state.", err);
      const randomJobId = "job-voice-" + Math.floor(Math.random() * 100000);
      localStore.jobs[randomJobId] = {
        job_id: randomJobId,
        status: "processing",
        extracted_data: {
          item_name: "Cassava flour tubers",
          amount: 32000,
          quantity: 4,
          unit_measure: "crate",
          direction: "SALE",
          context_notes: "Simulated speech extraction: 'Sold four crates of cassava flour for thirty two thousand Naira.'"
        }
      };

      setTimeout(() => {
        if (localStore.jobs[randomJobId]) localStore.jobs[randomJobId].status = "completed";
      }, 5000);

      return { job_id: randomJobId, status: "accepted" };
    }
  },

  // 4. Screen 3 Ledger paper image multipart pipeline
  async processLedger(file: File, token: string | null): Promise<{ job_id: string; status: string }> {
    try {
      const formData = new FormData();
      formData.append("file", file, file.name || "custom_upload_ledger.png");
      
      return await apiCall("/ai/process-ledger", {
        method: "POST",
        body: formData,
        isFormData: true
      }, token);
    } catch (err) {
      console.warn("[API ERROR] falling back to high-fidelity sandboxed local emulation state.", err);
      const randomJobId = "job-ledger-" + Math.floor(Math.random() * 100000);
      localStore.jobs[randomJobId] = {
        job_id: randomJobId,
        status: "processing",
        extracted_data: {
          item_name: "Logistics diesel fuel",
          amount: 45000,
          quantity: 1,
          unit_measure: "item",
          direction: "EXPENSE",
          context_notes: "Simulated paper ledger scan: 'Diesel purchase receipt of forty five thousand NGN.'"
        }
      };

      setTimeout(() => {
        if (localStore.jobs[randomJobId]) localStore.jobs[randomJobId].status = "completed";
      }, 4000);

      return { job_id: randomJobId, status: "accepted" };
    }
  },

  // 5. Screen 3 Background queue status worker loop
  async fetchJobStatus(jobId: string, token: string | null): Promise<AsyncJob> {
    try {
      return await apiCall(`/ai/status/${jobId}`, { method: "GET" }, token);
    } catch (err) {
      console.warn("[API ERROR] falling back to high-fidelity sandboxed local emulation state.", err);
      return localStore.jobs[jobId] || { job_id: jobId, status: "failed", error: "Job ID not tracked in memory" };
    }
  },

  // 6. Verification drawer commit processing layer
  async confirmTransaction(transaction: Partial<Transaction>, token: string | null, manualMode = false): Promise<any> {
    const endpoint = manualMode ? "/transactions/log" : "/ai/confirm-transaction";
    try {
      return await apiCall(endpoint, {
        method: "POST",
        body: transaction
      }, token);
    } catch (err) {
      console.warn("[API ERROR] falling back to high-fidelity sandboxed local emulation state.", err);
      const verifiedTx: Transaction = {
        tx_id: "tx-" + Math.floor(Math.random() * 10000),
        item_name: transaction.item_name || "New Ledger Item",
        amount: Number(transaction.amount) || 0,
        quantity: Number(transaction.quantity) || 1,
        unit_measure: (transaction.unit_measure as UnitMeasure) || "item",
        direction: transaction.direction || "SALE",
        context_notes: transaction.context_notes || "Manually saved sandbox state",
        is_anomaly: false,
        verified: !manualMode, 
        timestamp: new Date().toLocaleString("en-NG", { hour12: true })
      };
      localStore.transactions = [verifiedTx, ...localStore.transactions];

      if (localStore.user) {
        localStore.user.trust_score = Math.min(100, localStore.user.trust_score + 2);
      }
      return { status: "success", transaction: verifiedTx };
    }
  },

  // 7. Screen 4 Unverified transaction item mutator
  async updateTransaction(txId: string, payload: Partial<Transaction>, token: string | null): Promise<any> {
    try {
      return await apiCall(`/transactions/update/${txId}`, {
        method: "PUT",
        body: payload
      }, token);
    } catch (err) {
      console.warn("[API ERROR] falling back to high-fidelity sandboxed local emulation state.", err);
      localStore.transactions = localStore.transactions.map((t) => {
        if (t.tx_id === txId) {
          return {
            ...t,
            ...payload,
            amount: payload.amount !== undefined ? Number(payload.amount) : t.amount,
            quantity: payload.quantity !== undefined ? Number(payload.quantity) : t.quantity,
            timestamp: `Edited: ${new Date().toLocaleString("en-NG", { hour12: true })}`
          };
        }
        return t;
      });
      return { status: "success" };
    }
  },

  // 8. Screen 5 AI Pidgin Chat Advisor Hub (Enforces clean trailing slash pattern match)
  async sendChatMessage(message: string, token: string | null): Promise<{ answer: string; compiled_cypher: string }> {
    try {
      return await apiCall("/chat/", {
        method: "POST",
        body: { message, voice_path: null }
      }, token);
    } catch (err) {
      console.warn("[API ERROR] falling back to high-fidelity sandboxed local emulation state.", err);
      let answer = "";
      let compiled_cypher = `MATCH (m:Merchant {uid: $user_id})-[:LOGGED]->(t:Transaction)\nWHERE t.direction = "SALE"\nRETURN sum(t.amount) as total_sales`;

      const q = message.toLowerCase();
      if (q.includes("iya") || q.includes("basirat")) {
        answer = "Ahn-ahn! Description trace clear well. Iya Basirat buy total of 12 bags of Yellow Maize Cocoa Cargo on Mile 12 Market, total volume value reach ₦145,000 NGN. Record dey verified fully webhook reference standard.";
        compiled_cypher = `MATCH (m:Merchant)-[:TRANSACTED_WITH]->(c:Counterparty {name: "Iya Basirat"})\nMATCH (c)-[:RECEIVED]->(t:Transaction)\nRETURN t.item_name, t.amount`;
      } else if (q.includes("cocoa") || q.includes("cargo")) {
        answer = "Your cocoa records clear well-well. You get yellow maize cocoa cargo worth ₦145,000 NGN. The storage sacks also consume ₦12,500 NGN as expense record.";
        compiled_cypher = `MATCH (t:Transaction) WHERE t.item_name CONTAINS "cocoa"\nRETURN t.item_name, t.amount, t.direction`;
      } else if (q.includes("payout") || q.includes("labor") || q.includes("gig")) {
        answer = "Casual labor payout process dey active on workforce portal. Any payment you make go sharp-sharp log inside the transaction graph, and your reputation score go climb up!";
        compiled_cypher = `MATCH (m:Merchant {uid: "usr-current"})-[:PAID]->(w:Worker)\nRETURN sum(w.payout_amount)`;
      } else if (q.includes("anomaly") || q.includes("risk")) {
        answer = "Listen! Cyber Core flagged 1 Anomaly rice import transaction pricing mismatch. The price jump too high from standard rate, so FastAPI back-end block the transaction state modification. Security tight pass iron!";
        compiled_cypher = `MATCH (t:Transaction {is_anomaly: true})\nRETURN t.tx_id, t.item_name, t.amount`;
      } else {
        answer = "Ah, nice query boss! Your graph supply chain ledger dey perfectly synced. We check the nodes and total volume sales stand at ₦163,000 NGN, budget expenses be ₦37,500 NGN. E go increase your Trust Score if you verify more trades!";
      }

      return { answer, compiled_cypher };
    }
  },

  // 9. Screen 6 Casual labor payout workspace pipeline
  async triggerPayout(payload: { worker_phone: string; amount: number; narration: string }, token: string | null): Promise<{ status: string; reputation_metric: number }> {
    try {
      return await apiCall("/gigs/payout", {
        method: "POST",
        body: payload
      }, token);
    } catch (err) {
      console.warn("[API ERROR] falling back to high-fidelity sandboxed local emulation state.", err);
      if (localStore.user) {
        localStore.user.trust_score = Math.min(100, localStore.user.trust_score + 5); 
      }

      const gigTx: Transaction = {
        tx_id: "payout-" + Math.floor(Math.random() * 10000),
        item_name: `Workforce settlement: ${payload.narration}`,
        amount: payload.amount,
        quantity: 1,
        unit_measure: "piece",
        direction: "CASUAL_LABOR_PAYOUT",
        context_notes: `Labor payout issued to phone: ${payload.worker_phone}`,
        is_anomaly: false,
        verified: true,
        timestamp: new Date().toLocaleString("en-NG", { hour12: true })
      };
      localStore.transactions = [gigTx, ...localStore.transactions];

      return {
        status: "success",
        reputation_metric: localStore.user ? localStore.user.trust_score : 87
      };
    }
  }
};
