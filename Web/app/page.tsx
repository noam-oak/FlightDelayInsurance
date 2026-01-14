import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { HowItWorks } from "@/components/how-it-works"
import { Features } from "@/components/features"
import { Transparency } from "@/components/transparency"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <HowItWorks />
        <Features />
        <Transparency />
      </main>
      <Footer />
    </div>
  )
}
