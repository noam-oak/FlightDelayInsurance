import { Card, CardContent } from "@/components/ui/card"
import { Search, CreditCard, Plane, Wallet, ArrowRight } from "lucide-react"

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Trouvez votre vol",
    description: "Entrez votre numéro de vol et date de départ pour vérifier l'éligibilité instantanément.",
  },
  {
    icon: CreditCard,
    step: "02",
    title: "Souscrivez",
    description: "Payez votre prime et un smart contract est déployé sur Ethereum.",
  },
  {
    icon: Plane,
    step: "03",
    title: "Voyagez sereinement",
    description: "Nos oracles surveillent votre vol en temps réel. Vous n'avez rien à faire.",
  },
  {
    icon: Wallet,
    step: "04",
    title: "Paiement automatique",
    description: "En cas de retard, les fonds sont envoyés automatiquement sous 24h. Sans démarche.",
  },
]

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="py-24 relative">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-mono text-sm mb-3 tracking-wider">FONCTIONNEMENT DU PROTOCOLE</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Comment ça marche</h2>
          <p className="text-lg text-muted-foreground">Quatre étapes vers une assurance vol sans intermédiaire</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <Card className="glass border-border/50 hover:border-primary/50 transition-all duration-300 h-full group-hover:glow-box">
                <CardContent className="pt-6">
                  {/* Step number */}
                  <div className="text-4xl font-bold text-primary/20 font-mono mb-4">{step.step}</div>
                  {/* Icon */}
                  <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
              {/* Arrow between cards */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-6 w-6 text-primary/30" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
