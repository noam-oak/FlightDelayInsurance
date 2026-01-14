import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FlightSearch } from "@/components/flight-search"
import { ArrowRight, Shield, Zap, Sparkles } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-40" />
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        {/* Top gradient fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/30 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              <span>Protocole d{"'"}assurance décentralisé</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-xs font-mono">v2.0</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              Vol retardé ?{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent glow-text">
                Indemnisation instantanée.
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              La première assurance vol entièrement on-chain. Les smart contracts garantissent des paiements
              automatiques sans aucune démarche. Transparent, sans intermédiaire, imparable.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/souscrire">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold glow-box"
                >
                  Souscrire maintenant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#comment-ca-marche">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto glass border-border/50 hover:border-primary/50 hover:text-primary bg-transparent"
                >
                  En savoir plus
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-muted-foreground">
                  Paiement en <span className="text-foreground font-mono">24h</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  <span className="text-foreground font-mono">100%</span> Automatisé
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground">
                  Sur <span className="text-foreground font-mono">Ethereum</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Column - Flight Search */}
          <div className="lg:pl-8">
            <FlightSearch />
          </div>
        </div>
      </div>
    </section>
  )
}
