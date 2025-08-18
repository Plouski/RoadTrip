"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { RoadtripService } from "@/services/roadtrip-service";
import { FavoriteService } from "@/services/favorites-service";
import RoadTripCard from "@/components/road-trip-card";
import { Filter, RefreshCcw } from "lucide-react";
import SearchFilters from "@/components/search-bar";
import { useSearchFilters } from "@/hooks/useSearchFilters";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";

export default function ExplorerPage() {
  const [baseTrips, setBaseTrips] = useState<any[]>([]);     // source complète enrichie
  const [roadtrips, setRoadtrips] = useState<any[]>([]);    // filtrée pour l'affichage
  const [loading, setLoading] = useState(true);

  const { filters, updateFilter, resetFilters, activeCount } = useSearchFilters();

  // Récupération initiale des roadtrips + favoris
  const fetchAllTrips = useCallback(async () => {
    setLoading(true);
    try {
      const response = await RoadtripService.getPublicRoadtrips();
      const allTrips = response?.trips || [];

      // Récupère favoris (si connecté) — silencieux si erreur
      let favoriteTrips: any[] = [];
      try {
        const favData = await FavoriteService.getFavorites();
        favoriteTrips = favData?.roadtrips || [];
      } catch {
        favoriteTrips = [];
      }

      const favoriteIds = new Set(favoriteTrips.map((t) => t._id));
      const enriched = allTrips.map((t: any) => ({
        ...t,
        isFavorite: favoriteIds.has(t._id),
      }));

      setBaseTrips(enriched);
      setRoadtrips(enriched); // affichage initial = tout
    } catch (err) {
      console.error("Erreur lors du chargement des roadtrips :", err);
      setBaseTrips([]);
      setRoadtrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTrips();
  }, [fetchAllTrips]);

  // Options pour selects/badges — basées sur la SOURCE complète
  const allCountries = useMemo(
    () => Array.from(new Set(baseTrips.map((t) => t.country).filter(Boolean))),
    [baseTrips]
  );
  const allTags = useMemo(
    () =>
      Array.from(
        new Set(
          baseTrips
            .flatMap((t) => (Array.isArray(t.tags) ? t.tags : []))
            .filter(Boolean)
        )
      ),
    [baseTrips]
  );

  // Application locale des filtres sur baseTrips
  const applyFilters = useCallback(() => {
    const {
      searchQuery,
      selectedCountry,
      durationRange,
      budgetRange,
      season,
      selectedTag,
      isPremium,
    } = filters;

    let filtered = baseTrips;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.country?.toLowerCase().includes(q) ||
          (Array.isArray(t.tags) && t.tags.some((tag: string) => tag.toLowerCase().includes(q)))
      );
    }

    if (selectedCountry !== "all") {
      filtered = filtered.filter((t) => t.country === selectedCountry);
    }

    if (durationRange !== "all") {
      filtered = filtered.filter((t) => {
        if (durationRange === "short") return t.duration <= 3;
        if (durationRange === "medium") return t.duration > 3 && t.duration <= 7;
        if (durationRange === "long") return t.duration > 7;
        return true;
      });
    }

    if (budgetRange !== "all") {
      filtered = filtered.filter((t) => {
        const amount = t.budget?.amount || 0;
        if (budgetRange === "low") return amount <= 500;
        if (budgetRange === "medium") return amount > 500 && amount <= 1000;
        if (budgetRange === "high") return amount > 1000 && amount <= 2000;
        if (budgetRange === "luxury") return amount > 2000;
        return true;
      });
    }

    if (season !== "all") {
      filtered = filtered.filter((t) => t.bestSeason?.toLowerCase() === season);
    }

    if (selectedTag !== "all") {
      filtered = filtered.filter((t) => Array.isArray(t.tags) && t.tags.includes(selectedTag));
    }

    if (isPremium !== "all") {
      filtered = filtered.filter((t) => t.isPremium === (isPremium === "true"));
    }

    setRoadtrips(filtered);
  }, [baseTrips, filters]);

  // Réinitialise + réapplique (affiche tout)
  const handleReset = () => {
    resetFilters();
    setRoadtrips(baseTrips);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="flex-1">
            <Title level={2} className="mb-3 sm:mb-4">
              Explorer les Roadtrips
            </Title>
            <Paragraph size="base" className="max-w-2xl">
              Découvrez nos itinéraires soigneusement sélectionnés à travers le monde
            </Paragraph>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-8 sm:mb-12">
          <SearchFilters
            filters={filters}
            updateFilter={updateFilter}
            resetFilters={handleReset}
            onApply={applyFilters}
            allCountries={allCountries}
            allTags={allTags}
          />
        </div>

        {/* Résumé */}
        <div className="mb-6 sm:mb-8">
          {!loading && (
            <Paragraph size="sm">
              {roadtrips.length} {roadtrips.length > 1 ? "itinéraires trouvés" : "itinéraire trouvé"}
            </Paragraph>
          )}
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex justify-center py-16 sm:py-20">
            <Loading text="Chargement de vos aventures..." />
          </div>
        ) : roadtrips.length === 0 ? (
          <div className="rounded-xl p-8 text-center border border-gray-200 bg-white shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
              <Filter className="h-6 w-6 text-gray-400" />
            </div>
            <Title level={3} className="mb-4">
              Aucun roadtrip ne correspond à vos critères
            </Title>
            <Paragraph size="sm" className="max-w-md mx-auto mb-6">
              Essayez d'ajuster vos filtres pour découvrir nos itinéraires incroyables ou explorez-les tous.
            </Paragraph>
            <Button variant="outline" onClick={handleReset}>
              Afficher tous les roadtrips
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
            {roadtrips.map((trip, index) => (
              <RoadTripCard
                key={trip._id || index}
                id={trip._id}
                title={trip.title}
                image={trip.image}
                country={trip.country}
                region={trip.region}
                duration={trip.duration}
                budget={trip.budget?.amount || 0}
                tags={trip.tags}
                isPremium={trip.isPremium}
                isFavorite={trip.isFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
