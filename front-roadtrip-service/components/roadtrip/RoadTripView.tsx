"use client";

import RoadTripHero from "./RoadTripHero";
import { RoadTripItinerary, PremiumItineraryLocked } from "./RoadTripItinerary";
import PointsOfInterest from "./PointsOfInterest";
import RoadTripSidebar from "./RoadTripSidebar";
import type { Roadtrip } from "@/types/roadtrip";

type Props = {
  roadTrip: Roadtrip & { _id?: string };
  userRole: "user" | "admin" | "premium";
  canAccessPremium: boolean;
  favorite: boolean;
  favoriteLoading?: boolean; // 👈 nouveau (optionnel)
  onAddToFavorites: (e: React.MouseEvent) => void;
  onShare: () => void;
  onGeneratePdf: () => void;
  onDelete: () => void;
};

export default function RoadTripView({
  roadTrip,
  userRole,
  canAccessPremium,
  favorite,
  favoriteLoading = false, // 👈 défaut
  onAddToFavorites,
  onShare,
  onGeneratePdf,
  onDelete,
}: Props) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <RoadTripHero
        image={roadTrip.image}
        title={roadTrip.title}
        description={roadTrip.description}
        country={roadTrip.country}
        region={roadTrip.region}
        isPremium={roadTrip.isPremium}
        canAccessPremium={canAccessPremium}
        tags={roadTrip.tags}
      />

      <div className="container grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-8">
          {roadTrip.pointsOfInterest?.length > 0 && (
            <PointsOfInterest points={roadTrip.pointsOfInterest} />
          )}

          {roadTrip.isPremium && !canAccessPremium ? (
            <PremiumItineraryLocked />
          ) : (
            <RoadTripItinerary itinerary={roadTrip.itinerary} />
          )}
        </div>

        <RoadTripSidebar
          roadTrip={roadTrip}
          userRole={userRole}
          canAccessPremium={canAccessPremium}
          favorite={favorite}
          favoriteLoading={favoriteLoading} // 👈 passe au sidebar
          handleAddToFavorites={onAddToFavorites}
          handleShare={onShare}
          generatePdf={onGeneratePdf}
          handleDelete={onDelete}
        />
      </div>
    </div>
  );
}
