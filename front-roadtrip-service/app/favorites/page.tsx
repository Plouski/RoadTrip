"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import RoadTripCard from "@/components/road-trip-card";
import { Heart, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchFilters from "@/components/search-bar";
import Loading from "@/components/ui/loading";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";
import { FavoriteService } from "@/services/favorites-service";
import { useSearchFilters } from "@/hooks/useSearchFilters";

export default function FavoritesPage() {
  const router = useRouter();

  // source complète et vue filtrée
  const [favorites, setFavorites] = useState<any[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // hook unifié de filtres
  const { filters, updateFilter, resetFilters, activeCount } = useSearchFilters();

  // chargement initial
  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await FavoriteService.getFavorites();
      const favoriteTrips = Array.isArray(data.roadtrips) ? data.roadtrips : [];
      const mapped = favoriteTrips
       .filter((t: any) => t?.isPublished)
       .map((t: any) => ({ ...t, isFavorite: true }));
      setFavorites(mapped);
      setFilteredFavorites(mapped); // affichage initial
    } catch (error) {
      console.error("Erreur lors du chargement des favoris:", error);
      setFavorites([]);
      setFilteredFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // options des filtres basées sur la source complète
  const allCountries = useMemo(
    () => Array.from(new Set(favorites.map((t) => t.country).filter(Boolean))),
    [favorites]
  );
  const allTags = useMemo(
    () =>
      Array.from(
        new Set(
          favorites
            .flatMap((t) => (Array.isArray(t.tags) ? t.tags : []))
            .filter(Boolean)
        )
      ),
    [favorites]
  );

  // application locale des filtres
  const applyFilters = useCallback(() => {
    const {
      searchQuery,
      selectedCountry,
      selectedTag,
      budgetRange,
      durationRange,
      season,
      isPremium,
    } = filters;

    const q = searchQuery.trim().toLowerCase();

    const result = favorites.filter((trip) => {
      const amount = trip.budget?.amount || 0;

      const matchesQuery =
        !q ||
        trip.title?.toLowerCase().includes(q) ||
        trip.country?.toLowerCase().includes(q) ||
        (Array.isArray(trip.tags) && trip.tags.some((tag: string) => tag.toLowerCase().includes(q)));

      const matchesCountry = selectedCountry === "all" || trip.country === selectedCountry;

      const matchesTag =
        selectedTag === "all" || (Array.isArray(trip.tags) && trip.tags.includes(selectedTag));

      const matchesBudget =
        budgetRange === "all" ||
        (budgetRange === "low" && amount <= 500) ||
        (budgetRange === "medium" && amount > 500 && amount <= 1000) ||
        (budgetRange === "high" && amount > 1000 && amount <= 2000) ||
        (budgetRange === "luxury" && amount > 2000);

      const matchesDuration =
        durationRange === "all" ||
        (durationRange === "short" && trip.duration <= 3) ||
        (durationRange === "medium" && trip.duration > 3 && trip.duration <= 7) ||
        (durationRange === "long" && trip.duration > 7);

      const matchesSeason = season === "all" || trip.bestSeason?.toLowerCase() === season;

      const matchesPremium = isPremium === "all" || trip.isPremium === (isPremium === "true");

      return (
        matchesQuery &&
        matchesCountry &&
        matchesTag &&
        matchesBudget &&
        matchesDuration &&
        matchesSeason &&
        matchesPremium
      );
    });

    setFilteredFavorites(result);
  }, [favorites, filters]);

  // reset complet
  const handleReset = () => {
    resetFilters();
    setFilteredFavorites(favorites);
  };

  const hasAny = filteredFavorites.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 fill-current" />
              </div>
              <Title level={2}>Mes favoris</Title>
            </div>
            <Paragraph size="base" className="max-w-2xl">
              Retrouvez ici tous vos roadtrips préférés sauvegardés pour vos prochaines aventures
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
              {filteredFavorites.length} {filteredFavorites.length > 1 ? "favoris trouvés" : "favori trouvé"}
            </Paragraph>
          )}
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex justify-center py-16 sm:py-20">
            <Loading text="Chargement de vos favoris..." />
          </div>
        ) : !hasAny ? (
          <div className="rounded-xl sm:rounded-2xl p-8 sm:p-12 lg:p-16 text-center border border-gray-200 bg-white shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-50 mb-6 sm:mb-8 shadow-inner">
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
            </div>

            <Title level={3} className="mb-4">
              {favorites.length === 0 ? "Aucun favori enregistré" : "Aucun favori trouvé"}
            </Title>

            <Paragraph size="sm" align="center" className="max-w-md mx-auto mb-6 sm:mb-8 px-4 sm:px-0">
              {favorites.length === 0
                ? "Commencez à explorer nos roadtrips et ajoutez vos préférés en cliquant sur le cœur."
                : "Essayez d'élargir vos filtres ou explorez de nouveaux roadtrips."}
            </Paragraph>

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              {favorites.length > 0 && <Button onClick={handleReset}>Réinitialiser les filtres</Button>}
              <Button variant="outline" onClick={() => router.push("/explorer")}>
                Explorer tous les roadtrips
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {filteredFavorites.map((trip) => (
              <div key={trip._id} className="h-full">
                <RoadTripCard
                  id={trip._id}
                  title={trip.title}
                  image={trip.image}
                  country={trip.country}
                  region={trip.region}
                  duration={trip.duration}
                  budget={trip.budget?.amount || 0}
                  tags={trip.tags}
                  isPremium={trip.isPremium}
                  isFavorite={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
