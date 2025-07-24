import { Button } from "@/components/ui/button"
import Link from "next/link"
import Title from "@/components/ui/title"
import Paragraph from "@/components/ui/paragraph"
import Image from "next/image"

export default function Hero() {
  return (
    <section
      aria-label="Section de bienvenue - Découvrez votre prochaine aventure"
      className="relative h-[400px] sm:h-[500px] lg:h-[600px] w-full overflow-hidden"
    >
      <Image
        src="/accueil.jpg"
        alt="Paysage de roadtrip inspirant"
        fill
        priority
        quality={85}
        sizes="100vw"
        className="object-cover object-[center_30%]"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-10" />

      <div className="container relative z-20 flex h-full flex-col items-center justify-center text-center text-white px-4 sm:px-6 lg:px-8">
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

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 w-full sm:w-auto">
          <Button asChild>
            <Link href="/explorer" aria-label="Explorer les itinéraires disponibles">
              Explorer les itinéraires
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/premium" aria-label="Découvrir les avantages Premium">
              Découvrir Premium
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
