"use client";
import { useParams } from "next/navigation";
import RoadtripFormWrapper from "@/components/admin/roadtrip/RoadtripFormWrapper";

export default function EditRoadTripPage() {
  const params = useParams();
  const id = params?.id as string;
  return <RoadtripFormWrapper mode="edit" id={id} />;
}