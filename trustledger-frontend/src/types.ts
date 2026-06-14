export type UserRole = "Merchant" | "Agent" | "Supplier";

export interface UserLocation {
  city: string;
  state: string;
  country: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  location: UserLocation;
  trust_score: number;
}

export type TransactionDirection = "SALE" | "EXPENSE" | "SUPPLIER_PAYMENT" | "CASUAL_LABOR_PAYOUT" | "LOGISTICS_DELIVERY";

export type UnitMeasure = "bag" | "derica" | "paint" | "crate" | "kilo" | "piece" | "carton" | "item";

export interface Transaction {
  tx_id: string;
  item_name: string;
  amount: number;
  quantity: number;
  unit_measure: UnitMeasure;
  direction: TransactionDirection;
  context_notes: string;
  is_anomaly: boolean;
  verified: boolean;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  compiled_cypher?: string;
  voiceUrl?: string;
  isVoice?: boolean;
}

export interface AsyncJob {
  job_id: string;
  status: "processing" | "failed" | "completed";
  error?: string;
  extracted_data?: Partial<Transaction>;
}

export interface ReputationTierInfo {
  tier: number;
  name: string;
  accent: string;
  boundary: number;
}

export function getReputationTier(score: number): ReputationTierInfo {
  if (score < 60) {
    return { tier: 1, name: "Growing Node", accent: "#9C1908", boundary: 60 };
  } else if (score < 75) {
    return { tier: 2, name: "Trusted Tier", accent: "#CE6D11", boundary: 75 };
  } else if (score < 90) {
    return { tier: 3, name: "Established Merchant", accent: "#DDE00D", boundary: 90 };
  } else {
    return { tier: 4, name: "Elite Supplier", accent: "#0EBD2B", boundary: 100 };
  }
}
