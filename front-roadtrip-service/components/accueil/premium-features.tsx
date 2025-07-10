import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";

export default function PremiumFeatures() {
  const features = [
    {
      text: "Accès à tous les itinéraires détaillés",
      icon: Check,
      color: "bg-red-100 text-red-600",
    },
    {
      text: "Assistant IA personnalisé pour planifier vos voyages",
      icon: Check,
      color: "bg-red-100 text-red-600",
    },
    {
      text: "Téléchargement des cartes hors-ligne",
      icon: Check,
      color: "bg-red-100 text-red-600",
    },
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
      features: ["Tous les avantages gratuits", ...features.map((f) => f.text)],
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
      features: ["Tous les avantages gratuits", ...features.map((f) => f.text)],
      buttonText: "S'abonner à l'année",
      buttonVariant: "outline",
      href: "/premium",
    },
  ];

  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-red-100 rounded-full opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-40 h-40 sm:w-56 sm:h-56 bg-blue-100 rounded-full opacity-20 translate-x-1/2 translate-y-1/2"></div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="mb-4 sm:mb-6 inline-flex items-center justify-center">
            <span className="font-bold text-primary uppercase text-sm sm:text-base tracking-wide">
              Abonnement Premium
            </span>
          </div>

          <Title level={2} className="mb-4 sm:mb-6">
            Passez à{" "}
            <span className="relative">
              ROADTRIP!
              <span className="absolute -bottom-1 left-0 w-full h-1 bg-primary rounded-full"></span>
            </span>{" "}
            Premium
          </Title>

          <Paragraph
            size="base"
            align="center"
            className="max-w-2xl mx-auto px-4 sm:px-0"
          >
            Débloquez toutes les fonctionnalités et vivez une expérience de
            voyage exceptionnelle.
          </Paragraph>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-10 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden h-full flex flex-col`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-700 via-primary to-primary-700 rounded-t-xl sm:rounded-t-2xl"></div>
              )}

              {/* Popular text */}
              {plan.popular && (
                <div className="text-primary text-right text-sm font-medium mb-2 mt-2">
                  Populaire
                </div>
              )}

              {/* Plan name */}
              <Title level={4} className="mb-4 sm:mb-5 text-center">
                {plan.name}
              </Title>

              {/* Price */}
              <div className="text-center mb-6 sm:mb-8">
                <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
                  {plan.price}
                </div>
                <Paragraph size="sm" className="text-muted-foreground">
                  {plan.period}
                </Paragraph>
                {plan.savings && (
                  <div className="text-green-700 text-sm font-medium mt-2">
                    {plan.savings}
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <div
                      className={`h-5 w-5 sm:h-6 sm:w-6 mr-3 mt-0.5 flex items-center justify-center rounded-full flex-shrink-0 ${
                        featureIndex === 0 && index > 0
                          ? "bg-primary/10"
                          : plan.popular
                          ? "bg-red-100"
                          : "bg-green-50"
                      }`}
                    >
                      <Check
                        className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                          featureIndex === 0 && index > 0
                            ? "text-primary"
                            : plan.popular
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-sm leading-relaxed ${
                        featureIndex === 0 && index > 0
                          ? "font-medium text-gray-800"
                          : "text-gray-700"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link href={plan.href} className="mt-auto">
                <div className="flex justify-center">
                  <Button
                    variant={plan.buttonVariant}
                  >
                    {plan.buttonText}
                  </Button>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
