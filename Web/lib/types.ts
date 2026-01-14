// Core types for the insurance application

export interface Flight {
  flightNumber: string
  date: string
  airline: string
  route: {
    departure: string
    arrival: string
  }
}

export interface InsuranceQuote {
  flight: Flight
  premium: number
  compensation: number
  delayThreshold: string
  eligible: boolean
}

export interface Contract {
  id: string
  contractId: string
  flight: string
  date: string
  premium: number
  compensation: number
  status: ContractStatus
  flightStatus: FlightStatus
  delayMinutes?: number
  txHash: string
  createdAt: string
  firstName: string
  lastName: string
  email: string
  iban?: string
}

export type ContractStatus = "active" | "completed" | "compensated" | "expired"

export type FlightStatus = "on-time" | "delayed" | "cancelled" | "unknown"

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  contracts: Contract[]
}

// API Request/Response types
export interface FlightCheckRequest {
  flightNumber: string
  date: string
}

export interface FlightCheckResponse {
  eligible: boolean
  flightNumber: string
  date: string
  airline?: string
  route?: {
    departure: string
    arrival: string
  }
  premium?: number
  compensation?: number
  delayThreshold?: string
  reason?: string
}

export interface ContractCreateRequest {
  flightNumber: string
  date: string
  premium: number
  compensation: number
  firstName: string
  lastName: string
  email: string
  iban: string
}

export interface ContractCreateResponse {
  success: boolean
  contractId?: string
  txHash?: string
  error?: string
}
