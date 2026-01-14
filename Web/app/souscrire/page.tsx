import { Suspense } from "react"
import { Header } from "@/components/header"
import { SubscriptionForm } from "@/components/subscription-form"
import { Shield, CheckCircle, Lock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SouscrirePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Souscrire à votre assurance</h1>
              <p className="text-muted-foreground">
                Remplissez le formulaire ci-dessous pour finaliser votre souscription en quelques minutes.
              </p>
            </div>

            <Suspense
              fallback={
                <div className="animate-pulse space-y-4">
                  <div className="h-12 bg-muted rounded-lg" />
                  <div className="h-12 bg-muted rounded-lg" />
                  <div className="h-12 bg-muted rounded-lg" />
                </div>
              }
            >
              <SubscriptionForm />
            </Suspense>
          </div>

          {/* Right Column - Summary & Trust */}
          <div className="space-y-6">
            <div className="sticky top-24 space-y-6">
              {/* Trust Indicators */}
              <div className="p-6 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold">Paiement sécurisé</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>Transaction cryptée SSL/TLS</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>Aucune donnée bancaire stockée</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>Contrat garanti sur blockchain</span>
                  </li>
                </ul>
              </div>

              {/* Process Info */}
              <div className="p-6 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold">Après souscription</h3>
                </div>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-foreground">1.</span>
                    <span>Vous recevez un email de confirmation avec votre contrat PDF</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-foreground">2.</span>
                    <span>Un lien Etherscan vous permet de vérifier votre contrat</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-foreground">3.</span>
                    <span>En cas de retard, le virement est automatique sous 24h</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
