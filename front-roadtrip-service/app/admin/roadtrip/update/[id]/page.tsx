"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoadtripService } from "@/services/roadtrip-service";
import { AlertMessage } from "@/components/ui/alert-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Minus,
  X,
  ImagePlus,
  ChevronRight,
  ChevronLeft,
  Save,
} from "lucide-react";
import { countries } from "@/lib/countries";
import { availableTags } from "@/lib/tags";
import { seasons } from "@/lib/seasons";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { AdminService } from "@/services/admin-service";
import Loading from "@/components/ui/loading";
import { NotFoundMessage } from "@/components/ui/not-found-message";

interface PointOfInterest {
  id?: string;
  name: string;
  description: string;
  image: string;
}

interface ItineraryStep {
  id?: string;
  day: number;
  title: string;
  description: string;
  overnight: boolean;
  drivingTime?: string;
  distance?: number;
  accommodation?: string;
  tips?: string;
}

interface Roadtrip {
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

const TABS_ORDER = [
  "basic-info",
  "details",
  "points-of-interest",
  "itinerary",
  "publishing",
] as const;

const INITIAL_ROADTRIP_STATE: Roadtrip = {
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

const INITIAL_POI_STATE: PointOfInterest = {
  name: "",
  description: "",
  image: "/placeholder.svg?height=300&width=400",
};

export default function EditRoadTripPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] =
    useState<(typeof TABS_ORDER)[number]>("basic-info");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | null>(null);
  const [roadtrip, setRoadtrip] = useState<Roadtrip>(INITIAL_ROADTRIP_STATE);
  const [itineraryInputs, setItineraryInputs] = useState<ItineraryStep[]>([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [tempPointOfInterest, setTempPointOfInterest] =
    useState<PointOfInterest>(INITIAL_POI_STATE);

  // Affiche un message d'alerte
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

  // Met à jour un champ du roadtrip
  const updateRoadtripField = useCallback(
    <K extends keyof Roadtrip>(field: K, value: Roadtrip[K]) => {
      setRoadtrip((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Met à jour les données d'une étape d'itinéraire
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

  // Génère un ID unique pour les nouveaux éléments
  const generateId = useCallback((prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }, []);

  //Vérification des droits d'administration et chargement des données
  useEffect(() => {
    const loadRoadtripData = async () => {
      try {
        // Vérification des droits d'administration
        const authenticated = await AdminService.isAdmin();
        setIsAdmin(authenticated);

        if (!authenticated) {
          router.push("/");
          return;
        }

        // Chargement des données du roadtrip
        if (!id) {
          setIsLoading(false);
          return;
        }

        try {
          const data = await RoadtripService.getRoadtripById(id);

          if (!data) {
            setIsLoading(false);
            return;
          }

          // Normalisation des données du roadtrip
          const normalizedRoadtrip: Roadtrip = {
            title: data.title || "",
            image: data.image || "/placeholder.svg?height=600&width=800",
            country: data.country || "",
            region: data.region || "",
            duration: data.duration || 7,
            budget:
              typeof data.budget === "object"
                ? data.budget.amount
                : data.budget || 1000,
            tags: data.tags || [],
            description: data.description || "",
            isPremium: data.isPremium || false,
            bestSeason: data.bestSeason || "",
            pointsOfInterest: (data.pointsOfInterest || []).map((poi: any) => ({
              id: poi.id || generateId("poi"),
              ...poi,
            })),
            itinerary: [],
            isPublished: data.isPublished || false,
          };

          setRoadtrip(normalizedRoadtrip);

          // Normalisation des étapes d'itinéraire
          if (data.itinerary && data.itinerary.length > 0) {
            const normalizedSteps: ItineraryStep[] = data.itinerary.map(
              (step: any) => ({
                id: step.id || generateId("step"),
                day: step.day,
                title: step.title || "",
                description: step.description || "",
                overnight: step.overnight !== undefined ? step.overnight : true,
                drivingTime: step.drivingTime || "",
                distance: step.distance || 0,
                accommodation: step.accommodation || "",
                tips: step.tips || "",
              })
            );
            setItineraryInputs(normalizedSteps);
          }
        } catch (error: any) {
          console.error("Erreur lors du chargement du roadtrip:", error);

          if (error.status === 404 || error.message?.includes("not found")) {
            showAlert("Erreur lors du chargement des données", "error");
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification des droits:", error);
        showAlert("Erreur lors de la vérification des droits", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadRoadtripData();
  }, [id, router, showAlert, generateId]);

  // Génération automatique des étapes d'itinéraire selon la durée
  useEffect(() => {
    if (isLoading) return;

    const generateSteps = (duration: number): ItineraryStep[] => {
      return Array.from({ length: duration }, (_, i) => ({
        id: generateId("step"),
        day: i + 1,
        title: "",
        description: "",
        overnight: true,
        drivingTime: "",
        distance: 0,
        accommodation: "",
        tips: "",
      }));
    };

    const newSteps = generateSteps(roadtrip.duration);

    const updatedSteps = newSteps.map((step) => {
      const existingStep = itineraryInputs.find(
        (item) => item.day === step.day
      );
      return existingStep || step;
    });

    setItineraryInputs(updatedSteps);
  }, [roadtrip.duration, isLoading, generateId]);

  // Gestion de la sélection/désélection des tags
  const handleTagToggle = useCallback((tag: string) => {
    setRoadtrip((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }, []);

  // Ajout d'un nouveau point d'intérêt
  const addPointOfInterest = useCallback(() => {
    if (
      !tempPointOfInterest.name.trim() ||
      !tempPointOfInterest.description.trim()
    ) {
      showAlert("Veuillez remplir tous les champs du point d'intérêt", "error");
      return;
    }

    const newPoi: PointOfInterest = {
      ...tempPointOfInterest,
      id: generateId("poi"),
    };

    setRoadtrip((prev) => ({
      ...prev,
      pointsOfInterest: [...prev.pointsOfInterest, newPoi],
    }));

    setTempPointOfInterest(INITIAL_POI_STATE);
  }, [tempPointOfInterest, showAlert, generateId]);

  // Suppression d'un point d'intérêt
  const removePointOfInterest = useCallback((index: number) => {
    setRoadtrip((prev) => ({
      ...prev,
      pointsOfInterest: prev.pointsOfInterest.filter((_, i) => i !== index),
    }));
  }, []);

  //  Gestion de l'upload d'images
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
          } else if (type === "poi") {
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
        } catch (error) {
          console.error("Erreur lors de l'upload :", error);
          showAlert("Erreur lors de l'upload de l'image", "error");
        }
      };

      input.click();
    },
    [updateRoadtripField, showAlert]
  );

  // Validation des données de l'onglet actuel
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
        const incompleteStep = itineraryInputs.find(
          (step) => !step.title.trim() || !step.description.trim()
        );
        if (incompleteStep) {
          showAlert(
            `Veuillez compléter les informations pour le jour ${incompleteStep.day}`,
            "error"
          );
          return false;
        }
        break;
    }

    return true;
  }, [activeTab, roadtrip, itineraryInputs, showAlert]);

  // Navigation entre les onglets
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

  // Passage à l'onglet suivant avec validation
  const handleNextTab = useCallback(() => {
    if (validateCurrentTab()) {
      navigateToTab("next");
    }
  }, [validateCurrentTab, navigateToTab]);

  // Vérification si un onglet est déverrouillé
  const isTabUnlocked = useCallback(
    (tab: string): boolean => {
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
            itineraryInputs.every(
              (step) => step.title.trim() && step.description.trim()
            )
          );
        default:
          return false;
      }
    },
    [roadtrip, itineraryInputs]
  );

  // Validation finale avant sauvegarde
  const validateForSave = useCallback((): boolean => {
    const requiredFields = [
      roadtrip.title.trim(),
      roadtrip.country,
      roadtrip.description.trim(),
      roadtrip.bestSeason,
    ];

    const validationChecks = [
      ...requiredFields,
      roadtrip.tags.length > 0,
      roadtrip.pointsOfInterest.length > 0,
      itineraryInputs.every(
        (step) => step.title.trim() && step.description.trim()
      ),
    ];

    return validationChecks.every(Boolean);
  }, [roadtrip, itineraryInputs]);

  // Sauvegarde du roadtrip
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
        const roadtripToSave: Roadtrip = {
          ...roadtrip,
          itinerary: itineraryInputs,
          isPublished: publish,
        };

        await AdminService.updateRoadtrip(id, roadtripToSave);

        showAlert(
          `Roadtrip ${publish ? "publié" : "sauvegardé"} avec succès !`,
          "success"
        );

        setTimeout(() => {
          router.push(`/roadtrip/${id}`);
        }, 1500);
      } catch (error) {
        console.error("Erreur lors de la sauvegarde :", error);
        showAlert("Erreur lors de la sauvegarde du roadtrip", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [roadtrip, itineraryInputs, validateForSave, showAlert, router, id]
  );

  // Statistiques de progression
  const completionStats = useMemo(() => {
    const completedSteps = itineraryInputs.filter(
      (step) => step.title.trim() && step.description.trim()
    ).length;

    return {
      completed: completedSteps,
      total: roadtrip.duration,
      percentage:
        roadtrip.duration > 0
          ? Math.round((completedSteps / roadtrip.duration) * 100)
          : 0,
    };
  }, [itineraryInputs, roadtrip.duration]);

  // Tags disponibles (non sélectionnés)
  const availableTagsFiltered = useMemo(
    () => availableTags.filter((tag) => !roadtrip.tags.includes(tag)),
    [roadtrip.tags]
  );

  // Écran de chargement
  if (isLoading) {
    return <Loading text="Chargement du roadtrip..." />;
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Modifier le Roadtrip</h1>
          <Button variant="outline" onClick={() => router.push("/admin")}>
            Annuler
          </Button>
        </div>

        {/* Message d'alerte */}
        {alertMessage && (
          <AlertMessage message={alertMessage} type={alertType} />
        )}

        {/* Interface à onglets */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* Navigation des onglets */}
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="basic-info">Infos de base</TabsTrigger>
            <TabsTrigger value="details" disabled={!isTabUnlocked("details")}>
              Détails
            </TabsTrigger>
            <TabsTrigger
              value="points-of-interest"
              disabled={!isTabUnlocked("points-of-interest")}
            >
              Points d'intérêt
            </TabsTrigger>
            <TabsTrigger
              value="itinerary"
              disabled={!isTabUnlocked("itinerary")}
            >
              Itinéraire
            </TabsTrigger>
            <TabsTrigger
              value="publishing"
              disabled={!isTabUnlocked("publishing")}
            >
              Publication
            </TabsTrigger>
          </TabsList>

          {/* ===== ONGLET INFORMATIONS DE BASE ===== */}
          <TabsContent value="basic-info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations essentielles</CardTitle>
                <CardDescription>
                  Modifiez les informations de base de votre roadtrip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image principale */}
                <div className="space-y-1">
                  <Label>Image principale</Label>
                  <div className="border rounded-md p-4">
                    <div className="aspect-video bg-muted rounded-md overflow-hidden">
                      <img
                        src={roadtrip.image}
                        alt="Image principale du roadtrip"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => handleImageUpload("main")}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Changer l'image
                    </Button>
                  </div>
                </div>

                {/* Titre */}
                <div className="space-y-1">
                  <Label htmlFor="title">
                    Titre du roadtrip <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Le titre du roadtrip (ex: Roadtrip dans les Alpes françaises)"
                    value={roadtrip.title}
                    onChange={(e) =>
                      updateRoadtripField("title", e.target.value)
                    }
                    required
                  />
                </div>

                {/* Pays */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="country">
                      Pays <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={roadtrip.country}
                      onValueChange={(value) =>
                        updateRoadtripField("country", value)
                      }
                    >
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Sélectionner un pays" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label htmlFor="description">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez votre roadtrip de manière attrayante..."
                    value={roadtrip.description}
                    onChange={(e) =>
                      updateRoadtripField("description", e.target.value)
                    }
                    rows={5}
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end">
                <Button onClick={handleNextTab}>
                  Suivant
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* ===== ONGLET DÉTAILS ===== */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Détails du voyage</CardTitle>
                <CardDescription>
                  Modifiez les détails pratiques de votre roadtrip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Durée */}
                  <div className="space-y-1">
                    <Label htmlFor="duration">
                      Durée (jours) <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          updateRoadtripField(
                            "duration",
                            Math.max(1, roadtrip.duration - 1)
                          )
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={roadtrip.duration}
                        onChange={(e) =>
                          updateRoadtripField(
                            "duration",
                            parseInt(e.target.value) || 1
                          )
                        }
                        required
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          updateRoadtripField("duration", roadtrip.duration + 1)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Meilleure saison */}
                  <div className="space-y-1">
                    <Label htmlFor="bestSeason">
                      Meilleure saison <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={roadtrip.bestSeason}
                      onValueChange={(value) =>
                        updateRoadtripField("bestSeason", value)
                      }
                    >
                      <SelectTrigger id="bestSeason">
                        <SelectValue placeholder="Sélectionner une saison" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map((season) => (
                          <SelectItem key={season} value={season}>
                            {season}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Budget */}
                <div className="space-y-1">
                  <Label htmlFor="budget">
                    Budget estimé (€) <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>500 €</span>
                      <span>5000 €</span>
                    </div>
                    <Slider
                      id="budget"
                      min={500}
                      max={5000}
                      step={100}
                      value={[roadtrip.budget]}
                      onValueChange={(value) =>
                        updateRoadtripField("budget", value[0])
                      }
                    />
                    <div className="text-center font-medium">
                      {roadtrip.budget} €
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <Label>
                    Tags <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez les tags qui correspondent à votre roadtrip (au
                    moins un)
                  </p>

                  {/* Tags sélectionnés */}
                  <div className="flex flex-wrap gap-2">
                    {roadtrip.tags.map((tag) => (
                      <Badge
                        key={tag}
                        className="cursor-pointer"
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag} <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>

                  {/* Sélecteur de nouveaux tags */}
                  <Select
                    value={selectedTag}
                    onValueChange={(value) => {
                      setSelectedTag(value);
                      if (value && !roadtrip.tags.includes(value)) {
                        handleTagToggle(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ajouter un tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTagsFiltered.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => navigateToTab("prev")}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>
                <Button onClick={handleNextTab}>
                  Suivant
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* ===== ONGLET POINTS D'INTÉRÊT ===== */}
          <TabsContent value="points-of-interest" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Points d'intérêt</CardTitle>
                <CardDescription>
                  Modifiez les lieux incontournables de votre roadtrip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Points d'intérêt existants */}
                {roadtrip.pointsOfInterest.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      Points d'intérêt ajoutés (
                      {roadtrip.pointsOfInterest.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {roadtrip.pointsOfInterest.map((poi, index) => (
                        <div
                          key={poi.id || index}
                          className="border rounded-md p-4 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{poi.name}</h4>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removePointOfInterest(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {poi.description}
                          </p>
                          <div className="aspect-video bg-muted rounded-md overflow-hidden">
                            <img
                              src={poi.image}
                              alt={poi.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleImageUpload("poi", index)}
                          >
                            <ImagePlus className="mr-2 h-3 w-3" />
                            Changer l'image
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formulaire d'ajout */}
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-lg font-medium">
                    Ajouter un point d'intérêt
                  </h3>

                  {/* Image */}
                  <div className="space-y-1">
                    <Label>Image</Label>
                    <div className="aspect-video bg-muted rounded-md overflow-hidden">
                      <img
                        src={tempPointOfInterest.image}
                        alt="Image du point d'intérêt"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => handleImageUpload("poi")}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Choisir une image
                    </Button>
                  </div>

                  {/* Nom du lieu */}
                  <div className="space-y-1">
                    <Label htmlFor="poi-name">
                      Nom du lieu <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="poi-name"
                      placeholder="Le nom de lieu (ex: Chamonix-Mont-Blanc)"
                      value={tempPointOfInterest.name}
                      onChange={(e) =>
                        setTempPointOfInterest((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <Label htmlFor="poi-description">
                      Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="poi-description"
                      placeholder="Décrivez ce lieu..."
                      value={tempPointOfInterest.description}
                      onChange={(e) =>
                        setTempPointOfInterest((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </div>

                  <Button className="w-full" onClick={addPointOfInterest}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter ce point d'intérêt
                  </Button>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => navigateToTab("prev")}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>
                <Button onClick={handleNextTab}>
                  Suivant
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* ===== ONGLET ITINÉRAIRE ===== */}
          <TabsContent value="itinerary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Itinéraire jour par jour</CardTitle>
                <CardDescription>
                  Modifiez l'itinéraire détaillé de votre roadtrip pour une
                  durée de {roadtrip.duration} jours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Indicateur de progression */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      Étapes de l'itinéraire
                    </h3>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-primary">
                        {completionStats.completed}
                      </span>
                      {" / "}
                      <span>{completionStats.total}</span>
                      {" jours complétés "}
                      <span className="text-xs">
                        ({completionStats.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionStats.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Étapes d'itinéraire */}
                <div className="space-y-4">
                  {itineraryInputs.map((step, index) => (
                    <div
                      key={step.id || index}
                      className={`border rounded-md p-4 space-y-4 transition-colors ${
                        step.title.trim() && step.description.trim()
                          ? "border-green-200 bg-green-50/50"
                          : "border-gray-200"
                      }`}
                    >
                      {/* En-tête du jour */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium flex items-center">
                          <span className="flex items-center justify-center bg-primary text-primary-foreground w-8 h-8 rounded-full mr-3">
                            {step.day}
                          </span>
                          Jour {step.day}
                        </h3>

                        {/* Indicateur de completion */}
                        {step.title.trim() && step.description.trim() && (
                          <div className="text-green-600 text-sm font-medium">
                            ✓ Complété
                          </div>
                        )}
                      </div>

                      {/* Titre de l'étape */}
                      <div className="space-y-1">
                        <Label htmlFor={`step-title-${index}`}>
                          Titre <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`step-title-${index}`}
                          placeholder="Ex: Randonnée dans les gorges"
                          value={step.title}
                          onChange={(e) =>
                            updateItineraryStep(index, "title", e.target.value)
                          }
                        />
                      </div>

                      {/* Description de l'étape */}
                      <div className="space-y-1">
                        <Label htmlFor={`step-description-${index}`}>
                          Description <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id={`step-description-${index}`}
                          placeholder="Décrivez l'étape en détail..."
                          value={step.description}
                          onChange={(e) =>
                            updateItineraryStep(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          rows={3}
                        />
                      </div>

                      {/* Option nuit sur place */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`overnight-${index}`}
                          checked={step.overnight}
                          onCheckedChange={(checked) =>
                            updateItineraryStep(index, "overnight", checked)
                          }
                        />
                        <Label htmlFor={`overnight-${index}`}>
                          Nuit sur place
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => navigateToTab("prev")}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>
                <Button onClick={handleNextTab}>
                  Suivant
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* ===== ONGLET PUBLICATION ===== */}
          <TabsContent value="publishing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Résumé et publication
                </CardTitle>
                <CardDescription>
                  Vérifiez les modifications et sauvegardez votre roadtrip
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8">
                {/* Résumé visuel du roadtrip */}
                <div className="bg-muted/50 border rounded-lg p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {roadtrip.title || "Titre du roadtrip"}
                    </h3>
                    <Badge
                      variant={roadtrip.isPremium ? "default" : "secondary"}
                    >
                      {roadtrip.isPremium ? "Premium" : "Gratuit"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Image de prévisualisation */}
                    <div className="aspect-video rounded-md overflow-hidden bg-background border">
                      <img
                        src={roadtrip.image}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Informations clés */}
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="font-medium text-foreground">
                            Destination :
                          </span>
                          <p className="text-muted-foreground">
                            {roadtrip.country}
                            {roadtrip.region ? `, ${roadtrip.region}` : ""}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Durée :
                          </span>
                          <p className="text-muted-foreground">
                            {roadtrip.duration} jours
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="font-medium text-foreground">
                            Budget :
                          </span>
                          <p className="text-muted-foreground">
                            {roadtrip.budget} €
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Saison :
                          </span>
                          <p className="text-muted-foreground">
                            {roadtrip.bestSeason}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="font-medium text-foreground">
                          Tags :
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {roadtrip.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {roadtrip.description}
                    </p>
                  </div>

                  {/* Statistiques */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {roadtrip.pointsOfInterest.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Points d'intérêt
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {completionStats.completed}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Étapes d'itinéraire
                      </div>
                    </div>
                  </div>
                </div>

                {/* Options de publication */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">
                    Options de publication
                  </h4>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="isPremium"
                        checked={roadtrip.isPremium}
                        onCheckedChange={(checked) =>
                          updateRoadtripField("isPremium", Boolean(checked))
                        }
                      />
                      <div>
                        <Label
                          htmlFor="isPremium"
                          className="text-sm font-medium"
                        >
                          Contenu Premium
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Réservé aux utilisateurs avec abonnement
                        </p>
                      </div>
                    </div>

                    {roadtrip.isPremium && (
                      <div className="text-sm text-amber-700 bg-amber-100 px-3 py-2 rounded-md border border-amber-200">
                        🔒 Accès Premium requis
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              {/* Actions finales */}
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
                <Button variant="outline" onClick={() => navigateToTab("prev")}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => handleSaveRoadtrip(false)}
                    disabled={isSaving}
                    className="min-w-[200px]"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Enregistrer les modifications
                  </Button>
                  <Button
                    onClick={() => handleSaveRoadtrip(true)}
                    disabled={isSaving}
                    className="min-w-[150px]"
                  >
                    {isSaving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Publier maintenant
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
