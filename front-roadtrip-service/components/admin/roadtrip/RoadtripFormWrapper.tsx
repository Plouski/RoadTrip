"use client";

import RoadtripForm from "@/components/admin/roadtrip/RoadtripForm";
import Loading from "@/components/ui/loading";
import { NotFoundMessage } from "@/components/ui/not-found-message";
import { useRoadtripData } from "@/hooks/useRoadtripData";

type Props = { mode: "create" | "edit"; id?: string };

export default function RoadtripFormWrapper({ mode, id }: Props) {
  const { data, initialItinerary, loading, notFound } = useRoadtripData(mode, id);

  if (loading) return <Loading text={mode === "edit" ? "Chargement du roadtrip..." : "Chargement..."} />;
  if (mode === "edit" && notFound) return <NotFoundMessage title="Roadtrip introuvable" />;

  return (
    <RoadtripForm
      mode={mode}
      id={id}
      initialData={data ?? undefined}
      initialItinerary={initialItinerary ?? undefined}
    />
  );
}