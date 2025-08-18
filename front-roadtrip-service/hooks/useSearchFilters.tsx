import { useMemo, useState } from "react";

export const INITIAL_FILTERS = {
  searchQuery: "",
  selectedCountry: "all",
  durationRange: "all",
  budgetRange: "all",
  season: "all",
  selectedTag: "all",
  isPremium: "all",
};

export type Filters = typeof INITIAL_FILTERS;

export function useSearchFilters(initial?: Partial<Filters>) {
  const [filters, setFilters] = useState<Filters>({
    ...INITIAL_FILTERS,
    ...(initial || {}),
  });

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  const activeCount = useMemo(() => {
    const f = filters;
    return (
      (f.searchQuery.trim() ? 1 : 0) +
      (f.selectedCountry !== "all" ? 1 : 0) +
      (f.durationRange !== "all" ? 1 : 0) +
      (f.budgetRange !== "all" ? 1 : 0) +
      (f.season !== "all" ? 1 : 0) +
      (f.selectedTag !== "all" ? 1 : 0) +
      (f.isPremium !== "all" ? 1 : 0)
    );
  }, [filters]);

  return { filters, updateFilter, resetFilters, activeCount };
}