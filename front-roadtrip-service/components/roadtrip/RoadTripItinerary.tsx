"use client";

import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";
import { Clock, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ItineraryStep } from "@/types/roadtrip";

export function RoadTripItinerary({ itinerary }: { itinerary: ItineraryStep[] }) {
  return (
    <section>
      <div className="flex items-center mb-6 sm:mb-8">
        <div className="h-8 sm:h-10 w-1 sm:w-1.5 bg-primary rounded-full mr-3 sm:mr-4" />
        <Title level={2}>Itinéraire jour par jour</Title>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {itinerary.map((step, index) => (
          <div
            key={`${step.day}-${index}`}
            className={`border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 ${
              index % 2 === 0 ? "bg-gray-50/50" : "bg-white"
            }`}
          >
            <Title level={4} className="mb-2 sm:mb-3">
              Jour {step.day} — {step.title}
            </Title>
            <Paragraph size="sm" className="mb-3 whitespace-pre-line">{step.description}</Paragraph>
            {step.overnight && (
              <div className="flex items-center text-xs sm:text-sm text-primary font-medium">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                Nuit sur place
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function PremiumItineraryLocked() {
  return (
    <section className="border border-gray-100 rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center mb-6 sm:mb-8">
        <div className="h-8 sm:h-10 w-1 sm:w-1.5 bg-primary rounded-full mr-3 sm:mr-4" />
        <Title level={2}>Itinéraire détaillé jour par jour</Title>
      </div>

      <div className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 sm:py-16 lg:py-20 bg-white border border-dashed border-primary/30 rounded-xl">
        <div className="mb-6 sm:mb-8">
          <div className="bg-primary/10 p-4 sm:p-6 rounded-full inline-flex items-center justify-center">
            <Lock className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>
        </div>
        <Title level={3} className="mb-4 sm:mb-6">Contenu réservé aux membres Premium</Title>
        <Paragraph size="base" align="center" className="max-w-xl mb-6 sm:mb-8 px-4 sm:px-0">
          Débloquez l'accès à l'itinéraire détaillé.
        </Paragraph>
        <Link href="/premium">
          <Button className="px-6 sm:px-8 py-3">Passer à Premium</Button>
        </Link>
      </div>
    </section>
  );
}