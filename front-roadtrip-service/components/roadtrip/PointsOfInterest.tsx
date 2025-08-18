"use client";

import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";
import type { PointOfInterest } from "@/types/roadtrip";

export default function PointsOfInterest({ points }: { points: PointOfInterest[] }) {
  return (
    <section>
      <div className="flex items-center mb-6 sm:mb-8">
        <div className="h-8 sm:h-10 w-1 sm:w-1.5 bg-primary rounded-full mr-3 sm:mr-4" />
        <Title level={2}>Points d'intérêt</Title>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {points?.map((poi, i) => (
          <div key={`${poi.name}-${i}`} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
            <div className="relative overflow-hidden h-40 sm:h-48 lg:h-52">
              <img
                src={poi.image || "/placeholder.svg"}
                alt={poi.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4 sm:p-5 lg:p-6">
              <Title level={4} className="mb-2 sm:mb-3">{poi.name}</Title>
              <Paragraph className="whitespace-pre-line" size="sm">{poi.description}</Paragraph>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
