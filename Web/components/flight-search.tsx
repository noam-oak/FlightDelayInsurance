"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plane, Calendar, Search, CheckCircle, AlertCircle, Loader2, Zap } from "lucide-react"

type EligibilityStatus = "idle" | "checking" | "eligible" | "not-eligible"

interface QuoteResult {
  premium: number
  compensation: number
  delayThreshold: string
  flightNumber: string
  date: string
}

export function FlightSearch() {
  const router = useRouter()
  const [flightNumber, setFlightNumber] = useState("")
  const [date, setDate] = useState("")
  const [eligibilityStatus, setEligibilityStatus] = useState<EligibilityStatus>("idle")
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!flightNumber || !date) return

    setEligibilityStatus("checking")
    setQuoteResult(null)

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const isEligible = flightNumber.length >= 4 && Math.random() > 0.2

    if (isEligible) {
      setEligibilityStatus("eligible")
      const basePremium = 12 + Math.floor(Math.random() * 8)
      setQuoteResult({
        premium: basePremium,
        compensation: basePremium * 10,
        delayThreshold: "2 heures",
        flightNumber: flightNumber.toUpperCase(),
        date: date,
      })
    } else {
      setEligibilityStatus("not-eligible")
    }
  }

  const handleSubscribe = () => {
    if (quoteResult) {
      const params = new URLSearchParams({
        flight: quoteResult.flightNumber,
        date: quoteResult.date,
        premium: quoteResult.premium.toString(),
        compensation: quoteResult.compensation.toString(),
      })
      router.push(`/souscrire?${params.toString()}`)
    }
  }

  return (
    <Card className="glass-strong border-border/50 shadow-2xl glow-box">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Devis instantané
            </CardTitle>
            <CardDescription className="text-muted-foreground">Entrez votre vol pour un tarif immédiat</CardDescription>
          </div>
          <div className="px-2 py-1 rounded-md bg-success/20 text-success text-xs font-mono">EN LIGNE</div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flight-number" className="text-sm font-medium text-muted-foreground">
              Numéro de vol
            </Label>
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="flight-number"
                type="text"
                placeholder="ex: AF1234"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                className="pl-10 uppercase bg-input border-border/50 focus:border-primary/50 font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flight-date" className="text-sm font-medium text-muted-foreground">
              Date de départ
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="flight-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10 bg-input border-border/50 focus:border-primary/50"
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold"
            disabled={eligibilityStatus === "checking"}
          >
            {eligibilityStatus === "checking" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Vérifier l{"'"}éligibilité
              </>
            )}
          </Button>
        </form>

        {eligibilityStatus === "eligible" && quoteResult && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Vol éligible</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Prime</p>
                <p className="text-2xl font-bold font-mono">{quoteResult.premium}€</p>
              </div>
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono">Indemnité</p>
                <p className="text-2xl font-bold text-primary font-mono">{quoteResult.compensation}€</p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                Retard {">"} <span className="text-foreground font-mono">{quoteResult.delayThreshold}</span> déclenche
                un paiement automatique de{" "}
                <span className="text-primary font-semibold">{quoteResult.compensation}€</span>
              </p>
            </div>

            <Button
              onClick={handleSubscribe}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold"
            >
              Souscrire maintenant
            </Button>
          </div>
        )}

        {eligibilityStatus === "not-eligible" && (
          <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">Non éligible</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Ce vol n{"'"}est pas couvert. Essayez un autre vol ou une autre date.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
