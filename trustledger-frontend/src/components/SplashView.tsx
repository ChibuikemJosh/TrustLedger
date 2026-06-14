import React, { useState } from "react";
import { UserRole } from "../types";
import { auth, isMock, mockAuthInstance } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { TrustLedgerAPI } from "../api";
import { ShieldCheck, Layers, Landmark, Activity, User, Phone, MapPin, Key, Mail, Sparkles } from "lucide-react";

interface SplashViewProps {
  onSuccess: (user: any) => void;
  setError: (msg: string) => void;
}

export default function SplashView({ onSuccess, setError }: SplashViewProps) {
  const [isRegister, setIsRegister] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("Merchant");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const handleValidation = (): boolean => {
    if (!name.trim()) {
      setError("Please enter your full name.");
      return false;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please provide a valid email address.");
      return false;
    }
    if (password.length < 6) {
      setError("Password must containing at least 6 characters.");
      return false;
    }

    // Phone matching Nigeria format
    // +234 followed by 10 digits OR regional zeroes start with 070, 080, 090, 081
    const cleanPhone = phone.replace(/\s+/g, "");
    const nigeriaPhoneRegex = /^(?:\+234\d{10}|070\d{8}|080\d{8}|090\d{8}|081\d{8})$/;
    if (!nigeriaPhoneRegex.test(cleanPhone)) {
      setError("Invalid Phone format. Use +234... or nigerian regional prefixes like 070, 080, 090, 081 followed by 8 digits.");
      return false;
    }

    if (!city.trim() || !state.trim()) {
      setError("Please specify both your City and State of operations.");
      return false;
    }

    return true;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleValidation()) return;

    setLoading(true);
    try {
      let activeToken = "mock-firebase-id-token-xyz-123";
      let activeUid = "mock-uid-" + role.toLowerCase() + "-" + Math.floor(Math.random() * 1000);

      if (!isMock && auth) {
        // Real authenticated flow request
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        activeUid = userCredential.user.uid;
        activeToken = await userCredential.user.getIdToken();
      } else {
        // Fallback or Sandbox mock state setup
        const mockResult = await mockAuthInstance.mockSignIn(email, role, 55);
        activeToken = mockResult.token;
        activeUid = mockResult.uid;
      }
      
      // 2. Dispatch onboarding sync request
      const syncedProfile = await TrustLedgerAPI.syncOnboarding({
        name,
        email,
        role,
        location: {
          city,
          state,
          country: "Nigeria"
        }
      }, activeToken);

      onSuccess({
        uid: activeUid,
        email,
        displayName: name,
        token: activeToken,
        role,
        ...syncedProfile
      });
    } catch (err: any) {
      setError(err?.message || "Onboarding database sync failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = async (roleType: UserRole, defaultScore: number, presetName: string, customCity: string, customState: string) => {
    setLoading(true);
    try {
      const emailSim = `${presetName.toLowerCase().replace(/\s+/g, "")}@trustledger.ng`;
      const mockResult = await mockAuthInstance.mockSignIn(emailSim, roleType, defaultScore);
      
      const syncedProfile = await TrustLedgerAPI.syncOnboarding({
        name: presetName,
        email: emailSim,
        role: roleType,
        location: {
          city: customCity,
          state: customState,
          country: "Nigeria"
        }
      }, mockResult.token);

      onSuccess({ 
        ...mockResult, 
        ...syncedProfile, 
        trust_score: defaultScore,
        name: presetName,
        location: { city: customCity, state: customState, country: "Nigeria" }
      });
    } catch (err: any) {
      setError("Preset onboarding failure.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-[#121212] text-white/90">
      <div className="w-full max-w-xl p-8 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Abstract Geometric node-chain background graphic */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0EBD2B]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* LOGO */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-[#0EBD2B] rounded-xl flex items-center justify-center mb-4 flex-shrink-0">
            <svg className="w-6 h-6 text-[#121212]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1 font-mono uppercase">
            TRUSTLEDGER <span className="text-[#0EBD2B] font-black">CORE</span>
          </h1>
          <p className="text-[10px] tracking-wider uppercase text-white/40 font-mono">
            Supply Chain Graph Settlement Engine
          </p>
        </div>

        {/* PRESET CHOOSE BAR */}
        <div className="mb-6 p-4 rounded-xl bg-black/40 border border-white/5">
          <h3 className="text-xs font-bold tracking-wider text-[#0EBD2B] uppercase font-mono mb-3 flex items-center gap-1.5 justify-center">
            <Sparkles className="w-4 h-4 text-[#0EBD2B] animate-pulse" />
            Instant Sandbox Tester Presets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handlePresetSelect("Merchant", 54, "Aliyu Dangote", "Kano", "Kano State")}
              className="px-3 py-2 text-left bg-white/[0.02] hover:bg-white/5 rounded-lg text-xs font-mono transition-all border border-red-500/20 hover:border-red-500/50 cursor-pointer"
            >
              <div className="font-bold text-red-400">Growing Node</div>
              <div className="text-white/80 mt-0.5">Aliyu (Kano)</div>
              <div className="text-[10px] text-white/40">Score 54 • Tier 1</div>
            </button>

            <button
              onClick={() => handlePresetSelect("Merchant", 82, "Iya Basirat", "Lagos", "Lagos State")}
              className="px-3 py-2 text-left bg-white/[0.02] hover:bg-white/5 rounded-lg text-xs font-mono transition-all border border-orange-500/20 hover:border-orange-500/50 cursor-pointer"
            >
              <div className="font-bold text-orange-400">Established</div>
              <div className="text-white/80 mt-0.5">Basirat (Lagos)</div>
              <div className="text-[10px] text-white/40">Score 82 • Tier 3</div>
            </button>

            <button
              onClick={() => handlePresetSelect("Supplier", 96, "Emeka Ojukwu", "Port Harcourt", "Rivers State")}
              className="px-3 py-2 text-left bg-white/[0.02] hover:bg-white/5 rounded-lg text-xs font-mono transition-all border border-[#0EBD2B]/20 hover:border-[#0EBD2B] cursor-pointer"
            >
              <div className="font-bold text-[#0EBD2B]">Elite Supplier</div>
              <div className="text-white/80 mt-0.5">Emeka (PH)</div>
              <div className="text-[10px] text-white/40">Score 96 • Tier 4</div>
            </button>
          </div>
          <div className="text-center font-mono text-[9px] text-white/30 mt-3 select-none">
            Select a preset to inspect different reputation gauges instantly, or sign up below
          </div>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-4 text-white/30 font-mono text-xs uppercase font-bold select-none">OR REGISTER ACCOUNT</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        {/* REGISTRATION FORM */}
        <form onSubmit={handleSignupSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Full Name
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/5 text-white placeholder-white/30 focus:outline-none focus:border-[#0EBD2B] text-sm font-sans"
                placeholder="e.g. Iya Basirat"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Email Address
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/5 text-white placeholder-white/30 focus:outline-none focus:border-[#0EBD2B] text-sm font-sans"
                placeholder="user@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> Password
              </label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/5 text-white placeholder-white/30 focus:outline-none focus:border-[#0EBD2B] text-sm font-sans"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Phone (regex checker) */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Nigerian Phone
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/5 text-white placeholder-white/30 focus:outline-none focus:border-[#0EBD2B] text-sm font-mono"
                placeholder="e.g. +2348031234567 or 080..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Role selector dropdown: Strictly Merchant, Agent, or Supplier */}
          <div>
            <label className="block text-xs font-mono text-white/50 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Ecosystem Role
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/5 text-white focus:outline-none focus:border-[#0EBD2B] text-sm font-mono cursor-pointer"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="Merchant">Merchant (Trade Broker & Sales)</option>
              <option value="Agent">Agent (Workforce Coordinator)</option>
              <option value="Supplier">Supplier (Farm Goods / Crop Logistics)</option>
            </select>
          </div>

          {/* Location Group with locked default country */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> City
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/5 text-white placeholder-white/30 focus:outline-none focus:border-[#0EBD2B] text-sm font-sans"
                placeholder="e.g. Lagos"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-white/50 mb-1">State</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/5 text-white placeholder-white/30 focus:outline-none focus:border--[#0EBD2B] text-sm font-sans"
                placeholder="e.g. Lagos State"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-white/50 mb-1 font-bold">Country</label>
              <input
                type="text"
                disabled
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-white/35 text-sm font-mono cursor-not-allowed"
                value="Nigeria"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-6 rounded-lg text-sm font-mono tracking-wider font-bold uppercase transition-all bg-[#0EBD2B] text-[#121212] hover:bg-[#0EBD2B]/90 hover:shadow-lg hover:shadow-[#0EBD2B]/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? "SAVING SECURE LEDGER INDEX..." : "CREATE & ACCESS TRUSTLEDGER HUB"}
          </button>
        </form>
      </div>
    </div>
  );
}
