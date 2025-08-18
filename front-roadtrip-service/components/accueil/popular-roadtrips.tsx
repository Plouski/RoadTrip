import Link from "next/link";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import RoadTripCard from "@/components/road-trip-card";
import Loading from "../ui/loading";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";

interface Budget {
  amount: number;
  currency: string;
}

interface Roadtrip {
  _id?: string;
  id?: string;
  title?: string;
  image?: string;
  country?: string;
  region?: string;
  duration?: number;
  budget?: number | Budget;
  tags?: string[];
  isPremium?: boolean;
}

interface PopularRoadtripsProps {
  roadtrips: Roadtrip[];
  loading: boolean;
}

export default function PopularRoadtrips({ roadtrips, loading }: PopularRoadtripsProps) {
  const popularRoadtrips = roadtrips?.slice(0, 3) ?? [];

  return (
    <section className="container mx-auto py-10 sm:py-14">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-10">
        <div className="flex items-center group">
          <div className="h-8 sm:h-10 w-1.5 bg-gradient-to-b from-primary to-primary/40 rounded-full mr-3 sm:mr-4 group-hover:scale-y-110 transition-transform" />
          <Title level={2}>Road trips populaires</Title>
        </div>

        <Link href="/explorer" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <span className="sm:inline">Explorer les roadtrips</span>
            <span className="inline sm:hidden">Explorer</span>
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loading text="Chargement des roadtrips..." />
        </div>
      ) : popularRoadtrips.length === 0 ? (
        <div className="rounded-xl p-8 text-center border border-gray-100 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800 mb-6 shadow-inner">
            <Map className="h-8 w-8 text-gray-400" />
          </div>

          <Title level={3} className="mb-3">Aucun roadtrip populaire</Title>

          <Paragraph size="sm" align="center" className="max-w-md mx-auto mb-6">
            Il n'y a pas encore de roadtrips populaires disponibles pour le moment.
          </Paragraph>

          <Link href="/explorer">
            <Button>
              Explorer les roadtrips
              <Map className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {popularRoadtrips.map((trip) => (
            <div key={trip._id ?? trip.id} className="h-full">
              <RoadTripCard
                id={trip._id ?? trip.id ?? ""}
                title={trip.title ?? "Sans titre"}
                image={trip.image ?? "/placeholder.svg"}
                country={trip.country ?? "Inconnu"}
                region={trip.region ?? ""}
                duration={trip.duration ?? 1}
                budget={
                  typeof trip.budget === "object"
                    ? `${trip.budget?.amount ?? "?"} ${trip.budget?.currency ?? "€"}`
                    : `${trip.budget ?? "?"} €`
                }
                tags={trip.tags ?? []}
                isPremium={trip.isPremium ?? false}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
