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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  RefreshCw,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  Plane,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  ExternalLink,
  Activity,
} from "lucide-react"
import {
  blockchain,
  BlockchainEvent,
  PolicyPurchasedEvent,
  PolicySettledEvent,
  FlightStatusUpdatedEvent,
  PoolFundedEvent,
} from "@/lib/services/blockchain"
import { config, FlightStatus } from "@/lib/config"

const statusLabels: Record<number, string> = {
  0: "Programmé",
  1: "À l'heure",
  2: "Retardé",
  3: "Annulé",
  4: "Dérouté",
}

const statusIcons: Record<number, React.ReactNode> = {
  0: <Clock className="h-4 w-4" />,
  1: <CheckCircle className="h-4 w-4 text-green-500" />,
  2: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  3: <XCircle className="h-4 w-4 text-red-500" />,
  4: <Plane className="h-4 w-4 text-orange-500" />,
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return "-"
  return new Date(timestamp * 1000).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function EventIcon({ type }: { type: BlockchainEvent["type"] }) {
  switch (type) {
    case "PolicyPurchased":
      return <ArrowDownCircle className="h-5 w-5 text-blue-500" />
    case "PolicySettled":
      return <ArrowUpCircle className="h-5 w-5 text-green-500" />
    case "FlightStatusUpdated":
      return <Plane className="h-5 w-5 text-orange-500" />
    case "PoolFunded":
      return <Banknote className="h-5 w-5 text-purple-500" />
    default:
      return <Activity className="h-5 w-5" />
  }
}

function EventBadge({ type }: { type: BlockchainEvent["type"] }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PolicyPurchased: "default",
    PolicySettled: "secondary",
    FlightStatusUpdated: "outline",
    PoolFunded: "default",
  }

  const labels: Record<string, string> = {
    PolicyPurchased: "Souscription",
    PolicySettled: "Indemnisation",
    FlightStatusUpdated: "Mise à jour vol",
    PoolFunded: "Dépôt pool",
  }

  return <Badge variant={variants[type]}>{labels[type]}</Badge>
}

function PolicyPurchasedRow({ data }: { data: PolicyPurchasedEvent }) {
  const product = config.products[data.productId]
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <EventIcon type="PolicyPurchased" />
          <EventBadge type="PolicyPurchased" />
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{data.blockNumber}</TableCell>
      <TableCell className="text-sm">{formatTimestamp(data.timestamp)}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-semibold">Police #{data.policyId.toString()}</div>
          <div className="text-sm text-muted-foreground">
            Vol {data.flightNumber} - {product?.name || `Produit ${data.productId}`}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-right">
          <div className="font-semibold text-blue-600">
            -{blockchain.formatEth(data.premiumWei)} ETH
          </div>
          <div className="text-xs text-muted-foreground">
            Max: {blockchain.formatEth(data.maxPayoutWei)} ETH
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">
        <a
          href={`#tx-${data.txHash}`}
          className="flex items-center gap-1 hover:text-primary"
          title={data.txHash}
        >
          {shortenHash(data.txHash)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </TableCell>
    </TableRow>
  )
}

function PolicySettledRow({ data }: { data: PolicySettledEvent }) {
  return (
    <TableRow className="bg-green-50/50 dark:bg-green-950/20">
      <TableCell>
        <div className="flex items-center gap-2">
          <EventIcon type="PolicySettled" />
          <EventBadge type="PolicySettled" />
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{data.blockNumber}</TableCell>
      <TableCell className="text-sm">{formatTimestamp(data.timestamp)}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-semibold">Police #{data.policyId.toString()} indemnisée</div>
          <div className="text-sm text-muted-foreground">
            Vers {shortenAddress(data.holder)}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-right">
          <div className="font-semibold text-green-600">
            +{blockchain.formatEth(data.payoutWei)} ETH
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">
        <a
          href={`#tx-${data.txHash}`}
          className="flex items-center gap-1 hover:text-primary"
          title={data.txHash}
        >
          {shortenHash(data.txHash)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </TableCell>
    </TableRow>
  )
}

function FlightStatusUpdatedRow({ data }: { data: FlightStatusUpdatedEvent }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <EventIcon type="FlightStatusUpdated" />
          <EventBadge type="FlightStatusUpdated" />
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{data.blockNumber}</TableCell>
      <TableCell className="text-sm">{formatTimestamp(data.timestamp)}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {statusIcons[data.status]}
            <span className="font-semibold">{statusLabels[data.status]}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {data.delayInMinutes > 0 && `Retard: ${data.delayInMinutes} min`}
            {data.reasonCode > 0 && ` (Code: ${data.reasonCode})`}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground">-</span>
      </TableCell>
      <TableCell className="font-mono text-xs">
        <a
          href={`#tx-${data.txHash}`}
          className="flex items-center gap-1 hover:text-primary"
          title={data.txHash}
        >
          {shortenHash(data.txHash)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </TableCell>
    </TableRow>
  )
}

function PoolFundedRow({ data }: { data: PoolFundedEvent }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <EventIcon type="PoolFunded" />
          <EventBadge type="PoolFunded" />
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{data.blockNumber}</TableCell>
      <TableCell className="text-sm">{formatTimestamp(data.timestamp)}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-semibold">Dépôt dans le pool</div>
          <div className="text-sm text-muted-foreground">
            De {shortenAddress(data.from)}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-right">
          <div className="font-semibold text-purple-600">
            +{blockchain.formatEth(data.amountWei)} ETH
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">
        <a
          href={`#tx-${data.txHash}`}
          className="flex items-center gap-1 hover:text-primary"
          title={data.txHash}
        >
          {shortenHash(data.txHash)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </TableCell>
    </TableRow>
  )
}

function EventRow({ event }: { event: BlockchainEvent }) {
  switch (event.type) {
    case "PolicyPurchased":
      return <PolicyPurchasedRow data={event.data} />
    case "PolicySettled":
      return <PolicySettledRow data={event.data} />
    case "FlightStatusUpdated":
      return <FlightStatusUpdatedRow data={event.data} />
    case "PoolFunded":
      return <PoolFundedRow data={event.data} />
    default:
      return null
  }
}

export default function TransactionsPage() {
  const [events, setEvents] = useState<BlockchainEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blockNumber, setBlockNumber] = useState<number>(0)
  const [hubBalance, setHubBalance] = useState<string>("0")
  const [reservedWei, setReservedWei] = useState<string>("0")
  const [activeTab, setActiveTab] = useState("all")

  const loadEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await blockchain.initWithRpc()

      const [allEvents, currentBlock, balance, reserved] = await Promise.all([
        blockchain.getAllEvents(0),
        blockchain.getBlockNumber(),
        blockchain.getHubBalance(),
        blockchain.getReservedWei(),
      ])

      setEvents(allEvents)
      setBlockNumber(currentBlock)
      setHubBalance(blockchain.formatEth(balance))
      setReservedWei(blockchain.formatEth(reserved))
    } catch (err) {
      console.error("Failed to load events:", err)
      setError("Erreur lors du chargement des événements blockchain")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filteredEvents = events.filter((event) => {
    if (activeTab === "all") return true
    if (activeTab === "settlements") return event.type === "PolicySettled"
    if (activeTab === "purchases") return event.type === "PolicyPurchased"
    if (activeTab === "flights") return event.type === "FlightStatusUpdated"
    if (activeTab === "pool") return event.type === "PoolFunded"
    return true
  })

  const stats = {
    totalEvents: events.length,
    settlements: events.filter((e) => e.type === "PolicySettled").length,
    purchases: events.filter((e) => e.type === "PolicyPurchased").length,
    flightUpdates: events.filter((e) => e.type === "FlightStatusUpdated").length,
    totalPayout: events
      .filter((e) => e.type === "PolicySettled")
      .reduce((sum, e) => sum + Number(blockchain.formatEth((e.data as PolicySettledEvent).payoutWei)), 0),
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions Blockchain</h1>
            <p className="text-muted-foreground">
              Historique des événements du smart contract InsuranceHub
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadEvents}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{blockNumber}</p>
                  <p className="text-xs text-muted-foreground">Bloc actuel</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ArrowDownCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.purchases}</p>
                  <p className="text-xs text-muted-foreground">Souscriptions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <ArrowUpCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.settlements}</p>
                  <p className="text-xs text-muted-foreground">Indemnisations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{parseFloat(hubBalance).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">ETH dans le pool</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalPayout.toFixed(3)}</p>
                  <p className="text-xs text-muted-foreground">ETH versés</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <Activity className="h-5 w-5" />
              Événements
            </CardTitle>
            <CardDescription>
              {stats.totalEvents} événements enregistrés sur la blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Tous ({stats.totalEvents})</TabsTrigger>
                <TabsTrigger value="settlements">
                  Indemnisations ({stats.settlements})
                </TabsTrigger>
                <TabsTrigger value="purchases">
                  Souscriptions ({stats.purchases})
                </TabsTrigger>
                <TabsTrigger value="flights">
                  Vols ({stats.flightUpdates})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun événement trouvé
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Bloc</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Détails</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Transaction</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.map((event, index) => (
                          <EventRow key={`${event.type}-${event.data.txHash}-${index}`} event={event} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
