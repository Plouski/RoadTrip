"use client";

import { useEffect, useState } from "react";
import { RoadtripService } from "@/services/roadtrip-service";
import { FavoriteService } from "@/services/favorites-service";
import RoadTripCard from "@/components/road-trip-card";
import { Filter, Map, RefreshCcw } from "lucide-react";
import SearchFilters from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";

export default function ExplorerPage() {
  const [roadtrips, setRoadtrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [durationRange, setDurationRange] = useState("all");
  const [budgetRange, setBudgetRange] = useState("all");
  const [season, setSeason] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [isPremium, setIsPremium] = useState("all");
  const [activeFilters, setActiveFilters] = useState(0);

  const fetchRoadtrips = async () => {
    setLoading(true);
    try {
      const response = await RoadtripService.getPublicRoadtrips();
      const allTrips = response?.trips || [];

      let favoriteTrips: any[] = [];
      try {
        const favData = await FavoriteService.getFavorites();
        favoriteTrips = favData?.roadtrips || [];
      } catch (err) {
        favoriteTrips = [];
      }

      const favoriteIds = new Set(favoriteTrips.map((trip) => trip._id));
      const enrichedTrips = allTrips.map((trip: any) => ({
        ...trip,
        isFavorite: favoriteIds.has(trip._id),
      }));

      let filtered = enrichedTrips;
      let activeFiltersCount = 0;

      if (searchQuery.trim()) {
        filtered = filtered.filter((trip) =>
          trip.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        activeFiltersCount++;
      }

      if (selectedCountry !== "all") {
        filtered = filtered.filter((trip) => trip.country === selectedCountry);
        activeFiltersCount++;
      }

      if (durationRange !== "all") {
        filtered = filtered.filter((trip) => {
          if (durationRange === "short") return trip.duration <= 3;
          if (durationRange === "medium") return trip.duration > 3 && trip.duration <= 7;
          if (durationRange === "long") return trip.duration > 7;
          return true;
        });
        activeFiltersCount++;
      }

      if (budgetRange !== "all") {
        filtered = filtered.filter((trip) => {
          const amount = trip.budget?.amount || 0;
          if (budgetRange === "low") return amount <= 500;
          if (budgetRange === "medium") return amount > 500 && amount <= 1000;
          if (budgetRange === "high") return amount > 1000;
          return true;
        });
        activeFiltersCount++;
      }

      if (season !== "all") {
        filtered = filtered.filter((trip) => trip.bestSeason?.toLowerCase() === season);
        activeFiltersCount++;
      }

      if (selectedTag !== "all") {
        filtered = filtered.filter((trip) =>
          Array.isArray(trip.tags) ? trip.tags.includes(selectedTag) : false
        );
        activeFiltersCount++;
      }

      if (isPremium !== "all") {
        filtered = filtered.filter((trip) =>
          trip.isPremium === (isPremium === "true")
        );
        activeFiltersCount++;
      }

      setActiveFilters(activeFiltersCount);
      setRoadtrips(filtered);
    } catch (error) {
      console.error("Erreur lors du chargement des roadtrips :", error);
      setRoadtrips([]);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCountry("all");
    setDurationRange("all");
    setBudgetRange("all");
    setSeason("all");
    setSelectedTag("all");
    setIsPremium("all");
    fetchRoadtrips();
  };

  useEffect(() => {
    fetchRoadtrips();
  }, []);

  const allCountries = Array.from(new Set(roadtrips.map((trip) => trip.country).filter(Boolean)));
  const allTags = Array.from(
    new Set(roadtrips.flatMap((trip) => Array.isArray(trip.tags) ? trip.tags : []).filter(Boolean))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="flex-1">
            <Title level={2} className="mb-3 sm:mb-4">Explorer les Roadtrips</Title>
            <Paragraph size="base" className="max-w-2xl">
              Découvrez nos itinéraires soigneusement sélectionnés à travers le monde
            </Paragraph>
          </div>

          {activeFilters > 0 && (
            <div className="flex-shrink-0">
              <Button onClick={resetFilters} variant="outline" className="w-full lg:w-auto flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" /> Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>

        <div className="mb-8 sm:mb-12">
          <SearchFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            durationRange={durationRange}
            setDurationRange={setDurationRange}
            budgetRange={budgetRange}
            setBudgetRange={setBudgetRange}
            season={season}
            setSeason={setSeason}
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            allCountries={allCountries}
            allTags={allTags}
            onSearch={fetchRoadtrips}
          />
        </div>

        <div className="mb-6 sm:mb-8">
          {!loading && (
            <Paragraph size="sm">
              {roadtrips.length} {roadtrips.length > 1 ? "itinéraires trouvés" : "itinéraire trouvé"}
            </Paragraph>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 sm:py-20">
            <Loading text="Chargement de vos aventures..." />
          </div>
        ) : roadtrips.length === 0 ? (
          <div className="rounded-xl p-8 text-center border border-gray-200 bg-white shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
              <Filter className="h-6 w-6 text-gray-400" />
            </div>
            <Title level={3} className="mb-4">Aucun roadtrip ne correspond à vos critères</Title>
            <Paragraph size="sm" className="max-w-md mx-auto mb-6">
              Essayez d'ajuster vos filtres pour découvrir nos itinéraires incroyables ou explorez-les tous.
            </Paragraph>
            <Button variant="outline" onClick={resetFilters}>Afficher tous les roadtrips</Button>
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
