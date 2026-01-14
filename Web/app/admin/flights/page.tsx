"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plane,
  RefreshCw,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_FLIGHT_API_URL || "http://127.0.0.1:8000"

// Flight status enum matching the API
const FlightStatus = {
  SCHEDULED: 0,
  ON_TIME: 1,
  DELAYED: 2,
  CANCELLED: 3,
  DIVERTED: 4,
} as const

const statusLabels: Record<number, string> = {
  0: "Programmé",
  1: "À l'heure",
  2: "Retardé",
  3: "Annulé",
  4: "Dérouté",
}

const statusColors: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  0: "secondary",
  1: "default",
  2: "outline",
  3: "destructive",
  4: "destructive",
}

interface Flight {
  flightNumber: string
  arrivalTimestamp: number
  status: number
  delayInMinutes: number
  reasonCode: number
  updatedAt: number
}

export default function AdminFlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update form state
  const [updateStatus, setUpdateStatus] = useState<string>("")
  const [updateDelay, setUpdateDelay] = useState<string>("")
  const [updateReasonCode, setUpdateReasonCode] = useState<string>("")

  // Create form state
  const [newFlightNumber, setNewFlightNumber] = useState("")
  const [newArrivalDate, setNewArrivalDate] = useState("")
  const [newArrivalTime, setNewArrivalTime] = useState("")

  const fetchFlights = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/flights`)
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des vols")
      }
      const data = await response.json()
      setFlights(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFlights()
  }, [fetchFlights])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const openUpdateDialog = (flight: Flight) => {
    setSelectedFlight(flight)
    setUpdateStatus(flight.status.toString())
    setUpdateDelay(flight.delayInMinutes.toString())
    setUpdateReasonCode(flight.reasonCode.toString())
    setIsUpdateDialogOpen(true)
  }

  const handleUpdateFlight = async () => {
    if (!selectedFlight) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/simulate/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightNumber: selectedFlight.flightNumber,
          arrivalTimestamp: selectedFlight.arrivalTimestamp,
          status: parseInt(updateStatus),
          delayInMinutes: parseInt(updateDelay),
          reasonCode: parseInt(updateReasonCode),
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour")
      }

      setIsUpdateDialogOpen(false)
      fetchFlights()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickAction = async (
    flight: Flight,
    status: number,
    delayMinutes: number,
    reasonCode: number
  ) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/simulate/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightNumber: flight.flightNumber,
          arrivalTimestamp: flight.arrivalTimestamp,
          status,
          delayInMinutes: delayMinutes,
          reasonCode,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour")
      }

      fetchFlights()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateFlight = async () => {
    if (!newFlightNumber || !newArrivalDate || !newArrivalTime) return

    setIsSubmitting(true)
    try {
      const arrivalTimestamp = Math.floor(
        new Date(`${newArrivalDate}T${newArrivalTime}`).getTime() / 1000
      )

      const response = await fetch(`${API_BASE_URL}/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightNumber: newFlightNumber.toUpperCase(),
          arrivalTimestamp,
          status: FlightStatus.SCHEDULED,
          delayInMinutes: 0,
          reasonCode: 0,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || "Erreur lors de la création")
      }

      setIsCreateDialogOpen(false)
      setNewFlightNumber("")
      setNewArrivalDate("")
      setNewArrivalTime("")
      fetchFlights()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteFlight = async (flight: Flight) => {
    if (!confirm(`Supprimer le vol ${flight.flightNumber} ?`)) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/flights/${flight.flightNumber}/${flight.arrivalTimestamp}`,
        { method: "DELETE" }
      )

      if (!response.ok && response.status !== 204) {
        throw new Error("Erreur lors de la suppression")
      }

      fetchFlights()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    }
  }

  const getStatusIcon = (status: number) => {
    switch (status) {
      case FlightStatus.SCHEDULED:
        return <Clock className="h-4 w-4" />
      case FlightStatus.ON_TIME:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case FlightStatus.DELAYED:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case FlightStatus.CANCELLED:
        return <XCircle className="h-4 w-4 text-red-500" />
      case FlightStatus.DIVERTED:
        return <Plane className="h-4 w-4 text-orange-500" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion des vols</h1>
            <p className="text-muted-foreground">
              Simulateur de statut de vol pour l{"'"}oracle
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFlights}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nouveau vol
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau vol</DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouveau vol au simulateur
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="flightNumber">Numéro de vol</Label>
                    <Input
                      id="flightNumber"
                      placeholder="AF123"
                      value={newFlightNumber}
                      onChange={(e) => setNewFlightNumber(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="arrivalDate">Date d{"'"}arrivée</Label>
                    <Input
                      id="arrivalDate"
                      type="date"
                      value={newArrivalDate}
                      onChange={(e) => setNewArrivalDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="arrivalTime">Heure d{"'"}arrivée</Label>
                    <Input
                      id="arrivalTime"
                      type="time"
                      value={newArrivalTime}
                      onChange={(e) => setNewArrivalTime(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleCreateFlight} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Liste des vols
            </CardTitle>
            <CardDescription>
              {flights.length} vol{flights.length > 1 ? "s" : ""} dans le simulateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : flights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun vol dans le simulateur
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vol</TableHead>
                    <TableHead>Arrivée prévue</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Retard</TableHead>
                    <TableHead>Code raison</TableHead>
                    <TableHead>Dernière MAJ</TableHead>
                    <TableHead>Actions rapides</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flights.map((flight) => (
                    <TableRow key={`${flight.flightNumber}-${flight.arrivalTimestamp}`}>
                      <TableCell className="font-mono font-semibold">
                        {flight.flightNumber}
                      </TableCell>
                      <TableCell>{formatDate(flight.arrivalTimestamp)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={statusColors[flight.status]}
                          className="gap-1"
                        >
                          {getStatusIcon(flight.status)}
                          {statusLabels[flight.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {flight.delayInMinutes > 0 ? (
                          <span className="text-yellow-600 font-medium">
                            {flight.delayInMinutes} min
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {flight.reasonCode > 0 ? flight.reasonCode : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(flight.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() =>
                              handleQuickAction(flight, FlightStatus.ON_TIME, 0, 0)
                            }
                            disabled={isSubmitting}
                          >
                            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                            À l{"'"}heure
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() =>
                              handleQuickAction(flight, FlightStatus.DELAYED, 60, 50)
                            }
                            disabled={isSubmitting}
                          >
                            <Clock className="h-3 w-3 mr-1 text-yellow-500" />
                            +1h
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() =>
                              handleQuickAction(flight, FlightStatus.DELAYED, 180, 50)
                            }
                            disabled={isSubmitting}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" />
                            +3h
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() =>
                              handleQuickAction(flight, FlightStatus.CANCELLED, 0, 50)
                            }
                            disabled={isSubmitting}
                          >
                            <XCircle className="h-3 w-3 mr-1 text-red-500" />
                            Annulé
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openUpdateDialog(flight)}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteFlight(flight)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Update Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Modifier le vol {selectedFlight?.flightNumber}
              </DialogTitle>
              <DialogDescription>
                Simulez un changement de statut pour ce vol
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Statut</Label>
                <Select value={updateStatus} onValueChange={setUpdateStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Programmé</SelectItem>
                    <SelectItem value="1">À l{"'"}heure</SelectItem>
                    <SelectItem value="2">Retardé</SelectItem>
                    <SelectItem value="3">Annulé</SelectItem>
                    <SelectItem value="4">Dérouté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="delay">Retard (minutes)</Label>
                <Input
                  id="delay"
                  type="number"
                  min="0"
                  value={updateDelay}
                  onChange={(e) => setUpdateDelay(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reasonCode">Code raison</Label>
                <Input
                  id="reasonCode"
                  type="number"
                  min="0"
                  max="65535"
                  value={updateReasonCode}
                  onChange={(e) => setUpdateReasonCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Codes couverts: 50=Technique, 60=Opérationnel, 61=Équipage (non couverts: 1=Météo, 2=Sécurité)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsUpdateDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={handleUpdateFlight} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Mettre à jour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
