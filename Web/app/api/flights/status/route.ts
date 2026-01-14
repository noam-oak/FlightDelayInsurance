import { NextResponse } from "next/server"
import { flightApi } from "@/lib/services/flight-api"
import { FlightStatus, flightStatusLabels } from "@/lib/config"

interface FlightStatusRequest {
  flightNumber: string
  arrivalTimestamp: number
}

interface FlightStatusResponse {
  flightNumber: string
  arrivalTimestamp: number
  status: string
  statusCode: number
  statusLabel: string
  delayMinutes: number
  reasonCode: number
  updatedAt: number
  lastUpdated: string
}

export async function POST(request: Request) {
  try {
    const body: FlightStatusRequest = await request.json()
    const { flightNumber, arrivalTimestamp } = body

    if (!flightNumber || !arrivalTimestamp) {
      return NextResponse.json(
        { error: "Numéro de vol et timestamp d'arrivée requis" },
        { status: 400 }
      )
    }

    // Fetch from Flight Simulator API
    const flight = await flightApi.getFlight(flightNumber, arrivalTimestamp)

    if (!flight) {
      return NextResponse.json(
        { error: "Vol non trouvé" },
        { status: 404 }
      )
    }

    const response: FlightStatusResponse = {
      flightNumber: flight.flightNumber,
      arrivalTimestamp: flight.arrivalTimestamp,
      status: FlightStatus[flight.status].toLowerCase(),
      statusCode: flight.status,
      statusLabel: flightStatusLabels[flight.status as FlightStatus],
      delayMinutes: flight.delayInMinutes,
      reasonCode: flight.reasonCode,
      updatedAt: flight.updatedAt,
      lastUpdated: new Date(flight.updatedAt * 1000).toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Flight status error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// Also support GET for easier testing
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const flightNumber = searchParams.get("flightNumber")
  const arrivalTimestamp = searchParams.get("arrivalTimestamp")

  if (!flightNumber || !arrivalTimestamp) {
    return NextResponse.json(
      { error: "Paramètres flightNumber et arrivalTimestamp requis" },
      { status: 400 }
    )
  }

  // Reuse POST logic
  const mockRequest = new Request(request.url, {
    method: "POST",
    body: JSON.stringify({
      flightNumber,
      arrivalTimestamp: parseInt(arrivalTimestamp),
    }),
  })

  return POST(mockRequest)
}
