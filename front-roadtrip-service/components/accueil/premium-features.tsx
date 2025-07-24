import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";

export default function PremiumFeatures() {
  const features = [
    "Accès à tous les itinéraires détaillés",
    "Assistant IA personnalisé pour planifier vos voyages",
    "Téléchargement des cartes hors-ligne",
  ];

  const plans = [
    {
      name: "Découverte",
      price: "0€",
      period: "pour toujours",
      popular: false,
      features: [
        "Accès aux itinéraires de base",
        "Recherche de destinations",
        "Sauvegarde de favoris",
      ],
      buttonText: "Commencer gratuitement",
      buttonVariant: "outline",
      href: "/auth",
    },
    {
      name: "Mensuel",
      price: "5€",
      period: "par mois",
      popular: true,
      features: ["Tous les avantages gratuits", ...features],
      buttonText: "S'abonner maintenant",
      buttonVariant: "default",
      href: "/premium",
    },
    {
      name: "Annuel",
      price: "45€",
      period: "par an",
      savings: "Économisez 25%",
      popular: false,
      features: ["Tous les avantages gratuits", ...features],
      buttonText: "S'abonner à l'année",
      buttonVariant: "outline",
      href: "/premium",
    },
  ];

  return (
    <section className="py-16 sm:py-20 relative overflow-hidden bg-white">
      <div className="absolute top-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-red-100 rounded-full opacity-20 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-40 h-40 sm:w-56 sm:h-56 bg-blue-100 rounded-full opacity-20 translate-x-1/2 translate-y-1/2" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span className="font-bold text-primary uppercase text-sm sm:text-base tracking-wide mb-4 block">
            Abonnement Premium
          </span>

          <Title level={2} className="mb-4 sm:mb-6">
            Passez à <span className="text-primary">RoadTrip!</span> Premium
          </Title>

          <Paragraph size="base" align="center" className="max-w-2xl mx-auto">
            Débloquez toutes les fonctionnalités et vivez une expérience de
            voyage exceptionnelle.
          </Paragraph>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col p-6 sm:p-8 lg:p-10 bg-white rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1
                ${
                  plan.popular
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-gray-200"
                }
              `}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-4 py-1 rounded-full shadow">
                  ⭐ Populaire
                </div>
              )}

              <Title level={3} className="mb-4 sm:mb-5 text-center">
                {plan.name}
              </Title>

              <div className="text-center mb-6 sm:mb-8">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
                  {plan.price}
                </div>
                <Paragraph size="sm" className="text-gray-500">
                  {plan.period}
                </Paragraph>
                {plan.savings && (
                  <div className="text-green-800 text-sm font-medium mt-2">
                    {plan.savings}
                  </div>
                )}
              </div>

              <ul className="space-y-3 sm:space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <div className="h-6 w-6 mr-3 mt-0.5 flex items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-gray-700 leading-relaxed">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className="mt-auto"
                aria-label={plan.buttonText}
              >
                <Button
                  variant={plan.buttonVariant}
                  className="w-full min-h-[48px] text-base"
                >
                  {plan.buttonText}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
