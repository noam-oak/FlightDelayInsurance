import { NextResponse } from "next/server"
import { blockchain } from "@/lib/services/blockchain"
import { flightApi } from "@/lib/services/flight-api"
import { config, PolicyStatus, policyStatusLabels, FlightStatus, flightStatusLabels } from "@/lib/config"

interface ContractDetails {
  policyId: string
  holder: string
  productId: number
  productName: string
  flightNumber: string
  arrivalTimestamp: number
  arrivalDate: string
  premiumEth: string
  maxPayoutEth: string
  status: string
  statusLabel: string
  flightStatus?: string
  flightStatusLabel?: string
  delayMinutes?: number
  purchasedAt: number
  purchasedDate: string
  coverageEnd: number
  coverageEndDate: string
  txHash?: string
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const policyId = parseInt(id)

    if (isNaN(policyId) || policyId <= 0) {
      return NextResponse.json({ error: "ID de police invalide" }, { status: 400 })
    }

    // Initialize blockchain
    await blockchain.initWithRpc()

    // Fetch policy from blockchain
    let policy
    try {
      policy = await blockchain.getPolicy(policyId)
    } catch {
      return NextResponse.json({ error: "Police non trouvée" }, { status: 404 })
    }

    // Get product info
    const product = config.products[policy.productId]

    // Try to get flight status from API
    let flightStatus: FlightStatus | undefined
    let delayMinutes: number | undefined
    try {
      const flight = await flightApi.getFlight(policy.flightNumber, policy.arrivalTimestamp)
      if (flight) {
        flightStatus = flight.status
        delayMinutes = flight.delayInMinutes
      }
    } catch {
      // Flight API not available
    }

    const response: ContractDetails = {
      policyId: policy.policyId.toString(),
      holder: policy.holder,
      productId: policy.productId,
      productName: product?.name || `Product ${policy.productId}`,
      flightNumber: policy.flightNumber,
      arrivalTimestamp: policy.arrivalTimestamp,
      arrivalDate: new Date(policy.arrivalTimestamp * 1000).toISOString(),
      premiumEth: blockchain.formatEth(policy.premiumPaid),
      maxPayoutEth: blockchain.formatEth(policy.maxPayout),
      status: PolicyStatus[policy.status].toLowerCase(),
      statusLabel: policyStatusLabels[policy.status],
      purchasedAt: policy.purchasedAt,
      purchasedDate: new Date(policy.purchasedAt * 1000).toISOString(),
      coverageEnd: policy.coverageEnd,
      coverageEndDate: new Date(policy.coverageEnd * 1000).toISOString(),
    }

    if (flightStatus !== undefined) {
      response.flightStatus = FlightStatus[flightStatus].toLowerCase()
      response.flightStatusLabel = flightStatusLabels[flightStatus]
      response.delayMinutes = delayMinutes
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Contract fetch error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
