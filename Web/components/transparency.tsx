import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Blocks, Database, ExternalLink, FileText, ShieldCheck } from "lucide-react"

export function Transparency() {
  return (
    <section id="transparence" className="py-24 relative">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <p className="text-primary font-mono text-sm tracking-wider">COUCHE DE CONFIANCE</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Vérifiable on-chain
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Contrairement aux assurances traditionnelles, chaque police FlightDelayInsurance vit sur Ethereum. Vérifiez votre
              couverture, consultez les fonds verrouillés et auditez nos smart contracts à tout moment.
            </p>

            <div className="space-y-4">
              {[
                {
                  icon: FileText,
                  title: "Polices immuables",
                  desc: "Chaque souscription crée une transaction Ethereum avec lien Etherscan",
                },
                {
                  icon: Database,
                  title: "Oracles Chainlink",
                  desc: "Données de vol provenant d'oracles décentralisés certifiés - infalsifiables",
                },
                {
                  icon: ShieldCheck,
                  title: "Open source",
                  desc: "Smart contracts publics et audités par les meilleures sociétés de sécurité",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-xl glass border-border/30 hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground">
              <ExternalLink className="h-4 w-4" />
              Voir le smart contract
            </Button>
          </div>

          <div className="space-y-4">
            <Card className="glass-strong border-primary/30 overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/30 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Blocks className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-mono">PREUVE DE TRANSACTION</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-success animate-pulse" />
                    <span className="text-xs text-success font-mono">CONFIRMÉE</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Terminal output style */}
                <div className="p-4 font-mono text-xs space-y-2 bg-background/50">
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">tx_hash</span>
                    <span className="text-primary">0x7f3e...8a2d</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">bloc</span>
                    <span className="text-foreground">19,234,567</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">contrat</span>
                    <span className="text-accent">FlightDelayInsurance_v2</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">vol</span>
                    <span className="text-foreground">AF1234</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">indemnité</span>
                    <span className="text-success">150 EUR</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">statut</span>
                    <span className="text-primary">ACTIF</span>
                  </div>
                </div>
                <div className="p-3 bg-primary/5 border-t border-border/30">
                  <p className="text-xs text-muted-foreground text-center">
                    La preuve cryptographique garantit l{"'"}existence et les termes de la police
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Live stats card */}
            <Card className="glass border-border/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold font-mono text-primary">2.4K</p>
                    <p className="text-xs text-muted-foreground">Polices actives</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono text-accent">847K€</p>
                    <p className="text-xs text-muted-foreground">TVL verrouillée</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono text-success">99.8%</p>
                    <p className="text-xs text-muted-foreground">Disponibilité</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
