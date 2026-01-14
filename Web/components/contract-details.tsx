"use client"

import type { Contract } from "@/app/dashboard/page"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Plane,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Download,
  Shield,
  Banknote,
  Wallet,
  Copy,
} from "lucide-react"
import { useState } from "react"
import { config } from "@/lib/config"

interface ContractDetailsProps {
  contract: Contract
  onBack: () => void
}

const statusConfig = {
  active: { label: "Couverture active", className: "bg-accent text-accent-foreground" },
  completed: { label: "Termine", className: "bg-secondary text-secondary-foreground" },
  compensated: { label: "Indemnise", className: "bg-accent text-accent-foreground" },
  expired: { label: "Expire", className: "bg-secondary text-secondary-foreground" },
}

const flightStatusConfig = {
  "on-time": {
    label: "A l'heure",
    icon: CheckCircle,
    className: "text-accent",
    bgClassName: "bg-accent/10",
  },
  delayed: {
    label: "Retarde",
    icon: AlertCircle,
    className: "text-warning",
    bgClassName: "bg-warning/10",
  },
  cancelled: {
    label: "Annule",
    icon: AlertCircle,
    className: "text-destructive",
    bgClassName: "bg-destructive/10",
  },
  unknown: {
    label: "En attente",
    icon: Clock,
    className: "text-muted-foreground",
    bgClassName: "bg-muted",
  },
}

export function ContractDetails({ contract, onBack }: ContractDetailsProps) {
  const [copied, setCopied] = useState(false)
  const status = statusConfig[contract.status]
  const flightStatus = flightStatusConfig[contract.flightStatus]
  const FlightIcon = flightStatus.icon

  const formattedDate = new Date(contract.date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const formattedCreatedAt = new Date(contract.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux contrats
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                      <Plane className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">{contract.flight}</h1>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Police #{contract.policyId} - {contract.productName}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flight Status Card */}
            <Card
              className={`border-2 ${contract.status === "compensated" ? "border-accent/30" : "border-border/50"}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  Statut du vol
                </CardTitle>
                <CardDescription>Suivi en temps reel de votre vol</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`p-4 rounded-lg ${flightStatus.bgClassName} flex items-center gap-3`}
                >
                  <FlightIcon className={`h-6 w-6 ${flightStatus.className}`} />
                  <div>
                    <p className={`font-semibold ${flightStatus.className}`}>
                      {flightStatus.label}
                    </p>
                    {contract.delayMinutes !== undefined && contract.delayMinutes > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Retard de {Math.floor(contract.delayMinutes / 60)}h
                        {contract.delayMinutes % 60}min
                      </p>
                    )}
                  </div>
                </div>

                {contract.status === "compensated" && (
                  <div className="mt-4 p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-accent" />
                      <span className="font-semibold text-accent">Indemnisation versee</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Suite au retard de votre vol, une indemnite de{" "}
                      <strong className="text-foreground">{contract.maxPayoutEth} ETH</strong>{" "}
                      a ete automatiquement viree sur votre portefeuille.
                    </p>
                  </div>
                )}

                {contract.status === "active" && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Votre vol est surveille automatiquement par nos oracles. En cas de
                      retard superieur au seuil, l{"'"}indemnisation sera declenchee
                      automatiquement.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contract Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  Details du contrat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date de vol</p>
                      <p className="font-medium">{formattedDate}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Banknote className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Prime payee</p>
                      <p className="font-medium">{contract.premiumEth} ETH</p>
                      <p className="text-xs text-muted-foreground">~{contract.premium} EUR</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Indemnisation prevue</p>
                      <p className="font-medium text-accent">{contract.maxPayoutEth} ETH</p>
                      <p className="text-xs text-muted-foreground">
                        ~{contract.compensation} EUR
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Produit</p>
                      <p className="font-medium">{contract.productName}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Holder Address */}
                {contract.holder && (
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Titulaire</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm">{shortenAddress(contract.holder)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyAddress(contract.holder)}
                        >
                          {copied ? (
                            <CheckCircle className="h-3 w-3 text-accent" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>Contrat souscrit le {formattedCreatedAt}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Blockchain Proof */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preuve blockchain</CardTitle>
                <CardDescription>Verifiez votre contrat sur Ethereum</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Contrat Hub</p>
                  <div className="p-3 rounded-md bg-muted font-mono text-xs break-all">
                    {config.blockchain.contracts.hub}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Policy ID</p>
                  <div className="p-3 rounded-md bg-muted font-mono text-xs">
                    #{contract.policyId}
                  </div>
                </div>

                {contract.txHash && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Transaction</p>
                    <div className="p-3 rounded-md bg-muted font-mono text-xs break-all">
                      {contract.txHash}
                    </div>
                  </div>
                )}

                <a
                  href={`https://etherscan.io/address/${config.blockchain.contracts.hub}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full gap-2 bg-transparent">
                    <ExternalLink className="h-4 w-4" />
                    Voir sur Etherscan
                  </Button>
                </a>

                <p className="text-xs text-muted-foreground text-center">
                  Note: Pour le reseau local, utilisez localhost:8545
                </p>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Telecharger le contrat PDF
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Conditions generales
                </Button>
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Besoin d{"'"}aide ?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Une question sur votre contrat ou votre indemnisation ?
                </p>
                <Button variant="outline" className="w-full bg-transparent">
                  Contacter le support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
