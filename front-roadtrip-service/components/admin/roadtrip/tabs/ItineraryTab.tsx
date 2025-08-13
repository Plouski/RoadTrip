"use client";

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ItineraryStep, Roadtrip } from "@/hooks/useRoadtripForm";

type Props = {
  roadtrip: Roadtrip;
  itineraryInputs: ItineraryStep[];
  updateItineraryStep: (index: number, field: keyof ItineraryStep, value: any) => void;
  completionStats: { completed: number; total: number; percentage: number };
  onPrev: () => void;
  onNext: () => void;
};

export default function ItineraryTab({
  roadtrip, itineraryInputs, updateItineraryStep, completionStats, onPrev, onNext,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Itinéraire jour par jour</CardTitle>
        <CardDescription>
          Détaillez l'itinéraire pour {roadtrip.duration} jours
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progression */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Étapes de l'itinéraire</h3>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">{completionStats.completed}</span>
              {" / "}
              <span>{completionStats.total}</span> jours complétés
              <span className="text-xs"> ({completionStats.percentage}%)</span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionStats.percentage}%` }}
            />
          </div>
        </div>

        {/* Étapes */}
        <div className="space-y-4">
          {itineraryInputs.map((step, index) => (
            <div
              key={index}
              className={`border rounded-md p-4 space-y-4 transition-colors ${
                step.title.trim() && step.description.trim()
                  ? "border-green-200 bg-green-50/50"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center">
                  <span className="flex items-center justify-center bg-primary text-primary-foreground w-8 h-8 rounded-full mr-3">
                    {step.day}
                  </span>
                  Jour {step.day}
                </h3>
                {step.title.trim() && step.description.trim() && (
                  <div className="text-green-600 text-sm font-medium">✓ Complété</div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor={`step-title-${index}`}>Titre <span className="text-red-500">*</span></Label>
                <Input
                  id={`step-title-${index}`}
                  placeholder="Ex: Randonnée dans les gorges"
                  value={step.title}
                  onChange={(e) => updateItineraryStep(index, "title", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`step-description-${index}`}>Description <span className="text-red-500">*</span></Label>
                <Textarea
                  id={`step-description-${index}`}
                  rows={3}
                  placeholder="Décrivez l'étape en détail..."
                  value={step.description}
                  onChange={(e) => updateItineraryStep(index, "description", e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`overnight-${index}`}
                  checked={step.overnight}
                  onCheckedChange={(checked) => updateItineraryStep(index, "overnight", Boolean(checked))}
                />
                <Label htmlFor={`overnight-${index}`}>Nuit sur place</Label>
              </div>
            </div>
          ))}
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
