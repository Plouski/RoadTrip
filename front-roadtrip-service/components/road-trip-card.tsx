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
    const checkAuth = async () => {
      const auth = await AuthService.checkAuthentication();
      setIsAuthenticated(auth);
    };
    checkAuth();
  }, []);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      const response = await FavoriteService.toggleFavorite(id);
      setIsFavorite(response.favorited);
    } catch (error) {
      console.error("Erreur favori:", error);
    }
  };

  // ✅ PROTECTION : Normaliser les données pour éviter les erreurs
  const safeTags = Array.isArray(tags) ? tags : 
                   typeof tags === 'string' ? [tags] : 
                   [];
  
  const safeBudget = typeof budget === 'number' ? budget.toString() : 
                     typeof budget === 'string' ? budget : 
                     '0';
  
  const safeTitle = title || 'Roadtrip sans titre';
  const safeCountry = country || 'Destination inconnue';
  const safeDuration = duration || 1;

  return (
    <>
      <LoginPromptModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />

      <Card className="border-none shadow-md hover:shadow-lg rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02]">
        <div className="relative">
          <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
            <img
              src={image || "/placeholder.svg"}
              alt={safeTitle}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg";
              }}
            />
          </div>

          {/* Bouton favoris */}
          <button
            onClick={toggleFavorite}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 backdrop-blur-sm hover:bg-white shadow transition-all duration-200 hover:scale-110"
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors duration-200",
                isFavorite ? "fill-red-600 text-red-600" : "text-gray-600 hover:text-red-500"
              )}
            />
          </button>

          {/* Badge Premium */}
          {isPremium && (
            <div className="absolute left-3 top-3">
              <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm">
                ✨ Premium
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-5">
          {/* Pays / Durée */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span className="flex items-center gap-1">
              <span className="text-gray-700 font-medium">{safeCountry}</span>
              {region && (
                <>
                  <span>•</span>
                  <span>{region}</span>
                </>
              )}
            </span>
            <span className="bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">
              {safeDuration} jour{safeDuration > 1 ? 's' : ''}
            </span>
          </div>

          {/* Titre */}
          <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900 leading-tight">
            {safeTitle}
          </h3>

          {/* Tags */}
          <div className="mb-3 flex flex-wrap gap-1">
            {safeTags.length > 0 ? (
              <>
                {safeTags.slice(0, 3).map((tag, index) => (
                  <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs">
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
              <Badge variant="outline" className="text-xs text-gray-400">
                Aventure
              </Badge>
            )}
          </div>

          {/* Budget */}
          <div className="text-sm">
            <span className="text-red-600 font-semibold text-base">
              {safeBudget}€
            </span>
            <span className="text-gray-500 font-normal ml-1">estimé</span>
          </div>
        </CardContent>

        <CardFooter className="p-5 pt-0">
          <Link href={`/roadtrip/${id}`} className="w-full">
            <Button className="w-full bg-primary hover:bg-primary/90 transition-colors duration-200">
              En savoir plus
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </>
  );
}