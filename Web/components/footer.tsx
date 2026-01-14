import { Github, Hexagon, Twitter } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/50 glass">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative">
                <Hexagon className="h-7 w-7 text-primary fill-primary/20" />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">
                  FS
                </span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                FlightDelayInsurance
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Assurance vol paramétrique décentralisée. Transparente, automatique, sans intermédiaire.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-8 h-8 rounded-lg glass border-border/50 flex items-center justify-center hover:border-primary/50 transition-colors"
              >
                <Twitter className="h-4 w-4 text-muted-foreground" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-lg glass border-border/50 flex items-center justify-center hover:border-primary/50 transition-colors"
              >
                <Github className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Protocole</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/souscrire" className="hover:text-primary transition-colors">
                  Souscrire
                </Link>
              </li>
              <li>
                <Link href="#comment-ca-marche" className="hover:text-primary transition-colors">
                  Comment ça marche
                </Link>
              </li>
              <li>
                <Link href="#avantages" className="hover:text-primary transition-colors">
                  Avantages
                </Link>
              </li>
              <li>
                <Link href="#transparence" className="hover:text-primary transition-colors">
                  Transparence
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Ressources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Référence API
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Audits de sécurité
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Bug Bounty
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Légal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/cgv" className="hover:text-primary transition-colors">
                  Conditions générales
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-primary transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <a
                  href="https://etherscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Smart Contract
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2026 FlightDelayInsurance Protocol. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Réseau : Ethereum Mainnet
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
