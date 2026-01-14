"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useWallet } from "@/hooks/use-wallet"
import { blockchain } from "@/lib/services/blockchain"
import {
    AlertCircle,
    CheckCircle,
    CreditCard,
    Loader2,
    Mail,
    Plane,
    Search,
    User,
    Wallet,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

type FormStep = "flight" | "product" | "identity" | "payment" | "confirmation"

interface FormData {
  flightNumber: string
  date: string
  firstName: string
  lastName: string
  email: string
  iban: string
  acceptTerms: boolean
  acceptDataProcessing: boolean
}

interface Product {
  id: number
  name: string
  premiumEth: string
  maxPayoutEth: string
  minDelayMinutes: number
  description: string
}

interface FlightCheckResult {
  eligible: boolean
  flightNumber: string
  date: string
  arrivalTimestamp?: number
  airline?: string
  route?: {
    departure: string
    arrival: string
  }
  products?: Product[]
  reason?: string
}

interface TransactionResult {
  policyId: string
  txHash: string
  flightNumber: string
  date: string
  productName: string
  premiumEth: string
  maxPayoutEth: string
}

export function SubscriptionForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { address, isConnected, isConnecting, connect } = useWallet()

  const [currentStep, setCurrentStep] = useState<FormStep>("flight")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [flightResult, setFlightResult] = useState<FlightCheckResult | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [txResult, setTxResult] = useState<TransactionResult | null>(null)

  const [formData, setFormData] = useState<FormData>({
    flightNumber: "",
    date: "",
    firstName: "",
    lastName: "",
    email: "",
    iban: "",
    acceptTerms: false,
    acceptDataProcessing: false,
  })

  // Initialize from URL params
  useEffect(() => {
    const flight = searchParams.get("flight")
    const date = searchParams.get("date")
    const productId = searchParams.get("productId")

    if (flight) {
      setFormData((prev) => ({ ...prev, flightNumber: flight }))
    }
    if (date) {
      setFormData((prev) => ({ ...prev, date }))
    }

    // If we have flight params, auto-check
    if (flight && date) {
      handleCheckFlight(flight, date, productId ? parseInt(productId) : undefined)
    }
  }, [searchParams])

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleCheckFlight = async (
    flightNumber?: string,
    date?: string,
    productId?: number
  ) => {
    const flight = flightNumber || formData.flightNumber
    const flightDate = date || formData.date

    if (!flight || !flightDate) {
      setError("Veuillez entrer un numéro de vol et une date")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/flights/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightNumber: flight,
          date: flightDate,
          productId,
        }),
      })

      const result: FlightCheckResult = await response.json()

      if (!result.eligible) {
        setError(result.reason || "Ce vol n'est pas éligible")
        setFlightResult(null)
        return
      }

      setFlightResult(result)

      // Auto-select product if specified
      if (productId && result.products) {
        const product = result.products.find((p) => p.id === productId)
        if (product) {
          setSelectedProduct(product)
          setCurrentStep("identity")
          return
        }
      }

      setCurrentStep("product")
    } catch {
      setError("Erreur lors de la vérification du vol")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setCurrentStep("identity")
  }

  const validateIdentity = () => {
    if (!formData.firstName.trim()) {
      setError("Le prénom est requis")
      return false
    }
    if (!formData.lastName.trim()) {
      setError("Le nom est requis")
      return false
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Une adresse email valide est requise")
      return false
    }
    return true
  }

  const validatePayment = () => {
    if (!formData.acceptTerms) {
      setError("Vous devez accepter les conditions générales")
      return false
    }
    if (!formData.acceptDataProcessing) {
      setError("Vous devez accepter le traitement des données")
      return false
    }
    return true
  }

  const handleNextStep = async () => {
    if (currentStep === "flight") {
      await handleCheckFlight()
    } else if (currentStep === "identity") {
      if (validateIdentity()) {
        setCurrentStep("payment")
      }
    } else if (currentStep === "payment") {
      if (validatePayment()) {
        await handleSubmit()
      }
    }
  }

  const handleSubmit = async () => {
    if (!flightResult || !selectedProduct) {
      setError("Données manquantes")
      return
    }

    // First, ensure wallet is connected
    if (!isConnected) {
      setError("Veuillez connecter votre portefeuille")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Call API to prepare transaction
      const prepareResponse = await fetch("/api/contracts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightNumber: flightResult.flightNumber,
          arrivalTimestamp: flightResult.arrivalTimestamp,
          productId: selectedProduct.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          iban: formData.iban || undefined,
        }),
      })

      const prepareResult = await prepareResponse.json()

      if (!prepareResult.success) {
        throw new Error(prepareResult.error || "Erreur de préparation")
      }

      // Step 2: Execute blockchain transaction
      const { txHash, policyId } = await blockchain.buyPolicy(
        selectedProduct.id,
        flightResult.flightNumber,
        flightResult.arrivalTimestamp!
      )

      // Step 3: Store result and show confirmation
      const result: TransactionResult = {
        policyId: policyId.toString(),
        txHash,
        flightNumber: flightResult.flightNumber,
        date: flightResult.date,
        productName: selectedProduct.name,
        premiumEth: selectedProduct.premiumEth,
        maxPayoutEth: selectedProduct.maxPayoutEth,
      }

      setTxResult(result)

      // Store in sessionStorage for dashboard
      sessionStorage.setItem(
        "lastSubscription",
        JSON.stringify({
          contractId: `FS-${policyId}`,
          flight: flightResult.flightNumber,
          date: flightResult.date,
          premium: parseFloat(selectedProduct.premiumEth) * 1500, // Approximate EUR
          compensation: parseFloat(selectedProduct.maxPayoutEth) * 1500,
          txHash,
          createdAt: new Date().toISOString(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        })
      )

      setCurrentStep("confirmation")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la transaction"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatIBAN = (value: string) => {
    const cleaned = value.replace(/\s/g, "").toUpperCase()
    const chunks = cleaned.match(/.{1,4}/g)
    return chunks ? chunks.join(" ") : cleaned
  }

  // Render confirmation step
  if (currentStep === "confirmation" && txResult) {
    return (
      <Card className="border-accent/30 bg-accent/5">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-accent" />
          </div>
          <CardTitle className="text-2xl">Souscription confirmée</CardTitle>
          <CardDescription>
            Votre contrat d{"'"}assurance a été créé sur la blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Numéro de police</p>
                <p className="font-medium">#{txResult.policyId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vol assuré</p>
                <p className="font-medium">{txResult.flightNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date de vol</p>
                <p className="font-medium">
                  {new Date(txResult.date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Indemnisation max</p>
                <p className="font-medium text-accent">{txResult.maxPayoutEth} ETH</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">Transaction Ethereum</p>
            <p className="font-mono text-xs break-all">{txResult.txHash}</p>
            <a
              href={`https://etherscan.io/tx/${txResult.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline mt-2 inline-block"
            >
              Voir sur Etherscan (mainnet) ou vérifier localement
            </a>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Un email de confirmation sera envoyé à {formData.email}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => router.push("/dashboard")} className="flex-1">
              Voir mon tableau de bord
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="flex-1 bg-transparent"
            >
              Retour à l{"'"}accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {["flight", "product", "identity", "payment"].map((step, index) => {
          const isActive = currentStep === step
          const isPast =
            ["flight", "product", "identity", "payment"].indexOf(currentStep) > index
          return (
            <div key={step} className="flex items-center gap-2">
              {index > 0 && <div className="w-8 h-px bg-border hidden sm:block" />}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isPast
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isPast ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
            </div>
          )
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Step 1: Flight Search */}
      {currentStep === "flight" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-accent" />
              Rechercher votre vol
            </CardTitle>
            <CardDescription>
              Entrez les informations de votre vol pour vérifier son éligibilité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="flightNumber">Numéro de vol</Label>
                <Input
                  id="flightNumber"
                  placeholder="AF1234"
                  value={formData.flightNumber}
                  onChange={(e) =>
                    handleInputChange("flightNumber", e.target.value.toUpperCase())
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date de départ</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Compagnies éligibles: Air France (AF), Lufthansa (LH), British Airways (BA),
              KLM (KL), Iberia (IB), Swiss (LX), ITA (AZ), Austrian (OS), SAS (SK), TAP (TP)
            </p>

            <Button onClick={handleNextStep} className="w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Vérifier le vol
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Product Selection */}
      {currentStep === "product" && flightResult && (
        <Card>
          <CardHeader>
            <CardTitle>Choisissez votre couverture</CardTitle>
            <CardDescription>
              Vol {flightResult.flightNumber} - {flightResult.route?.departure} →{" "}
              {flightResult.route?.arrival}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {flightResult.products && flightResult.products.length > 0 ? (
              <RadioGroup
                value={selectedProduct?.id.toString()}
                onValueChange={(value) => {
                  const product = flightResult.products?.find(
                    (p) => p.id.toString() === value
                  )
                  if (product) setSelectedProduct(product)
                }}
              >
                {flightResult.products.map((product) => (
                  <div
                    key={product.id}
                    className={`relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedProduct?.id === product.id
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    }`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <RadioGroupItem
                      value={product.id.toString()}
                      id={`product-${product.id}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`product-${product.id}`}
                      className="flex-1 ml-3 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Seuil: retard &gt; {product.minDelayMinutes} min
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{product.premiumEth} ETH</p>
                          <p className="text-sm text-accent">
                            Max: {product.maxPayoutEth} ETH
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Aucun produit disponible pour ce vol
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("flight")}
                className="flex-1 bg-transparent"
              >
                Retour
              </Button>
              <Button
                onClick={() => selectedProduct && handleSelectProduct(selectedProduct)}
                className="flex-1"
                disabled={!selectedProduct}
              >
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Identity */}
      {currentStep === "identity" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              Vos informations
            </CardTitle>
            <CardDescription>
              Ces informations seront associées à votre contrat d{"'"}assurance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Flight & Product Summary */}
            {flightResult && selectedProduct && (
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 mb-4">
                <div className="flex items-center gap-4">
                  <Plane className="h-6 w-6 text-accent" />
                  <div className="flex-1">
                    <p className="font-semibold">
                      Vol {flightResult.flightNumber} - {selectedProduct.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(flightResult.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{selectedProduct.premiumEth} ETH</p>
                    <p className="text-xs text-accent">
                      Max: {selectedProduct.maxPayoutEth} ETH
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="jean.dupont@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Vous recevrez votre contrat et les notifications à cette adresse
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("product")}
                className="flex-1 bg-transparent"
              >
                Retour
              </Button>
              <Button onClick={handleNextStep} className="flex-1">
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Payment */}
      {currentStep === "payment" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" />
              Paiement
            </CardTitle>
            <CardDescription>
              Connectez votre portefeuille pour finaliser la souscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wallet Connection */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-accent" />
                  <div>
                    <p className="font-medium">Portefeuille Ethereum</p>
                    {isConnected ? (
                      <p className="text-sm text-accent font-mono">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Non connecté</p>
                    )}
                  </div>
                </div>
                {!isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={connect}
                    disabled={isConnecting}
                    className="gap-2"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                    Connecter
                  </Button>
                )}
              </div>
            </div>

            {/* Optional IBAN */}
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN (optionnel)</Label>
              <Input
                id="iban"
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                value={formData.iban}
                onChange={(e) => handleInputChange("iban", formatIBAN(e.target.value))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Pour recevoir l{"'"}indemnisation en EUR (conversion automatique)
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) =>
                    handleInputChange("acceptTerms", checked as boolean)
                  }
                />
                <Label
                  htmlFor="acceptTerms"
                  className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
                >
                  J{"'"}accepte les{" "}
                  <a href="/cgv" className="text-accent hover:underline">
                    conditions générales de vente
                  </a>{" "}
                  et la{" "}
                  <a href="/confidentialite" className="text-accent hover:underline">
                    politique de confidentialité
                  </a>
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="acceptDataProcessing"
                  checked={formData.acceptDataProcessing}
                  onCheckedChange={(checked) =>
                    handleInputChange("acceptDataProcessing", checked as boolean)
                  }
                />
                <Label
                  htmlFor="acceptDataProcessing"
                  className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
                >
                  J{"'"}autorise FlightDelayInsurance à traiter mes données personnelles pour la
                  gestion de mon contrat d{"'"}assurance
                </Label>
              </div>
            </div>

            <Separator />

            {/* Payment Summary */}
            {selectedProduct && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Prime d{"'"}assurance ({selectedProduct.name})
                  </span>
                  <span>{selectedProduct.premiumEth} ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frais de réseau (estimé)</span>
                  <span>~0.001 ETH</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>
                    ~{(parseFloat(selectedProduct.premiumEth) + 0.001).toFixed(4)} ETH
                  </span>
                </div>
                <div className="flex justify-between text-sm text-accent">
                  <span>Indemnisation maximale</span>
                  <span>{selectedProduct.maxPayoutEth} ETH</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("identity")}
                className="flex-1 bg-transparent"
              >
                Retour
              </Button>
              <Button
                onClick={handleNextStep}
                className="flex-1"
                disabled={isLoading || !isConnected}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transaction en cours...
                  </>
                ) : !isConnected ? (
                  "Connectez votre portefeuille"
                ) : (
                  `Payer ${selectedProduct?.premiumEth} ETH`
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              MetaMask vous demandera de confirmer la transaction
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
