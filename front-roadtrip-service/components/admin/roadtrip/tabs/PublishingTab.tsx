"use client";

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2, Save } from "lucide-react";
import { Roadtrip } from "@/hooks/useRoadtripForm";

type Props = {
  roadtrip: Roadtrip;
  updateRoadtripField: <K extends keyof Roadtrip>(field: K, value: Roadtrip[K]) => void;
  completionStats: { completed: number; total: number; percentage: number };
  isSaving: boolean;
  onPrev: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
};

export default function PublishingTab({
  roadtrip, updateRoadtripField, completionStats, isSaving, onPrev, onSaveDraft, onPublish,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Résumé et publication</CardTitle>
        <CardDescription>Vérifiez les informations puis publiez</CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        <div className="bg-muted/50 border rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{roadtrip.title || "Titre du roadtrip"}</h3>
            <Badge variant={roadtrip.isPremium ? "default" : "secondary"}>
              {roadtrip.isPremium ? "Premium" : "Gratuit"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="aspect-video rounded-md overflow-hidden bg-background border">
              <img src={roadtrip.image} alt="Aperçu" className="w-full h-full object-cover" />
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-medium">Destination :</span>
                  <p className="text-muted-foreground">
                    {roadtrip.country}{roadtrip.region ? `, ${roadtrip.region}` : ""}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Durée :</span>
                  <p className="text-muted-foreground">{roadtrip.duration} jours</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-medium">Budget :</span>
                  <p className="text-muted-foreground">{roadtrip.budget} €</p>
                </div>
                <div>
                  <span className="font-medium">Saison :</span>
                  <p className="text-muted-foreground">{roadtrip.bestSeason}</p>
                </div>
              </div>

              <div>
                <span className="font-medium">Tags :</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {roadtrip.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{roadtrip.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{roadtrip.pointsOfInterest.length}</div>
              <div className="text-sm text-muted-foreground">Points d'intérêt</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{completionStats.completed}</div>
              <div className="text-sm text-muted-foreground">Étapes d'itinéraire</div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              id="isPremium"
              checked={roadtrip.isPremium}
              onCheckedChange={(checked) => updateRoadtripField("isPremium", Boolean(checked))}
            />
            <div>
              <Label htmlFor="isPremium" className="text-sm font-medium">Contenu Premium</Label>
              <p className="text-xs text-muted-foreground">Réservé aux utilisateurs avec abonnement</p>
            </div>
          </div>
          {roadtrip.isPremium && (
            <div className="text-sm text-amber-700 bg-amber-100 px-3 py-2 rounded-md border border-amber-200">
              🔒 Accès Premium requis
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Précédent
        </Button>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={onSaveDraft} disabled={isSaving} className="min-w-[200px]">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer comme brouillon
          </Button>
          <Button onClick={onPublish} disabled={isSaving} className="min-w-[150px]">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publier maintenant
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
