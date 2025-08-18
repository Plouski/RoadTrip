"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AdminService } from "@/services/admin-service";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { useRef } from "react";

export type TabKey =
  | "basic-info"
  | "details"
  | "points-of-interest"
  | "itinerary"
  | "publishing";

export interface PointOfInterest {
  name: string;
  description: string;
  image: string;
}

export interface ItineraryStep {
  day: number;
  title: string;
  description: string;
  overnight: boolean;
}

export interface Roadtrip {
  title: string;
  image: string;
  country: string;
  region: string;
  duration: number;
  budget: number;
  tags: string[];
  description: string;
  isPremium: boolean;
  bestSeason: string;
  pointsOfInterest: PointOfInterest[];
  itinerary: ItineraryStep[];
  isPublished: boolean;
}

export const TABS_ORDER: readonly TabKey[] = [
  "basic-info",
  "details",
  "points-of-interest",
  "itinerary",
  "publishing",
] as const;

export const INITIAL_ROADTRIP_STATE: Roadtrip = {
  title: "",
  image: "/placeholder.svg?height=600&width=800",
  country: "",
  region: "",
  duration: 7,
  budget: 1000,
  tags: [],
  description: "",
  isPremium: false,
  bestSeason: "",
  pointsOfInterest: [],
  itinerary: [],
  isPublished: false,
};

export const INITIAL_POI_STATE: PointOfInterest = {
  name: "",
  description: "",
  image: "/placeholder.svg?height=300&width=400",
};

export function useRoadtripForm(options?: {
  mode?: "create" | "edit";
  id?: string;
  initialData?: Roadtrip | null;
  initialItinerary?: ItineraryStep[] | null;
}) {
  const router = useRouter();
  const mode = options?.mode ?? "create";
  const editId = options?.id;

  // UI / accès
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("basic-info");
  const [roadtrip, setRoadtrip] = useState<Roadtrip>(INITIAL_ROADTRIP_STATE);
  const [itineraryInputs, setItineraryInputs] = useState<ItineraryStep[]>([]);

  // Alertes
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | null>(null);

  // Données
  const [selectedTag, setSelectedTag] = useState("");
  const [tempPointOfInterest, setTempPointOfInterest] =
    useState<PointOfInterest>(INITIAL_POI_STATE);

  const hydratedRef = useRef(false);

  // Utils
  const showAlert = useCallback(
    (message: string, type: "success" | "error") => {
      setAlertMessage("");
      setAlertType(null);
      setTimeout(() => {
        setAlertMessage(message);
        setAlertType(type);
      }, 10);
    },
    []
  );

  const updateRoadtripField = useCallback(
    <K extends keyof Roadtrip>(field: K, value: Roadtrip[K]) => {
      setRoadtrip((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const updateItineraryStep = useCallback(
    (index: number, field: keyof ItineraryStep, value: any) => {
      setItineraryInputs((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  useEffect(() => {
    if (options?.initialData) {
      setRoadtrip((prev) => ({ ...prev, ...options.initialData! }));
    }
    if (options?.initialItinerary && options.initialItinerary.length > 0) {
      setItineraryInputs(options.initialItinerary);
    }
    // Marque l’hydratation comme faite pour ne pas écraser les données
    hydratedRef.current = true;
  }, [options?.initialData, options?.initialItinerary]);

  // génération auto quand la durée change (conserve l'existant)
  useEffect(() => {
    // Ne régénère pas tant que l’hydratation n’est pas faite (en mode edit)
    if (!hydratedRef.current) return;

    const generate = (d: number): ItineraryStep[] =>
      Array.from({ length: d }, (_, i) => ({
        day: i + 1,
        title: "",
        description: "",
        overnight: true,
      }));

    // Utilise la forme fonctionnelle pour éviter les closures périmées
    setItineraryInputs((curr) => {
      const base = generate(roadtrip.duration);
      return base.map((s) => curr.find((c) => c.day === s.day) || s);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadtrip.duration]);

  // Tags
  const handleTagToggle = useCallback((tag: string) => {
    setRoadtrip((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }, []);

  // POI
  const addPointOfInterest = useCallback(() => {
    if (
      !tempPointOfInterest.name.trim() ||
      !tempPointOfInterest.description.trim()
    ) {
      showAlert("Veuillez remplir tous les champs du point d'intérêt", "error");
      return;
    }
    setRoadtrip((prev) => ({
      ...prev,
      pointsOfInterest: [...prev.pointsOfInterest, { ...tempPointOfInterest }],
    }));
    setTempPointOfInterest(INITIAL_POI_STATE);
  }, [tempPointOfInterest, showAlert]);

  const removePointOfInterest = useCallback((index: number) => {
    setRoadtrip((prev) => ({
      ...prev,
      pointsOfInterest: prev.pointsOfInterest.filter((_, i) => i !== index),
    }));
  }, []);

  // Upload d’images (main / poi)
  const handleImageUpload = useCallback(
    async (type: "main" | "poi", index?: number) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const imageUrl = await uploadImageToCloudinary(file);
          if (type === "main") {
            updateRoadtripField("image", imageUrl);
          } else {
            if (index === undefined) {
              setTempPointOfInterest((prev) => ({ ...prev, image: imageUrl }));
            } else {
              setRoadtrip((prev) => {
                const updatedPOIs = [...prev.pointsOfInterest];
                updatedPOIs[index].image = imageUrl;
                return { ...prev, pointsOfInterest: updatedPOIs };
              });
            }
          }
        } catch (e) {
          console.error(e);
          showAlert("Erreur lors de l'upload de l'image", "error");
        }
      };
      input.click();
    },
    [updateRoadtripField, showAlert]
  );

  // Validation par onglet
  const validateCurrentTab = useCallback((): boolean => {
    switch (activeTab) {
      case "basic-info":
        if (
          !roadtrip.title.trim() ||
          !roadtrip.country ||
          !roadtrip.description.trim()
        ) {
          showAlert(
            "Veuillez remplir tous les champs obligatoires (titre, pays, description)",
            "error"
          );
          return false;
        }
        break;
      case "details":
        if (!roadtrip.bestSeason || roadtrip.tags.length === 0) {
          showAlert(
            "Veuillez sélectionner au moins une saison et un tag",
            "error"
          );
          return false;
        }
        break;
      case "points-of-interest":
        if (roadtrip.pointsOfInterest.length === 0) {
          showAlert("Veuillez ajouter au moins un point d'intérêt", "error");
          return false;
        }
        break;
      case "itinerary":
        if (
          itineraryInputs.find((s) => !s.title.trim() || !s.description.trim())
        ) {
          showAlert("Complétez toutes les étapes de l'itinéraire", "error");
          return false;
        }
        break;
    }
    return true;
  }, [activeTab, roadtrip, itineraryInputs, showAlert]);

  // Navigation tabs
  const navigateToTab = useCallback(
    (direction: "next" | "prev") => {
      const currentIndex = TABS_ORDER.indexOf(activeTab);
      const nextIndex =
        direction === "next" ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= 0 && nextIndex < TABS_ORDER.length) {
        setActiveTab(TABS_ORDER[nextIndex]);
      }
    },
    [activeTab]
  );

  const handleNextTab = useCallback(() => {
    if (validateCurrentTab()) navigateToTab("next");
  }, [validateCurrentTab, navigateToTab]);

  const isTabUnlocked = useCallback(
    (tab: TabKey): boolean => {
      switch (tab) {
        case "basic-info":
          return true;
        case "details":
          return !!(
            roadtrip.title.trim() &&
            roadtrip.country &&
            roadtrip.description.trim()
          );
        case "points-of-interest":
          return !!(roadtrip.bestSeason && roadtrip.tags.length > 0);
        case "itinerary":
          return roadtrip.pointsOfInterest.length > 0;
        case "publishing":
          return (
            itineraryInputs.length > 0 &&
            itineraryInputs.every((s) => s.title.trim() && s.description.trim())
          );
        default:
          return false;
      }
    },
    [roadtrip, itineraryInputs]
  );

  // Validation finale
  const validateForSave = useCallback((): boolean => {
    const requiredOk =
      !!roadtrip.title.trim() &&
      !!roadtrip.country &&
      !!roadtrip.description.trim() &&
      !!roadtrip.bestSeason &&
      roadtrip.tags.length > 0 &&
      roadtrip.pointsOfInterest.length > 0 &&
      itineraryInputs.every((s) => s.title.trim() && s.description.trim());

    return requiredOk;
  }, [roadtrip, itineraryInputs]);

  // Sauvegarde
  const handleSaveRoadtrip = useCallback(
    async (publish = false) => {
      if (!validateForSave()) {
        showAlert(
          "Veuillez remplir tous les champs obligatoires dans chaque section",
          "error"
        );
        return;
      }
      setIsSaving(true);
      try {
        const payload = {
          ...roadtrip,
          isPublished: publish,
          itinerary: itineraryInputs.map((s) => ({
            day: Number(s.day) || 1,
            title: s.title?.trim() || "",
            description: s.description?.trim() || "",
            overnight: !!s.overnight,
          })),
          duration: Number(roadtrip.duration) || 0,
        };

        if (mode === "edit" && editId) {
          await AdminService.updateRoadtrip(editId, payload);
          showAlert(
            `Roadtrip ${publish ? "publié" : "sauvegardé"} avec succès !`,
            "success"
          );
          setTimeout(() => router.push(`/roadtrip/${editId}`), 1200);
        } else {
          const resp = await AdminService.createRoadtrip(payload);
          let roadtripId: string | null =
            resp?.trip?._id ||
            resp?.trip?.id ||
            resp?.data?._id ||
            resp?.data?.id ||
            resp?._id ||
            resp?.id ||
            null;
          const isMongoId =
            !!roadtripId && /^[0-9a-fA-F]{24}$/.test(roadtripId);
          showAlert(
            `Roadtrip ${publish ? "publié" : "sauvegardé"} avec succès !`,
            "success"
          );
          setTimeout(() => {
            if (isMongoId) router.push(`/roadtrip/${roadtripId}`);
            else router.push("/admin?tab=roadtrips");
          }, 1200);
        }
      } catch (e) {
        console.error(e);
        showAlert("Erreur lors de la sauvegarde du roadtrip", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [
      mode,
      editId,
      roadtrip,
      itineraryInputs,
      validateForSave,
      showAlert,
      router,
    ]
  );

  // Stats complétion
  const completionStats = useMemo(() => {
    const completed = itineraryInputs.filter(
      (s) => s.title.trim() && s.description.trim()
    ).length;
    const total = roadtrip.duration;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [itineraryInputs, roadtrip.duration]);

  return {
    // ui
    mode,
    editId,
    isLoading,
    isAdmin,
    isSaving,
    activeTab,
    setActiveTab,
    alertMessage,
    alertType,
    // data
    roadtrip,
    itineraryInputs,
    selectedTag,
    tempPointOfInterest,
    // setters
    setSelectedTag,
    setTempPointOfInterest,
    // helpers
    showAlert,
    updateRoadtripField,
    updateItineraryStep,
    handleTagToggle,
    addPointOfInterest,
    removePointOfInterest,
    handleImageUpload,
    validateCurrentTab,
    navigateToTab,
    handleNextTab,
    isTabUnlocked,
    handleSaveRoadtrip,
    completionStats,
  };
}
