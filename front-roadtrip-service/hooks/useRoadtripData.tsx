"use client";

import { useEffect, useState } from "react";
import { Roadtrip, ItineraryStep } from "@/hooks/useRoadtripForm";
import { RoadtripService } from "@/services/roadtrip-service";

type Mode = "create" | "edit";

export function useRoadtripData(mode: Mode, id?: string) {
  const [data, setData] = useState<Roadtrip | null>(null);
  const [initialItinerary, setInitialItinerary] = useState<ItineraryStep[] | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (mode === "create") {
      // Laisser le hook de formulaire gérer l'état initial par défaut
      setLoading(false);
      return;
    }
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const rt = await RoadtripService.getRoadtripById(id);
        if (!rt) {
          setNotFound(true);
          return;
        }

        const normalized: Roadtrip = {
          title: rt.title || "",
          image: rt.image || "/placeholder.svg?height=600&width=800",
          country: rt.country || "",
          region: rt.region || "",
          duration: rt.duration || 7,
          budget: typeof rt.budget === "object" ? rt.budget.amount : rt.budget || 1000,
          tags: rt.tags || [],
          description: rt.description || "",
          isPremium: !!rt.isPremium,
          bestSeason: rt.bestSeason || "",
          pointsOfInterest: (rt.pointsOfInterest || []).map((p: any) => ({
            name: p.name || "",
            description: p.description || "",
            image: p.image || "/placeholder.svg?height=300&width=400",
          })),
          itinerary: [], // injecté via initialItinerary
          isPublished: !!rt.isPublished,
        };

        const steps: ItineraryStep[] = (rt.itinerary || []).map((s: any, i: number) => ({
          day: s.day ?? i + 1,
          title: s.title || "",
          description: s.description || "",
          overnight: s.overnight !== undefined ? !!s.overnight : true,
        }));

        setData(normalized);
        setInitialItinerary(steps);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, id]);

  return { data, initialItinerary, loading, notFound };
}