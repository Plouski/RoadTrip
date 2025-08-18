"use client";

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { PointOfInterest, Roadtrip } from "@/hooks/useRoadtripForm";

type Props = {
  roadtrip: Roadtrip;
  tempPOI: PointOfInterest;
  setTempPOI: (updater: (prev: PointOfInterest) => PointOfInterest) => void | ((p: PointOfInterest) => void);
  addPointOfInterest: () => void;
  removePointOfInterest: (index: number) => void;
  handleImageUpload: (type: "main" | "poi", index?: number) => Promise<void>;
  onPrev: () => void;
  onNext: () => void;
};

export default function POITab({
  roadtrip, tempPOI, setTempPOI, addPointOfInterest, removePointOfInterest, handleImageUpload, onPrev, onNext,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Points d'intérêt</CardTitle>
        <CardDescription>Ajoutez les lieux incontournables</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {roadtrip.pointsOfInterest.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Points d'intérêt ajoutés ({roadtrip.pointsOfInterest.length})</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {roadtrip.pointsOfInterest.map((poi, index) => (
                <div key={index} className="border rounded-md p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{poi.name}</h4>
                    <Button variant="ghost" size="icon" onClick={() => removePointOfInterest(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{poi.description}</p>
                  <div className="aspect-video bg-muted rounded-md overflow-hidden">
                    <img src={poi.image} alt={poi.name} className="w-full h-full object-cover" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleImageUpload("poi", index)}>
                    <ImagePlus className="mr-2 h-3 w-3" />
                    Changer l'image
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire ajout */}
        <div className="border rounded-md p-4 space-y-4">
          <h3 className="text-lg font-medium">Ajouter un point d'intérêt</h3>

          <div className="space-y-1">
            <Label>Image</Label>
            <div className="aspect-video bg-muted rounded-md overflow-hidden">
              <img src={tempPOI.image} alt="Image du point d'intérêt" className="w-full h-full object-cover" />
            </div>
            <Button variant="outline" className="mt-2 w-full" onClick={() => handleImageUpload("poi")}>
              <ImagePlus className="mr-2 h-4 w-4" />
              Choisir une image
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="poi-name">Nom du lieu <span className="text-red-500">*</span></Label>
            <Input
              id="poi-name"
              placeholder="Ex: Chamonix-Mont-Blanc"
              value={tempPOI.name}
              onChange={(e) => setTempPOI((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="poi-description">Description <span className="text-red-500">*</span></Label>
            <Textarea
              id="poi-description"
              rows={3}
              placeholder="Décrivez ce lieu..."
              value={tempPOI.description}
              onChange={(e) => setTempPOI((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <Button className="w-full" onClick={addPointOfInterest}>
            Ajouter ce point d'intérêt
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Précédent
        </Button>
        <Button onClick={onNext}>
          Suivant
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
