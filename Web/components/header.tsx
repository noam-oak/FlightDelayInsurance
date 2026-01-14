"use client"

import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { Hexagon, Loader2, Menu, Wallet, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { address, isConnected, isConnecting, connect, shortenAddress } = useWallet()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <Hexagon className="h-8 w-8 text-primary fill-primary/20" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary"></span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlightDelayInsurance
          </span>
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline">PROTOCOLE</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#comment-ca-marche"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Comment ça marche
          </Link>
          <Link href="#avantages" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Avantages
          </Link>
          <Link href="#transparence" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Transparence
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-mono text-accent">{shortenAddress}</span>
            </div>
          ) : (
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
              {isConnecting ? "Connexion..." : "Connecter"}
            </Button>
          )}
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Tableau de bord
            </Button>
          </Link>
          <Link href="/transactions">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Transactions
            </Button>
          </Link>
          <Link href="/admin/flights">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Admin Vols
            </Button>
          </Link>
          <Link href="/souscrire">
            <Button
              size="sm"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold"
            >
              Souscrire
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/50 glass">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link
              href="#comment-ca-marche"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Comment ça marche
            </Link>
            <Link
              href="#avantages"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Avantages
            </Link>
            <Link
              href="#transparence"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Transparence
            </Link>
            <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
              {isConnected ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-sm font-mono text-accent">{shortenAddress}</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    connect()
                    setIsMenuOpen(false)
                  }}
                  disabled={isConnecting}
                  className="w-full gap-2"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  {isConnecting ? "Connexion..." : "Connecter le portefeuille"}
                </Button>
              )}
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  Tableau de bord
                </Button>
              </Link>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  Transactions
                </Button>
              </Link>
              <Link href="/admin/flights">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  Admin Vols
                </Button>
              </Link>
              <Link href="/souscrire">
                <Button size="sm" className="w-full bg-gradient-to-r from-primary to-accent">
                  Souscrire
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
