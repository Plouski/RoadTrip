"use client";

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { Roadtrip } from "@/hooks/useRoadtripForm";
import { seasons } from "@/lib/seasons";
import { availableTags } from "@/lib/tags";

type Props = {
  roadtrip: Roadtrip;
  updateRoadtripField: <K extends keyof Roadtrip>(field: K, value: Roadtrip[K]) => void;
  selectedTag: string;
  setSelectedTag: (v: string) => void;
  handleTagToggle: (tag: string) => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function DetailsTab({
  roadtrip, updateRoadtripField, selectedTag, setSelectedTag, handleTagToggle, onPrev, onNext,
}: Props) {
  const availableTagsFiltered = availableTags.filter((t) => !roadtrip.tags.includes(t));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Détails du voyage</CardTitle>
        <CardDescription>Ajoutez des détails pratiques</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Durée */}
          <div className="space-y-1">
            <Label htmlFor="duration">Durée (jours) <span className="text-red-500">*</span></Label>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="icon" onClick={() => updateRoadtripField("duration", Math.max(1, roadtrip.duration - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="duration"
                type="number"
                min={1}
                value={roadtrip.duration}
                onChange={(e) => updateRoadtripField("duration", parseInt(e.target.value || "1", 10))}
                required
              />
              <Button variant="outline" size="icon" onClick={() => updateRoadtripField("duration", roadtrip.duration + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Saison */}
          <div className="space-y-1">
            <Label htmlFor="bestSeason">Meilleure saison <span className="text-red-500">*</span></Label>
            <Select
              value={roadtrip.bestSeason}
              onValueChange={(v) => updateRoadtripField("bestSeason", v)}
            >
              <SelectTrigger id="bestSeason">
                <SelectValue placeholder="Sélectionner une saison" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-1">
          <Label htmlFor="budget">Budget estimé (€) <span className="text-red-500">*</span></Label>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>500 €</span><span>5000 €</span>
            </div>
            <Slider
              id="budget"
              min={500}
              max={5000}
              step={100}
              value={[roadtrip.budget]}
              onValueChange={(v) => updateRoadtripField("budget", v[0])}
            />
            <div className="text-center font-medium">{roadtrip.budget} €</div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <Label>Tags <span className="text-red-500">*</span></Label>
          <p className="text-sm text-muted-foreground">Sélectionnez au moins un tag</p>

          <div className="flex flex-wrap gap-2">
            {roadtrip.tags.map((tag) => (
              <Badge key={tag} className="cursor-pointer" onClick={() => handleTagToggle(tag)}>
                {tag} <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>

          <Select
            value={selectedTag}
            onValueChange={(v) => {
              setSelectedTag(v);
              if (v && !roadtrip.tags.includes(v)) handleTagToggle(v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ajouter un tag" />
            </SelectTrigger>
            <SelectContent>
              {availableTagsFiltered.map((tag) => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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