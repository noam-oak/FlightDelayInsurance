"use client"

import type { Contract } from "@/app/dashboard/page"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plane, Clock, CheckCircle, AlertCircle, ChevronRight } from "lucide-react"

interface ContractCardProps {
  contract: Contract
  onClick: () => void
}

const statusConfig = {
  active: { label: "Couverture active", variant: "default" as const, className: "bg-accent text-accent-foreground" },
  completed: { label: "Terminé", variant: "secondary" as const, className: "" },
  compensated: { label: "Indemnisé", variant: "default" as const, className: "bg-accent text-accent-foreground" },
  expired: { label: "Expiré", variant: "secondary" as const, className: "" },
}

const flightStatusConfig = {
  "on-time": { label: "À l'heure", icon: CheckCircle, className: "text-accent" },
  delayed: { label: "Retardé", icon: AlertCircle, className: "text-warning" },
  cancelled: { label: "Annulé", icon: AlertCircle, className: "text-destructive" },
  unknown: { label: "En attente", icon: Clock, className: "text-muted-foreground" },
}

export function ContractCard({ contract, onClick }: ContractCardProps) {
  const status = statusConfig[contract.status]
  const flightStatus = flightStatusConfig[contract.flightStatus]
  const FlightIcon = flightStatus.icon

  const formattedDate = new Date(contract.date).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-border/50"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {/* Flight Icon */}
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Plane className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{contract.flight}</span>
              <Badge className={status.className} variant={status.variant}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>

          {/* Flight Status */}
          <div className="hidden sm:flex items-center gap-2">
            <FlightIcon className={`h-4 w-4 ${flightStatus.className}`} />
            <span className={`text-sm ${flightStatus.className}`}>{flightStatus.label}</span>
          </div>

          {/* Compensation Info */}
          <div className="text-right flex-shrink-0">
            {contract.status === "compensated" ? (
              <>
                <p className="font-semibold text-accent">+{contract.compensation}€</p>
                <p className="text-xs text-muted-foreground">Reçu</p>
              </>
            ) : (
              <>
                <p className="font-semibold">{contract.compensation}€</p>
                <p className="text-xs text-muted-foreground">Indemnité max</p>
              </>
            )}
          </div>

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>

        {/* Mobile Flight Status */}
        <div className="flex sm:hidden items-center gap-2 mt-3 pt-3 border-t border-border">
          <FlightIcon className={`h-4 w-4 ${flightStatus.className}`} />
          <span className={`text-sm ${flightStatus.className}`}>{flightStatus.label}</span>
          {contract.delayMinutes && (
            <span className="text-sm text-muted-foreground">
              ({Math.floor(contract.delayMinutes / 60)}h{contract.delayMinutes % 60}min de retard)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
