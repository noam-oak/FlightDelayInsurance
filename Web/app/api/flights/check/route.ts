import { NextResponse } from "next/server"
import { config } from "@/lib/config"
import { blockchain } from "@/lib/services/blockchain"
import { flightApi } from "@/lib/services/flight-api"

const eligibleAirlines = ["AF", "LH", "BA", "KL", "IB", "LX", "AZ", "OS", "SK", "TP"]

interface FlightCheckRequest {
  flightNumber: string
  date: string
  productId?: number
}

interface FlightCheckResponse {
  eligible: boolean
  flightNumber: string
  date: string
  arrivalTimestamp?: number
  airline?: string
  route?: {
    departure: string
    arrival: string
  }
  products?: Array<{
    id: number
    name: string
    premiumEth: string
    maxPayoutEth: string
    minDelayMinutes: number
    description: string
  }>
  reason?: string
}

function getMockRoute(flightNumber: string): { departure: string; arrival: string } {
  const routes: Record<string, { departure: string; arrival: string }> = {
    AF: { departure: "Paris CDG", arrival: "New York JFK" },
    LH: { departure: "Frankfurt FRA", arrival: "London LHR" },
    BA: { departure: "London LHR", arrival: "Paris CDG" },
    KL: { departure: "Amsterdam AMS", arrival: "Barcelona BCN" },
    IB: { departure: "Madrid MAD", arrival: "Rome FCO" },
    LX: { departure: "Zurich ZRH", arrival: "Milan MXP" },
    AZ: { departure: "Rome FCO", arrival: "Paris CDG" },
    OS: { departure: "Vienna VIE", arrival: "London LHR" },
    SK: { departure: "Copenhagen CPH", arrival: "Oslo OSL" },
    TP: { departure: "Lisbon LIS", arrival: "Paris CDG" },
  }

  const airlineCode = flightNumber.slice(0, 2).toUpperCase()
  return routes[airlineCode] || { departure: "Paris CDG", arrival: "Nice NCE" }
}

export async function POST(request: Request) {
  try {
    const body: FlightCheckRequest = await request.json()
    const { flightNumber, date } = body

    // Validate input
    if (!flightNumber || !date) {
      return NextResponse.json(
        {
          eligible: false,
          flightNumber: flightNumber || "",
          date: date || "",
          reason: "Numéro de vol et date requis",
        } as FlightCheckResponse,
        { status: 400 }
      )
    }

    // Validate flight number format
    const flightRegex = /^[A-Za-z]{2,3}\d{1,4}$/
    if (!flightRegex.test(flightNumber.replace(/\s/g, ""))) {
      return NextResponse.json(
        {
          eligible: false,
          flightNumber,
          date,
          reason: "Format de numéro de vol invalide",
        } as FlightCheckResponse,
        { status: 400 }
      )
    }

    // Validate date (must be in the future)
    const flightDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (flightDate < today) {
      return NextResponse.json(
        {
          eligible: false,
          flightNumber,
          date,
          reason: "La date du vol doit être dans le futur",
        } as FlightCheckResponse,
        { status: 400 }
      )
    }

    // Check if airline is covered
    const airlineCode = flightNumber.slice(0, 2).toUpperCase()
    if (!eligibleAirlines.includes(airlineCode)) {
      return NextResponse.json(
        {
          eligible: false,
          flightNumber: flightNumber.toUpperCase(),
          date,
          airline: airlineCode,
          reason: "Cette compagnie aérienne n'est pas couverte actuellement",
        } as FlightCheckResponse,
        { status: 200 }
      )
    }

    // Calculate arrivalTimestamp (use 18:00 UTC as default arrival time)
    const arrivalDate = new Date(date)
    arrivalDate.setUTCHours(18, 0, 0, 0)
    const arrivalTimestamp = Math.floor(arrivalDate.getTime() / 1000)

    // Ensure flight exists in the simulator API
    try {
      await flightApi.ensureFlight(flightNumber.toUpperCase(), arrivalTimestamp)
    } catch (error) {
      console.log("Flight API not available, continuing with blockchain only:", error)
    }

    // Initialize blockchain service and check liquidity
    await blockchain.initWithRpc()
    const availableLiquidity = await blockchain.getAvailableLiquidity()

    // Get products info from config
    const products = Object.values(config.products).map((p) => ({
      ...p,
      available: blockchain.parseEth(p.maxPayoutEth) <= availableLiquidity,
    }))

    const route = getMockRoute(flightNumber)

    return NextResponse.json({
      eligible: true,
      flightNumber: flightNumber.toUpperCase(),
      date,
      arrivalTimestamp,
      airline: airlineCode,
      route,
      products: products.filter((p) => p.available),
    } as FlightCheckResponse)
  } catch (error) {
    console.error("Flight check error:", error)
    return NextResponse.json(
      {
        eligible: false,
        flightNumber: "",
        date: "",
        reason: "Erreur serveur",
      } as FlightCheckResponse,
      { status: 500 }
    )
  }
}
