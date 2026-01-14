import { Banknote, Clock, Eye, Lock, Shield, Zap } from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Paiements automatiques",
    description:
      "Pas de réclamation, pas de formulaire. Les smart contracts déclenchent le paiement automatiquement sur retard vérifié.",
  },
  {
    icon: Eye,
    title: "Totalement transparent",
    description: "Chaque police est enregistrée sur Ethereum. Vérifiez votre couverture à tout moment sur Etherscan.",
  },
  {
    icon: Lock,
    title: "Fonds sécurisés",
    description: "Les primes sont verrouillées dans des smart contracts audités dès votre souscription.",
  },
  {
    icon: Clock,
    title: "Règlement en 24h",
    description:
      "Dès que le retard est confirmé par les oracles, le paiement est envoyé sur votre compte sous 24 heures.",
  },
  {
    icon: Shield,
    title: "Zéro franchise",
    description: "Vous recevez le montant total de l'indemnité. Pas de frais cachés ni de déductions.",
  },
  {
    icon: Banknote,
    title: "Tarification claire",
    description: "Prime fixe affichée d'entrée. Ce que vous voyez est ce que vous payez, toujours.",
  },
]

export function Features() {
  return (
    <section id="avantages" className="py-24 relative overflow-hidden">
      {/* Background orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-accent font-mono text-sm mb-3 tracking-wider">AVANTAGES DU PROTOCOLE</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Pourquoi choisir FlightDelayInsurance</h2>
          <p className="text-lg text-muted-foreground">
            L{"'"}assurance nouvelle génération qui élimine les frictions traditionnelles
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl glass border-border/50 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center group-hover:border-primary/40 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
