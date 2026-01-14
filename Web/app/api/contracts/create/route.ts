import { NextResponse } from "next/server"
import { config } from "@/lib/config"
import { blockchain } from "@/lib/services/blockchain"
import { flightApi } from "@/lib/services/flight-api"

interface ContractCreateRequest {
  flightNumber: string
  arrivalTimestamp: number
  productId: number
  // User info (for off-chain storage/notifications)
  firstName: string
  lastName: string
  email: string
  iban?: string
}

interface ContractCreateResponse {
  success: boolean
  // Data needed for client-side transaction
  hubAddress?: string
  productId?: number
  flightNumber?: string
  arrivalTimestamp?: number
  premiumWei?: string
  maxPayoutWei?: string
  // After successful client transaction
  policyId?: string
  txHash?: string
  error?: string
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request: Request) {
  try {
    const body: ContractCreateRequest = await request.json()
    const { flightNumber, arrivalTimestamp, productId, firstName, lastName, email } = body

    // Validate required fields
    if (!flightNumber || !arrivalTimestamp || !productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Informations de vol manquantes",
        } as ContractCreateResponse,
        { status: 400 }
      )
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        {
          success: false,
          error: "Nom et prénom requis",
        } as ContractCreateResponse,
        { status: 400 }
      )
    }

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Email invalide",
        } as ContractCreateResponse,
        { status: 400 }
      )
    }

    // Validate product exists
    const product = config.products[productId]
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Produit invalide",
        } as ContractCreateResponse,
        { status: 400 }
      )
    }

    // Initialize blockchain and verify liquidity
    await blockchain.initWithRpc()
    const availableLiquidity = await blockchain.getAvailableLiquidity()
    const maxPayoutWei = blockchain.parseEth(product.maxPayoutEth)

    if (availableLiquidity < maxPayoutWei) {
      return NextResponse.json(
        {
          success: false,
          error: "Liquidité insuffisante pour ce produit",
        } as ContractCreateResponse,
        { status: 400 }
      )
    }

    // Ensure flight exists in API
    try {
      await flightApi.ensureFlight(flightNumber, arrivalTimestamp)
    } catch (error) {
      console.log("Flight API error (non-blocking):", error)
    }

    // Return data for client-side transaction
    // The actual buyPolicy transaction happens in the browser with MetaMask
    return NextResponse.json({
      success: true,
      hubAddress: config.blockchain.contracts.hub,
      productId,
      flightNumber,
      arrivalTimestamp,
      premiumWei: blockchain.parseEth(product.premiumEth).toString(),
      maxPayoutWei: maxPayoutWei.toString(),
    } as ContractCreateResponse)
  } catch (error) {
    console.error("Contract create error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la préparation du contrat",
      } as ContractCreateResponse,
      { status: 500 }
    )
  }
}
