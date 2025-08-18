"use client";

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, ChevronRight } from "lucide-react";
import { Roadtrip } from "@/hooks/useRoadtripForm";
import { countries } from "@/lib/countries";

type Props = {
  roadtrip: Roadtrip;
  updateRoadtripField: <K extends keyof Roadtrip>(field: K, value: Roadtrip[K]) => void;
  handleImageUpload: (type: "main" | "poi", index?: number) => Promise<void>;
  onNext: () => void;
};

export default function BasicInfoTab({ roadtrip, updateRoadtripField, handleImageUpload, onNext }: Props) {
  return (
    <Card className="space-y-0">
      <CardHeader>
        <CardTitle>Informations essentielles</CardTitle>
        <CardDescription>Commençons par les informations de base</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Image */}
        <div className="space-y-1">
          <Label>Image principale</Label>
          <div className="border rounded-md p-4">
            <div className="aspect-video bg-muted rounded-md overflow-hidden">
              <img src={roadtrip.image} alt="Image principale" className="w-full h-full object-cover" />
            </div>
            <Button variant="outline" className="mt-2 w-full" onClick={() => handleImageUpload("main")}>
              <ImagePlus className="mr-2 h-4 w-4" />
              Choisir une image
            </Button>
          </div>
        </div>

        {/* Titre */}
        <div className="space-y-1">
          <Label htmlFor="title">Titre du roadtrip <span className="text-red-500">*</span></Label>
          <Input
            id="title"
            placeholder="Ex: Roadtrip dans les Alpes françaises"
            value={roadtrip.title}
            onChange={(e) => updateRoadtripField("title", e.target.value)}
            required
          />
        </div>

        {/* Pays */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="country">Pays <span className="text-red-500">*</span></Label>
            <Select
              value={roadtrip.country}
              onValueChange={(v) => updateRoadtripField("country", v)}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder="Sélectionner un pays" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
          <Textarea
            id="description"
            rows={5}
            placeholder="Décrivez votre roadtrip..."
            value={roadtrip.description}
            onChange={(e) => updateRoadtripField("description", e.target.value)}
            required
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button onClick={onNext}>
          Suivant
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}