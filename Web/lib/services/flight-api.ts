// Service for interacting with the Flight Simulator API

import { config, FlightStatus } from "../config"

export interface ApiFlight {
  flightNumber: string
  arrivalTimestamp: number
  status: FlightStatus
  delayInMinutes: number
  reasonCode: number
  updatedAt: number
}

export interface FlightCreateRequest {
  flightNumber: string
  arrivalTimestamp: number
  status?: number
  delayInMinutes?: number
  reasonCode?: number
}

export interface FlightUpdateRequest {
  flightNumber: string
  arrivalTimestamp: number
  status?: number
  delayInMinutes?: number
  reasonCode?: number
}

class FlightApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = config.flightApi.baseUrl
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string; timestamp: number }> {
    const response = await fetch(`${this.baseUrl}/health`)
    if (!response.ok) {
      throw new Error(`API health check failed: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * List all flights
   */
  async listFlights(): Promise<ApiFlight[]> {
    const response = await fetch(`${this.baseUrl}/flights`)
    if (!response.ok) {
      throw new Error(`Failed to fetch flights: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * Get a specific flight
   */
  async getFlight(flightNumber: string, arrivalTimestamp: number): Promise<ApiFlight | null> {
    const response = await fetch(`${this.baseUrl}/flights/${flightNumber}/${arrivalTimestamp}`)
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch flight: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * Create a new flight
   */
  async createFlight(data: FlightCreateRequest): Promise<ApiFlight> {
    const response = await fetch(`${this.baseUrl}/flights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || "Failed to create flight")
    }
    return response.json()
  }

  /**
   * Simulate a flight status update
   */
  async updateFlight(data: FlightUpdateRequest): Promise<ApiFlight> {
    const response = await fetch(`${this.baseUrl}/simulate/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || "Failed to update flight")
    }
    return response.json()
  }

  /**
   * Delete a flight
   */
  async deleteFlight(flightNumber: string, arrivalTimestamp: number): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/flights/${flightNumber}/${arrivalTimestamp}`, {
      method: "DELETE",
    })
    return response.status === 204
  }

  /**
   * Ensure a flight exists in the API (create if not exists)
   */
  async ensureFlight(flightNumber: string, arrivalTimestamp: number): Promise<ApiFlight> {
    const existing = await this.getFlight(flightNumber, arrivalTimestamp)
    if (existing) {
      return existing
    }

    return this.createFlight({
      flightNumber,
      arrivalTimestamp,
      status: FlightStatus.SCHEDULED,
      delayInMinutes: 0,
      reasonCode: 0,
    })
  }
}

// Export singleton instance
export const flightApi = new FlightApiService()
