"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/header"
import { ContractCard } from "@/components/contract-card"
import { ContractDetails } from "@/components/contract-details"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Shield, Clock, Wallet, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@/hooks/use-wallet"
import { blockchain, Policy } from "@/lib/services/blockchain"
import { config, PolicyStatus, FlightStatus } from "@/lib/config"

export interface Contract {
  id: string
  policyId: string
  contractId: string
  flight: string
  date: string
  premium: number
  compensation: number
  status: "active" | "completed" | "compensated" | "expired"
  flightStatus: "on-time" | "delayed" | "cancelled" | "unknown"
  delayMinutes?: number
  txHash: string
  createdAt: string
  firstName: string
  lastName: string
  email: string
  holder: string
  productName: string
  premiumEth: string
  maxPayoutEth: string
}

// Convert blockchain policy to frontend contract
async function policyToContract(policy: Policy): Promise<Contract> {
  const product = config.products[policy.productId]

  // Try to get flight status
  let flightStatus: "on-time" | "delayed" | "cancelled" | "unknown" = "unknown"
  let delayMinutes: number | undefined

  try {
    const response = await fetch("/api/flights/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flightNumber: policy.flightNumber,
        arrivalTimestamp: policy.arrivalTimestamp,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      delayMinutes = data.delayMinutes

      switch (data.statusCode) {
        case FlightStatus.ON_TIME:
          flightStatus = "on-time"
          break
        case FlightStatus.DELAYED:
          flightStatus = "delayed"
          break
        case FlightStatus.CANCELLED:
          flightStatus = "cancelled"
          break
        default:
          flightStatus = "unknown"
      }
    }
  } catch {
    // Flight API not available
  }

  // Map policy status
  let status: Contract["status"]
  switch (policy.status) {
    case PolicyStatus.ACTIVE:
      status = "active"
      break
    case PolicyStatus.SETTLED:
      status = "compensated"
      break
    case PolicyStatus.EXPIRED:
      status = "expired"
      break
    default:
      status = "completed"
  }

  const premiumEth = blockchain.formatEth(policy.premiumPaid)
  const maxPayoutEth = blockchain.formatEth(policy.maxPayout)

  // Approximate EUR values (would be fetched from price oracle in production)
  const ethToEur = 1500
  const premium = Math.round(parseFloat(premiumEth) * ethToEur)
  const compensation = Math.round(parseFloat(maxPayoutEth) * ethToEur)

  return {
    id: policy.policyId.toString(),
    policyId: policy.policyId.toString(),
    contractId: `FS-${policy.policyId}`,
    flight: policy.flightNumber,
    date: new Date(policy.arrivalTimestamp * 1000).toISOString().split("T")[0],
    premium,
    compensation,
    status,
    flightStatus,
    delayMinutes,
    txHash: "", // Would need to fetch from events
    createdAt: new Date(policy.purchasedAt * 1000).toISOString(),
    firstName: "", // Not stored on-chain
    lastName: "",
    email: "",
    holder: policy.holder,
    productName: product?.name || `Product ${policy.productId}`,
    premiumEth,
    maxPayoutEth,
  }
}

export default function DashboardPage() {
  const { address, isConnected, isConnecting, connect } = useWallet()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPolicies = useCallback(async () => {
    if (!address) return

    setIsLoading(true)
    setError(null)

    try {
      // Initialize blockchain with RPC for reading
      await blockchain.initWithRpc()

      // Fetch policies for the connected address
      const policies = await blockchain.getPoliciesByHolder(address)

      // Convert to contract format
      const contractPromises = policies.map(policyToContract)
      const contractsList = await Promise.all(contractPromises)

      // Sort by creation date (newest first)
      contractsList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setContracts(contractsList)
    } catch (err) {
      console.error("Failed to load policies:", err)
      setError("Erreur lors du chargement des polices")
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (isConnected && address) {
      loadPolicies()
    }
  }, [isConnected, address, loadPolicies])

  // Also check sessionStorage for recently created contract
  useEffect(() => {
    const lastSubscription = sessionStorage.getItem("lastSubscription")
    if (lastSubscription && isConnected) {
      // Clear it after loading
      sessionStorage.removeItem("lastSubscription")
      // Reload to get the new policy
      loadPolicies()
    }
  }, [isConnected, loadPolicies])

  const activeContracts = contracts.filter((c) => c.status === "active")
  const pastContracts = contracts.filter((c) => c.status !== "active")

  const stats = {
    total: contracts.length,
    active: activeContracts.length,
    compensated: contracts.filter((c) => c.status === "compensated").length,
    totalSaved: contracts
      .filter((c) => c.status === "compensated")
      .reduce((sum, c) => sum + c.compensation, 0),
  }

  if (selectedContract) {
    return (
      <ContractDetails contract={selectedContract} onBack={() => setSelectedContract(null)} />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mes contrats</h1>
            <p className="text-muted-foreground">Gérez et suivez vos assurances vol</p>
          </div>
          <div className="flex gap-2">
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadPolicies}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
            )}
            <Link href="/souscrire">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle assurance
              </Button>
            </Link>
          </div>
        </div>

        {/* Wallet Connection Required */}
        {!isConnected ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">Connectez votre portefeuille</CardTitle>
              <CardDescription className="mb-4">
                Connectez votre portefeuille Ethereum pour voir vos contrats d{"'"}assurance
              </CardDescription>
              <Button onClick={connect} disabled={isConnecting} className="gap-2">
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                {isConnecting ? "Connexion..." : "Connecter MetaMask"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Contrats total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.active}</p>
                      <p className="text-xs text-muted-foreground">Couvertures actives</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.compensated}</p>
                      <p className="text-xs text-muted-foreground">Indemnisations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-accent">ETH</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {contracts
                          .filter((c) => c.status === "compensated")
                          .reduce((sum, c) => sum + parseFloat(c.maxPayoutEth), 0)
                          .toFixed(3)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total récupéré</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error Display */}
            {error && (
              <Card className="mb-8 border-destructive/50 bg-destructive/5">
                <CardContent className="pt-6">
                  <p className="text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : contracts.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="mb-2">Aucun contrat</CardTitle>
                  <CardDescription className="mb-4">
                    Vous n{"'"}avez pas encore souscrit d{"'"}assurance vol
                  </CardDescription>
                  <Link href="/souscrire">
                    <Button>Souscrire maintenant</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Active Contracts */}
                {activeContracts.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Couvertures actives</h2>
                    <div className="space-y-4">
                      {activeContracts.map((contract) => (
                        <ContractCard
                          key={contract.id}
                          contract={contract}
                          onClick={() => setSelectedContract(contract)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Past Contracts */}
                {pastContracts.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Historique</h2>
                    <div className="space-y-4">
                      {pastContracts.map((contract) => (
                        <ContractCard
                          key={contract.id}
                          contract={contract}
                          onClick={() => setSelectedContract(contract)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
