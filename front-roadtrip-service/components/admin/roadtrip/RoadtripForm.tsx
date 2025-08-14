"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertMessage } from "@/components/ui/alert-message";
import { Button } from "@/components/ui/button";
import { useRoadtripForm, TabKey } from "@/hooks/useRoadtripForm";
import Loading from "@/components/ui/loading";

import BasicInfoTab from "./tabs/BasicInfoTab";
import DetailsTab from "./tabs/DetailsTab";
import POITab from "./tabs/POITab";
import ItineraryTab from "./tabs/ItineraryTab";
import PublishingTab from "./tabs/PublishingTab";

type Props = {
  mode?: "create" | "edit";
  id?: string;
  initialData?: any | null; // Roadtrip shape
  initialItinerary?: any[] | null; // ItineraryStep[]
};

export default function RoadtripForm({ mode = "create", id, initialData, initialItinerary }: Props) {
  const f = useRoadtripForm({ mode, id, initialData, initialItinerary });

  if (f.isLoading) return <Loading text="Vérification des droits..." />;
  if (!f.isAdmin) return null;

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            {mode === "edit" ? "Modifier le Roadtrip" : "Créer un nouveau Roadtrip"}
          </h1>
          <Button variant="outline" onClick={() => history.back()}>Annuler</Button>
        </div>

        {f.alertMessage && <AlertMessage message={f.alertMessage} type={f.alertType} />}

        <Tabs value={f.activeTab} onValueChange={(v) => f.setActiveTab(v as TabKey)} className="space-y-6">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="basic-info">Infos de base</TabsTrigger>
            <TabsTrigger value="details" disabled={!f.isTabUnlocked("details")}>Détails</TabsTrigger>
            <TabsTrigger value="points-of-interest" disabled={!f.isTabUnlocked("points-of-interest")}>Points d'intérêt</TabsTrigger>
            <TabsTrigger value="itinerary" disabled={!f.isTabUnlocked("itinerary")}>Itinéraire</TabsTrigger>
            <TabsTrigger value="publishing" disabled={!f.isTabUnlocked("publishing")}>Publication</TabsTrigger>
          </TabsList>

          <TabsContent value="basic-info">
            <BasicInfoTab
              roadtrip={f.roadtrip}
              updateRoadtripField={f.updateRoadtripField}
              handleImageUpload={f.handleImageUpload}
              onNext={f.handleNextTab}
            />
          </TabsContent>

          <TabsContent value="details">
            <DetailsTab
              roadtrip={f.roadtrip}
              updateRoadtripField={f.updateRoadtripField}
              selectedTag={f.selectedTag}
              setSelectedTag={f.setSelectedTag}
              handleTagToggle={f.handleTagToggle}
              onPrev={() => f.navigateToTab("prev")}
              onNext={f.handleNextTab}
            />
          </TabsContent>

          <TabsContent value="points-of-interest">
            <POITab
              roadtrip={f.roadtrip}
              tempPOI={f.tempPointOfInterest}
              setTempPOI={f.setTempPointOfInterest}
              addPointOfInterest={f.addPointOfInterest}
              removePointOfInterest={f.removePointOfInterest}
              handleImageUpload={f.handleImageUpload}
              onPrev={() => f.navigateToTab("prev")}
              onNext={f.handleNextTab}
            />
          </TabsContent>

          <TabsContent value="itinerary">
            <ItineraryTab
              roadtrip={f.roadtrip}
              itineraryInputs={f.itineraryInputs}
              updateItineraryStep={f.updateItineraryStep}
              completionStats={f.completionStats}
              onPrev={() => f.navigateToTab("prev")}
              onNext={f.handleNextTab}
            />
          </TabsContent>

          <TabsContent value="publishing">
            <PublishingTab
              roadtrip={f.roadtrip}
              updateRoadtripField={f.updateRoadtripField}
              completionStats={f.completionStats}
              isSaving={f.isSaving}
              onPrev={() => f.navigateToTab("prev")}
              onSaveDraft={() => f.handleSaveRoadtrip(false)}
              onPublish={() => f.handleSaveRoadtrip(true)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
