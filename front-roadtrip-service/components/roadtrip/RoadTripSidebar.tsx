"use client";

import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calendar,
  Clock,
  DollarSign,
  Lock,
  Share2,
  Download,
  Heart,
  Loader2,
} from "lucide-react";
import type { Roadtrip } from "@/types/roadtrip";

type Props = {
  roadTrip: Roadtrip & { _id?: string };
  userRole: "user" | "admin" | "premium";
  canAccessPremium: boolean;
  favorite: boolean;
  favoriteLoading?: boolean; // 👈 nouveau
  handleAddToFavorites: (e: React.MouseEvent) => void;
  handleShare: () => void;
  generatePdf: () => void;
  handleDelete: () => void;
};

export default function RoadTripSidebar({
  roadTrip,
  userRole,
  canAccessPremium,
  favorite,
  favoriteLoading = false, // 👈 défaut
  handleAddToFavorites,
  handleShare,
  generatePdf,
  handleDelete,
}: Props) {
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-4 space-y-4 sm:space-y-6">
        {/* Infos pratiques */}
        <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <Title level={4} className="mb-4 sm:mb-6 text-center">
            Informations pratiques
          </Title>

          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-start">
              <div className="mr-3 mt-1 flex-shrink-0">
                <Calendar className="h-5 w-5 text-primary/80" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm sm:text-base">
                  Meilleure saison
                </div>
                <Paragraph size="sm" className="mt-1">
                  {roadTrip.bestSeason}
                </Paragraph>
              </div>
            </div>

            <div className="flex items-start">
              <div className="mr-3 mt-1 flex-shrink-0">
                <Clock className="h-5 w-5 text-primary/80" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm sm:text-base">Durée</div>
                <Paragraph size="sm" className="mt-1">
                  {roadTrip.duration} jours
                </Paragraph>
              </div>
            </div>

            <div className="flex items-start">
              <div className="mr-3 mt-1 flex-shrink-0">
                <DollarSign className="h-5 w-5 text-primary/80" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm sm:text-base">
                  Budget estimé
                </div>
                <Paragraph size="sm" className="mt-1">
                  {typeof roadTrip.budget === "object"
                    ? `${roadTrip.budget.amount || 0} ${
                        roadTrip.budget.currency || "€"
                      }`
                    : `${roadTrip.budget || 0} €`}
                </Paragraph>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Lock */}
        {roadTrip.isPremium && userRole === "user" && (
          <div className="rounded-xl p-5 sm:p-6 shadow-sm bg-primary/5 border border-primary/10 hover:shadow-md">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="bg-primary/10 p-2 rounded-full flex-shrink-0">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary/80" />
              </div>
              <Title level={4} className="text-primary">
                Contenu verrouillé
              </Title>
            </div>
            <Paragraph size="sm" className="mb-4 sm:mb-6">
              Certains contenus sont réservés aux abonnés premium.
            </Paragraph>
            <Link href="/premium" className="block">
              <Button
                size="sm"
                className="w-full sm:w-auto rounded-full px-4 py-2"
              >
                Débloquer Premium
              </Button>
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <Button
            variant="outline"
            onClick={handleShare}
            className="w-full justify-between"
          >
            <span>Partager</span>
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {(canAccessPremium || !roadTrip.isPremium) && (
            <Button
              variant="outline"
              onClick={generatePdf}
              className="w-full justify-between"
            >
              <span>Télécharger PDF</span>
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}

          <Button
            onClick={handleAddToFavorites}
            className={`w-full justify-between ${
              favorite ? "bg-primary text-white hover:bg-primary/90" : ""
            }`}
            variant={favorite ? "default" : "outline"}
            disabled={favoriteLoading}
            aria-pressed={favorite}
          >
            <span>
              {favoriteLoading
                ? "En cours…"
                : favorite
                ? "Retirer des favoris"
                : "Ajouter aux favoris"}
            </span>

            {favoriteLoading ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <Heart
                className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${
                  favorite ? "fill-white" : ""
                }`}
              />
            )}
          </Button>

          {userRole === "admin" && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Title level={4} className="mb-3 sm:mb-4">
                Administration
              </Title>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roadTrip._id && (
                  <Link
                    href={`/admin/roadtrip/update/${roadTrip._id}`}
                    className="block"
                  >
                    <Button variant="outline" className="w-full">
                      Modifier
                    </Button>
                  </Link>
                )}
                <Button onClick={handleDelete} className="w-full">
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
