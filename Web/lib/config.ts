// Configuration for API and Blockchain connections

export const config = {
  // Flight Simulator API
  flightApi: {
    baseUrl: process.env.NEXT_PUBLIC_FLIGHT_API_URL || "http://127.0.0.1:8000",
  },

  // Blockchain configuration
  blockchain: {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545",
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337"),

    // Contract addresses (localhost deployment)
    contracts: {
      hub: process.env.NEXT_PUBLIC_HUB_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      products: {
        basic: process.env.NEXT_PUBLIC_BASIC_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        plus: process.env.NEXT_PUBLIC_PLUS_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        max: process.env.NEXT_PUBLIC_MAX_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      },
    },
  },

  // Product definitions matching Solidity contracts
  products: {
    1: {
      id: 1,
      name: "Basic",
      premiumEth: "0.003",
      maxPayoutEth: "0.02",
      minDelayMinutes: 180,
      description: "Retard >= 3h avec raisons couvertes",
    },
    2: {
      id: 2,
      name: "Plus",
      premiumEth: "0.006",
      maxPayoutEth: "0.06",
      minDelayMinutes: 360,
      description: "Retard >= 6h ou annulation, raisons couvertes",
    },
    3: {
      id: 3,
      name: "Max",
      premiumEth: "0.008",
      maxPayoutEth: "0.08",
      minDelayMinutes: 120,
      description: "Retard >= 2h, toutes raisons couvertes",
    },
  } as Record<number, ProductInfo>,
}

export interface ProductInfo {
  id: number
  name: string
  premiumEth: string
  maxPayoutEth: string
  minDelayMinutes: number
  description: string
}

// Flight status enum matching Solidity
export enum FlightStatus {
  SCHEDULED = 0,
  ON_TIME = 1,
  DELAYED = 2,
  CANCELLED = 3,
  DIVERTED = 4,
}

// Policy status enum matching Solidity
export enum PolicyStatus {
  ACTIVE = 0,
  SETTLED = 1,
  EXPIRED = 2,
}

export const flightStatusLabels: Record<FlightStatus, string> = {
  [FlightStatus.SCHEDULED]: "Programmé",
  [FlightStatus.ON_TIME]: "À l'heure",
  [FlightStatus.DELAYED]: "Retardé",
  [FlightStatus.CANCELLED]: "Annulé",
  [FlightStatus.DIVERTED]: "Dérouté",
}

export const policyStatusLabels: Record<PolicyStatus, string> = {
  [PolicyStatus.ACTIVE]: "Active",
  [PolicyStatus.SETTLED]: "Indemnisée",
  [PolicyStatus.EXPIRED]: "Expirée",
}
