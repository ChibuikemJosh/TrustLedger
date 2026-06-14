import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

let app;
let auth: any;
let isMock = false;

try {
  // If the user hasn't configured real firebase, or config is mock, run in high-fidelity sandbox mode
  if (firebaseConfig.apiKey === "mock_api_key_trustledger_nigeria_2026" || !firebaseConfig.apiKey) {
    isMock = true;
  } else {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  }
} catch (e) {
  console.warn("Firebase failed to initialize, switching to simulation mode:", e);
  isMock = true;
}

export { auth, isMock };

// Create a highly robust Mock Auth Interface that acts exactly like real Firebase Auth
// to avoid any sandbox initialization crashes while allowing authentic Firebase Authentication
// if configured.
export class TrustLedgerMockAuth {
  currentUser: any = null;
  private listeners: Array<(user: any) => void> = [];

  constructor() {
    // Check if there is a cached simulated user in localStorage
    const cached = localStorage.getItem("trust_ledger_simulated_user");
    if (cached) {
      try {
        this.currentUser = JSON.parse(cached);
      } catch (err) {
        this.currentUser = null;
      }
    }
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    // Immediately fire with current state
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  async mockSignIn(email: string, role: "Merchant" | "Agent" | "Supplier", score = 82) {
    const user = {
      uid: "mock-uid-" + role.toLowerCase() + "-" + Math.floor(Math.random() * 1000),
      email: email,
      displayName: `Ecosystem ${role}`,
      token: "mock-firebase-id-token-xyz-123",
      emailVerified: true,
      role: role,
      trust_score: score,
      location: {
        city: role === "Merchant" ? "Lagos" : role === "Agent" ? "Kano" : "Port Harcourt",
        state: role === "Merchant" ? "Lagos State" : role === "Agent" ? "Kano State" : "Rivers State",
        country: "Nigeria"
      }
    };
    this.currentUser = user;
    localStorage.setItem("trust_ledger_simulated_user", JSON.stringify(user));
    this.notify();
    return user;
  }

  async getIdToken() {
    return this.currentUser?.token || "mock-bearer-token-val-999";
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem("trust_ledger_simulated_user");
    this.notify();
  }

  private notify() {
    this.listeners.forEach((callback) => callback(this.currentUser));
  }
}

export const mockAuthInstance = new TrustLedgerMockAuth();
