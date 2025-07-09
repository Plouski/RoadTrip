import { Map, Compass, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";

export default function HowItWorks() {
  const steps = [
    {
      icon: Map,
      title: "Explorez",
      description:
        "Parcourez notre collection d'itinéraires soigneusement sélectionnés à travers le monde entier.",
      color: "bg-red-600",
    },
    {
      icon: Compass,
      title: "Personnalisez",
      description:
        "Adaptez l'itinéraire à vos préférences, ajoutez des étapes ou modifiez la durée selon vos envies.",
      color: "bg-red-600",
    },
    {
      icon: Star,
      title: "Voyagez",
      description:
        "Téléchargez votre itinéraire et partez à l'aventure avec toutes les informations nécessaires.",
      color: "bg-red-600",
    },
  ];

  return (
    <section className="container mx-auto">
      {/* Section titre */}
      <div className="text-center mb-16 sm:mb-20">
        <div className="inline-flex items-center justify-center mb-4 sm:mb-6">
          <div className="h-px w-8 sm:w-10 lg:w-12 bg-primary mr-3 sm:mr-4" />
          <span className="text-primary font-semibold tracking-wide text-xs sm:text-sm uppercase">
            FONCTIONNEMENT
          </span>
          <div className="h-px w-8 sm:w-10 lg:w-12 bg-primary ml-3 sm:ml-4" />
        </div>
        
        <Title level={2} className="mb-4 sm:mb-6">
          Comment ça marche
        </Title>
        
        <Paragraph 
          size="base" 
          align="center"
          className="max-w-2xl mx-auto px-4 sm:px-0"
        >
          Planifier votre road trip parfait n'a jamais été aussi simple avec{" "}
          <span className="text-primary font-medium">ROADTRIP!</span>
        </Paragraph>
      </div>

      {/* Étapes avec ligne de connexion responsive */}
      <div className="relative max-w-6xl mx-auto">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12 lg:gap-16">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative text-center p-6 sm:p-8 bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 group"
            >
              {/* Numéro de l'étape */}
              <div className="absolute -top-8 sm:-top-10 left-1/2 transform -translate-x-1/2">
                <div
                  className={`${step.color} text-white rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold">{i + 1}</span>
                </div>
              </div>
              
              <div className="pt-10 sm:pt-12">
                <Title level={4} className="mb-3 sm:mb-4">
                  {step.title}
                </Title>
                
                <Paragraph size="sm" className="mb-4 sm:mb-6">
                  {step.description}
                </Paragraph>
                
                <div className="flex justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                  <step.icon className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bouton final */}
      <div className="text-center mt-12 sm:mt-16">
        <Link href="/explorer">
          <Button>
            Commencer l'aventure
          </Button>
        </Link>
      </div>
    </section>
  );
}