import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Title from "../ui/title"
import Paragraph from "../ui/paragraph"

export default function HeroSection() {
  return (
    <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
      
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge responsive */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-red-50 text-red-600 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            Premium Roadtrips
          </div>

          {/* Title responsive */}
          <Title level={1} className="mb-4 sm:mb-6">
            Élevez vos road trips au niveau supérieur
          </Title>

          {/* Description responsive */}
          <Paragraph
            size="base"
            align="center"
            className="max-w-xl sm:max-w-2xl mx-auto mb-8 sm:mb-10 px-4 sm:px-0"
          >
            Découvrez une expérience de voyage sans précédent avec des
            itinéraires exclusifs, un assistant IA personnalisé et des
            fonctionnalités premium conçues pour les aventuriers passionnés.
          </Paragraph>

          {/* CTA buttons responsive */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0">
            <Link href="/explorer" className="w-full sm:w-auto">
              <Button>
                Explorer les itinéraires
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}