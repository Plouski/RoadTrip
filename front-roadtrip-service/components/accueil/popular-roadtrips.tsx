import Link from "next/link";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import RoadTripCard from "@/components/road-trip-card";
import Loading from "../ui/loading";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";

interface PopularRoadtripsProps {
  roadtrips: any[];
  loading: boolean;
}

export default function PopularRoadtrips({
  roadtrips,
  loading,
}: PopularRoadtripsProps) {
  const popularRoadtrips = roadtrips?.slice(0, 3) || [];

  return (
    <section className="container mx-auto">
      {/* Header avec titre et bouton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
        <div className="flex items-center group">
          <div className="h-8 sm:h-10 w-1.5 bg-gradient-to-b from-primary to-primary/40 rounded-full mr-3 sm:mr-4 group-hover:scale-y-110 transition-transform"></div>
          <Title level={2}>
            Road trips populaires
          </Title>
        </div>
        
        <Link href="/explorer" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <span className="sm:inline">Explorer les roadtrips</span>
            <span className="inline sm:hidden">Explorer</span>
          </Button>
        </Link>
      </div>

      {/* Contenu principal */}
      {loading ? (
        <div className="flex justify-center py-12 sm:py-16">
          <Loading text="Chargement des roadtrips..." />
        </div>
      ) : popularRoadtrips.length === 0 ? (
        <div className="rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center border border-gray-100 bg-white shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 mb-4 sm:mb-6 shadow-inner">
            <Map className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
          </div>
          
          <Title level={3} className="mb-3">
            Aucun roadtrip populaire
          </Title>
          
          <Paragraph 
            size="sm" 
            align="center"
            className="max-w-md mx-auto mb-6 sm:mb-8 px-4 sm:px-0"
          >
            Il n'y a pas encore de roadtrips populaires disponibles pour le
            moment.
          </Paragraph>
          
          <Link href="/explorer">
            <Button>
              Explorer les roadtrips
              <Map className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {popularRoadtrips.map((trip) => (
            <div key={trip.id} className="h-full">
              <RoadTripCard
                id={trip.id}
                title={trip.title}
                image={trip.image}
                country={trip.country}
                region={trip.region}
                duration={trip.duration}
                budget={
                  typeof trip.budget === "object"
                    ? `${trip.budget.amount} ${trip.budget.currency}`
                    : `${trip.budget} €`
                }
                tags={trip.tags}
                isPremium={trip.isPremium}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}