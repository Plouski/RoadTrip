"use client";

import { useEffect, useState } from "react";
import { RoadtripService } from "@/services/roadtrip-service";
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
      
      if (!Array.isArray(allTrips)) {
        console.error("Les données reçues ne sont pas un array:", allTrips);
        setRoadtrips([]);
        return;
      }

      let filtered = allTrips;
      let activeFiltersCount = 0;

      // Filtrage par recherche de texte
      if (searchQuery.trim()) {
        filtered = filtered.filter((trip: { title: string }) =>
          trip.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        activeFiltersCount++;
      }

      // Filtrage par pays
      if (selectedCountry !== "all") {
        filtered = filtered.filter(
          (trip: { country: string }) => trip.country === selectedCountry
        );
        activeFiltersCount++;
      }

      // Filtrage par durée
      if (durationRange !== "all") {
        filtered = filtered.filter((trip: { duration: number }) => {
          if (durationRange === "short") return trip.duration <= 3;
          if (durationRange === "medium")
            return trip.duration > 3 && trip.duration <= 7;
          if (durationRange === "long") return trip.duration > 7;
          return true;
        });
        activeFiltersCount++;
      }

      // Filtrage par budget
      if (budgetRange !== "all") {
        filtered = filtered.filter((trip: { budget: { amount: number } }) => {
          const amount = trip.budget?.amount || 0;
          if (budgetRange === "low") return amount <= 500;
          if (budgetRange === "medium") return amount > 500 && amount <= 1000;
          if (budgetRange === "high") return amount > 1000;
          return true;
        });
        activeFiltersCount++;
      }

      // Filtrage par saison
      if (season !== "all") {
        filtered = filtered.filter(
          (trip: { bestSeason: string }) =>
            trip.bestSeason?.toLowerCase() === season
        );
        activeFiltersCount++;
      }

      // Filtrage par tag
      if (selectedTag !== "all") {
        filtered = filtered.filter((trip: { tags: string | string[] }) =>
          Array.isArray(trip.tags) ? trip.tags.includes(selectedTag) : false
        );
        activeFiltersCount++;
      }

      // Filtrage par statut premium
      if (isPremium !== "all") {
        filtered = filtered.filter(
          (trip: { isPremium: boolean }) =>
            trip.isPremium === (isPremium === "true")
        );
        activeFiltersCount++;
      }

      setActiveFilters(activeFiltersCount);
      setRoadtrips(filtered);
      
      console.log(`✅ ${filtered.length} roadtrips chargés avec ${activeFiltersCount} filtres actifs`);
      
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

  const safeRoadtrips = Array.isArray(roadtrips) ? roadtrips : [];

  const allCountries = Array.from(
    new Set(safeRoadtrips.map((trip) => trip.country).filter(Boolean))
  );
  const allTags = Array.from(
    new Set(
      safeRoadtrips
        .flatMap((trip) => Array.isArray(trip.tags) ? trip.tags : [])
        .filter(Boolean)
    )
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        {/* Section d'en-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="flex-1">
            <Title level={2} className="mb-3 sm:mb-4">
              Explorer les Roadtrips
            </Title>
            <Paragraph size="base" className="max-w-2xl">
              Découvrez nos itinéraires soigneusement sélectionnés à travers le
              monde
            </Paragraph>
          </div>
          
          {/* Bouton de réinitialisation des filtres */}
          {activeFilters > 0 && (
            <div className="flex-shrink-0">
              <Button 
                onClick={resetFilters} 
                variant="outline"
                className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2"
              >
                <RefreshCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Réinitialiser les filtres</span>
                <span className="sm:hidden">Réinitialiser</span>
              </Button>
            </div>
          )}
        </div>

        {/* Filtres de recherche */}
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

        {/* Résumé des résultats */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div className="text-gray-600">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loading text="Chargement des itinéraires..." />
              </div>
            ) : (
              <Paragraph size="sm">
                {safeRoadtrips.length}{" "}
                {safeRoadtrips.length > 1 ? "itinéraires trouvés" : "itinéraire trouvé"}
              </Paragraph>
            )}
          </div>
          
          {safeRoadtrips.length > 0 && !loading && (
            <div className="flex items-center text-sm text-gray-500">
              <Map className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>
                {Array.from(new Set(safeRoadtrips.map((trip) => trip.country).filter(Boolean))).length}{" "}
                pays disponibles
              </span>
            </div>
          )}
        </div>

        {/* Contenu principal */}
        {loading ? (
          <div className="flex justify-center py-16 sm:py-20">
            <Loading text="Chargement de vos aventures..." />
          </div>
        ) : safeRoadtrips.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl p-8 sm:p-12 lg:p-16 text-center border border-gray-200 bg-white shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 mb-6 sm:mb-8 shadow-inner">
              <Filter className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            </div>
            
            <Title level={3} className="mb-4">
              Aucun roadtrip ne correspond à vos critères
            </Title>
            
            <Paragraph 
              size="sm" 
              align="center"
              className="max-w-md mx-auto mb-6 sm:mb-8 px-4 sm:px-0"
            >
              Essayez d'ajuster vos filtres pour découvrir nos itinéraires
              incroyables ou explorez-les tous.
            </Paragraph>
            
            <Button 
              variant="outline" 
              onClick={resetFilters}
              className="px-6 py-2.5 sm:py-3"
            >
              Afficher tous les roadtrips
            </Button>
          </div>
        ) : (
          <>
            {/* Grille des roadtrips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
              {safeRoadtrips.map((trip, index) => (
                <div key={trip._id || index} className="h-full">
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
                  />
                </div>
              ))}
            </div>

            {/* CTA en bas pour les grandes listes de résultats */}
            {safeRoadtrips.length > 9 && (
              <div className="flex justify-center">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-lg text-center">
                  <Paragraph size="base" className="mb-4 sm:mb-6">
                    Vous avez découvert {safeRoadtrips.length} destinations
                    incroyables. Trouvez celle qui vous fera rêver !
                  </Paragraph>
                  
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                    className="border-primary text-primary hover:bg-primary/5 px-6 py-2.5"
                  >
                    Revenir aux filtres
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}