"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AuthService } from "@/services/auth-service";
import LoginPromptModal from "@/components/ui/login-prompt-modal";
import OptimizedImage from "./ui/optimized-image";
import { FavoriteService } from "@/services/favorites-service";

interface RoadTripCardProps {
  id: string;
  title: string;
  image: string;
  country: string;
  region?: string;
  duration: number;
  budget: string | number;
  tags: string[] | string | undefined;
  isPremium?: boolean;
  isFavorite?: boolean;
}

export default function RoadTripCard({
  id,
  title,
  image,
  country,
  region,
  duration,
  budget,
  tags,
  isPremium = false,
  isFavorite: isFavoriteProp = false,
}: RoadTripCardProps) {
  const [isFavorite, setIsFavorite] = useState(isFavoriteProp);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    AuthService.checkAuthentication().then(setIsAuthenticated);
  }, []);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) return setShowLoginPrompt(true);

    try {
      const response = await FavoriteService.toggleFavorite(id);
      setIsFavorite(response.favorited);
    } catch (error) {
      console.error("Erreur favori:", error);
    }
  };

  const safeTags = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
    ? [tags]
    : [];
  const safeBudget =
    typeof budget === "number"
      ? `${budget} €`
      : typeof budget === "string"
      ? budget
      : "? €";

  return (
    <>
      <LoginPromptModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />

      <Card className="border-none shadow-md hover:shadow-lg rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02]">
        {/* Image + boutons */}
        <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
          <OptimizedImage
            src={image}
            alt={title || "Image du roadtrip"}
            fill
            fallbackSrc="/placeholder.svg"
            className="hover:scale-105"
          />

          {/* Favori */}
          <button
            onClick={toggleFavorite}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
            }
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 backdrop-blur-sm hover:bg-white shadow transition-all duration-200 hover:scale-110"
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors duration-200",
                isFavorite
                  ? "fill-red-600 text-red-600"
                  : "text-gray-600 hover:text-red-500"
              )}
            />
          </button>

          {/* Premium */}
          {isPremium && (
            <div className="absolute left-3 top-3">
              <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm">
                ✨ Premium
              </Badge>
            </div>
          )}
        </div>

        {/* Contenu texte */}
        <CardContent className="p-5">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span className="flex gap-1 items-center text-gray-700 font-medium">
              {country}
              {region && <>• {region}</>}
            </span>
            <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
              {duration} jour{duration > 1 ? "s" : ""}
            </span>
          </div>

          <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900 leading-tight">
            {title || "Roadtrip sans titre"}
          </h3>

          <div className="mb-3 flex flex-wrap gap-1">
            {safeTags.length > 0 ? (
              <>
                {safeTags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {safeTags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{safeTags.length - 3}
                  </Badge>
                )}
              </>
            ) : (
              <Badge
                variant="secondary"
                className="text-xs text-gray-800 bg-gray-200"
              >
                Aventure
              </Badge>
            )}
          </div>

          <div className="text-sm">
            <span className="text-red-600 font-semibold text-base">
              {safeBudget}
            </span>
            <span className="text-gray-500 ml-1">estimé</span>
          </div>
        </CardContent>

        {/* Bouton en savoir plus */}
        <CardFooter className="p-5 pt-0">
          <Link href={`/roadtrip/${id}`} className="w-full">
            <Button className="w-full">En savoir plus</Button>
          </Link>
        </CardFooter>
      </Card>
    </>
  );
}
