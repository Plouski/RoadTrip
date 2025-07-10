import { Button } from "@/components/ui/button";
import Link from "next/link";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";

export default function Hero() {
  return (
    <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] w-full overflow-hidden">
      {/* Image d'arrière-plan avec overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/accueil.jpg?height=1080&width=1920')",
          backgroundPosition: "center 30%",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />

      {/* Contenu principal */}
      <div className="container relative z-10 flex h-full flex-col items-center justify-center text-center text-white px-4 sm:px-6 lg:px-8">
        <Title level={1} className="mb-4 sm:mb-6 max-w-4xl text-white">
          Votre prochaine <span className="text-primary">aventure</span>{" "}
          commence ici
        </Title>
        
        <Paragraph 
          size="base" 
          align="center"
          className="mb-8 sm:mb-10 max-w-2xl text-white/90 px-4 sm:px-0"
        >
          Découvrez des itinéraires uniques, planifiez votre road trip idéal et
          créez des souvenirs inoubliables.
        </Paragraph>
        
        {/* Boutons responsive */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 w-full sm:w-auto">
          <Link href="/explorer" className="w-full sm:w-auto">
            <Button>
              Explorer les itinéraires
            </Button>
          </Link>
          <Link href="/premium" className="w-full sm:w-auto">
            <Button variant="outline">
              Découvrir Premium
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}