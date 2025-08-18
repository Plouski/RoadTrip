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
    },
    {
      icon: Compass,
      title: "Personnalisez",
      description:
        "Adaptez l'itinéraire à vos préférences, ajoutez des étapes ou modifiez la durée selon vos envies.",
    },
    {
      icon: Star,
      title: "Voyagez",
      description:
        "Téléchargez votre itinéraire et partez à l'aventure avec toutes les informations nécessaires.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="container mx-auto py-16 px-4 sm:px-6 lg:px-8"
      aria-labelledby="how-it-works-heading"
    >
      <div className="text-center mb-16">
        <div className="flex items-center justify-center mb-5 gap-4">
          <span className="w-12 h-px bg-primary" />
          <span className="text-primary font-semibold tracking-wide text-xs sm:text-sm uppercase">
            Fonctionnement
          </span>
          <span className="w-12 h-px bg-primary" />
        </div>

        <Title id="how-it-works-heading" level={2} className="mb-4">
          Comment ça marche
        </Title>

        <Paragraph size="base" align="center" className="max-w-2xl mx-auto">
          Planifier votre road trip parfait n’a jamais été aussi simple avec{" "}
          <span className="text-primary font-semibold">RoadTrip!</span>
        </Paragraph>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="relative bg-white dark:bg-zinc-900 text-center p-6 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-md group transition-all duration-300 hover:shadow-xl"
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                <div className="bg-primary text-white rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-xl font-bold shadow-lg transition-transform group-hover:scale-110">
                  {index + 1}
                </div>
              </div>

              <div className="pt-14">
                <Title level={3} className="mb-3">
                  {step.title}
                </Title>

                <Paragraph
                  size="sm"
                  className="mb-5 text-gray-600 dark:text-gray-300"
                >
                  {step.description}
                </Paragraph>

                <div className="flex justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                  <Icon className="text-primary w-6 h-6" aria-hidden="true" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-16">
        <Button size="lg" asChild>
          <Link
            href="/explorer"
            aria-label="Commencer à explorer les roadtrips"
          >
            Commencer l'aventure
          </Link>
        </Button>
      </div>
    </section>
  );
}
