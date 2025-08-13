// components/search-bar.tsx
"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import type { Filters } from "@/hooks/useSearchFilters";

type Props = {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  onApply: () => void;               // déclenché sur "Rechercher"
  allCountries: string[];
  allTags: string[];
};

export default function SearchFilters({
  filters,
  updateFilter,
  resetFilters,
  onApply,
  allCountries,
  allTags,
}: Props) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // helpers budget <-> slider
  const budgetToSlider = (b: Filters["budgetRange"]) =>
    b === "low" ? 250 : b === "medium" ? 750 : b === "high" ? 1500 : b === "luxury" ? 3500 : 0;

  const sliderToBudget = (val: number): Filters["budgetRange"] =>
    val <= 500 ? "low" : val <= 1000 ? "medium" : val <= 2000 ? "high" : "luxury";

  return (
    <div className="mb-8 rounded-xl shadow-md p-5 border-t-4 border-t-red-600 bg-white">
      {/* ligne principale */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <label>Destination</label>
          <Input
            placeholder="Rechercher par titre..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter("searchQuery", e.target.value)}
          />
        </div>

        <div className="w-full md:w-[150px]">
          <label>Pays</label>
          <Select value={filters.selectedCountry} onValueChange={(v) => updateFilter("selectedCountry", v as Filters["selectedCountry"])}>
            <SelectTrigger><SelectValue placeholder="Pays" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {allCountries.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-[150px]">
          <label>Durée</label>
          <Select value={filters.durationRange} onValueChange={(v) => updateFilter("durationRange", v as Filters["durationRange"])}>
            <SelectTrigger><SelectValue placeholder="Durée" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="short">1-3 jours</SelectItem>
              <SelectItem value="medium">4-7 jours</SelectItem>
              <SelectItem value="long">8+ jours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button onClick={onApply}>
            <Search className="mr-2 h-4 w-4" />
            Rechercher
          </Button>
          <Button variant="outline" onClick={resetFilters}>Réinitialiser</Button>
        </div>
      </div>

      {/* toggle avancé */}
      <div className="mt-3">
        <button
          className="flex items-center text-gray-500 hover:text-red-600"
          onClick={() => setIsAdvancedOpen((v) => !v)}
        >
          Recherche avancée
          {isAdvancedOpen ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
        </button>
      </div>

      {/* filtres avancés */}
      {isAdvancedOpen && (
        <div className="mt-5 space-y-5 pt-5 border-t">
          {/* Budget badges + slider */}
          <div>
            <label className="font-semibold">Budget</label>
            <div className="mt-1 flex flex-wrap gap-2 mb-4">
              {[
                { label: "Budget léger", sub: "0-500€", value: "low" },
                { label: "Budget moyen", sub: "500-1000€", value: "medium" },
                { label: "Budget confort", sub: "1000-2000€", value: "high" },
                { label: "Budget luxe", sub: "2000-5000€", value: "luxury" },
              ].map(({ label, sub, value }) => (
                <Badge
                  key={value}
                  variant={filters.budgetRange === value ? "default" : "outline"}
                  className={`cursor-pointer flex flex-col items-center px-4 py-2 ${
                    filters.budgetRange === value ? "bg-red-600 hover:bg-red-700 text-white" : "hover:bg-gray-100"
                  }`}
                  onClick={() =>
                    updateFilter("budgetRange", filters.budgetRange === value ? "all" : (value as Filters["budgetRange"]))
                  }
                >
                  <span>{label}</span>
                  <span>{sub}</span>
                </Badge>
              ))}
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>0€</span><span>1000€</span><span>2000€</span><span>5000€</span>
              </div>
              <Slider
                min={0}
                max={5000}
                step={100}
                value={[budgetToSlider(filters.budgetRange)]}
                onValueChange={([v]) => updateFilter("budgetRange", sliderToBudget(v))}
              />
            </div>
          </div>

          {/* Saison */}
          <div>
            <label className="font-semibold">Saison idéale</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {["printemps", "été", "automne", "hiver"].map((s) => (
                <Badge
                  key={s}
                  variant={filters.season === s ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => updateFilter("season", filters.season === s ? "all" : (s as Filters["season"]))}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="font-semibold">Tags</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={filters.selectedTag === tag ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => updateFilter("selectedTag", filters.selectedTag === tag ? "all" : tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Type (premium) */}
          <div>
            <label className="font-semibold">Type de roadtrip</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {[
                { label: "Tous", value: "all" },
                { label: "Gratuit", value: "false" },
                { label: "Premium", value: "true" },
              ].map(({ label, value }) => (
                <Badge
                  key={value}
                  variant={filters.isPremium === value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => updateFilter("isPremium", value as Filters["isPremium"])}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}