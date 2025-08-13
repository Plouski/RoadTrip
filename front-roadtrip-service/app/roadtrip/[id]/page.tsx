"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";

import RoadTripView from "@/components/roadtrip/RoadTripView";
import LoginPromptModal from "@/components/ui/login-prompt-modal";
import Loading from "@/components/ui/loading";
import { NotFoundMessage } from "@/components/ui/not-found-message";

import { AuthService } from "@/services/auth-service";
import { RoadtripService } from "@/services/roadtrip-service";
import { AdminService } from "@/services/admin-service";
import { FavoriteService } from "@/services/favorites-service";
import { getUserRole } from "@/lib/auth";

type UserRole = "visitor" | "user" | "premium" | "admin";

function isMongoId(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
}

function makePdfFileName(title: string) {
  const raw = (title || "roadtrip").toString();
  return `${raw
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()}-roadtrip.pdf`;
}

export default function RoadTripPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [roadTrip, setRoadTrip] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole>("visitor");
  const [canAccessPremium, setCanAccessPremium] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (!isMongoId(id)) {
      setError("ID de roadtrip invalide");
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1) Auth
        const authStatus = await AuthService.checkAuthentication();
        setIsAuthenticated(authStatus);

        const role = (getUserRole() || "user") as UserRole;
        setUserRole(role);

        // 2) Trip
        const trip = await RoadtripService.getRoadtripById(id);
        setRoadTrip(trip);

        // 3) Accès premium
        setCanAccessPremium(
          role === "admin" ||
            role === "premium" ||
            !!trip?.userAccess?.canAccessPremium
        );

        // 4) Favori
        if (authStatus) {
          try {
            const data = await FavoriteService.getFavorites();
            const list = Array.isArray(data?.roadtrips) ? data.roadtrips : [];
            const tripId = trip?._id || id;
            setFavorite(list.some((t: any) => (t?._id || t?.id) === tripId));
          } catch {
          }
        }

        // 5) compteur de vues
        RoadtripService.incrementViewCount(trip?._id || id).catch(() => {});
      } catch (e: any) {
        setError(e?.message || "Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handleAddToFavorites = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAuthenticated) return setShowLoginPrompt(true);

      try {
        setFavoriteLoading(true);
        const res = await FavoriteService.toggleFavorite(roadTrip._id);
        setFavorite(!!res.favorited);
      } catch {
      } finally {
        setFavoriteLoading(false);
      }
    },
    [isAuthenticated, roadTrip?._id]
  );

  const handleDelete = useCallback(async () => {
    const confirmed = confirm("Voulez-vous vraiment supprimer ce roadtrip ?");
    if (!confirmed) return;

    try {
      await AdminService.deleteRoadtrip(roadTrip._id);
      router.push("/");
    } catch (e: any) {
      alert(
        `Erreur lors de la suppression du roadtrip: ${e?.message || "inconnue"}`
      );
    }
  }, [roadTrip?._id, router]);

  const handleShare = useCallback(() => {
    const payload = {
      title: roadTrip?.title,
      text: roadTrip?.description,
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    if (navigator.share) {
      navigator.share(payload as ShareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(payload.url || "").then(() => {
        alert("Lien copié dans le presse-papiers !");
      });
    }
  }, [roadTrip?.title, roadTrip?.description]);

  const generatePdf = useCallback(() => {
    try {
      if (!roadTrip) return;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Titre
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      const titleLines = pdf.splitTextToSize(
        roadTrip.title || "",
        contentWidth
      );
      pdf.text(titleLines, margin, y);
      y += titleLines.length * 8 + 10;

      // Infos
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      const info = `${roadTrip.country || ""}${
        roadTrip.region ? ` • ${roadTrip.region}` : ""
      } • ${roadTrip.duration || 0} jours`;
      pdf.text(info, margin, y);
      y += 15;

      // Points d’intérêt
      const pois = Array.isArray(roadTrip.pointsOfInterest)
        ? roadTrip.pointsOfInterest
        : [];
      if (pois.length > 0) {
        if (y > 250) {
          pdf.addPage();
          y = margin;
        }
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("Points d'intérêt", margin, y);
        y += 10;

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");

        pois.forEach((poi: any, i: number) => {
          if (y > 260) {
            pdf.addPage();
            y = margin;
          }
          pdf.setFont("helvetica", "bold");
          pdf.text(`${i + 1}. ${poi?.name || ""}`, margin, y);
          y += 6;

          pdf.setFont("helvetica", "normal");
          const desc = pdf.splitTextToSize(
            poi?.description || "",
            contentWidth - 5
          );
          pdf.text(desc, margin + 5, y);
          y += desc.length * 5 + 8;
        });

        y += 5;
      }

      // Itinéraire
      const canShowItin =
        Array.isArray(roadTrip.itinerary) &&
        roadTrip.itinerary.length > 0 &&
        (canAccessPremium || !roadTrip.isPremium);

      if (canShowItin) {
        if (y > 200) {
          pdf.addPage();
          y = margin;
        }
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("Itinéraire jour par jour", margin, y);
        y += 10;

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");

        roadTrip.itinerary.forEach((step: any) => {
          if (y > 250) {
            pdf.addPage();
            y = margin;
          }

          pdf.setFont("helvetica", "bold");
          const head = `Jour ${step?.day ?? ""} — ${step?.title ?? ""}`;
          const headLines = pdf.splitTextToSize(head, contentWidth);
          pdf.text(headLines, margin, y);
          y += headLines.length * 6 + 3;

          pdf.setFont("helvetica", "normal");
          const desc = pdf.splitTextToSize(
            step?.description || "",
            contentWidth - 5
          );
          pdf.text(desc, margin + 5, y);
          y += desc.length * 5;

          if (step?.overnight) {
            pdf.setFont("helvetica", "italic");
            pdf.text("🌙 Nuit sur place", margin + 5, y + 3);
            y += 6;
          }
          y += 8;
        });
      } else if (roadTrip.isPremium && !canAccessPremium) {
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("Itinéraire détaillé", margin, y);
        y += 10;

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.text("🔒 Contenu réservé aux membres Premium", margin, y);
        y += 6;
        pdf.text(
          "Visitez notre site pour débloquer l'accès complet.",
          margin,
          y
        );
      }

      // Enregistrer
      const fileName = makePdfFileName(roadTrip?.title);
      pdf.save(fileName);
    } catch (e: any) {
      console.error("Erreur PDF:", e);
      alert(
        `Erreur lors de la génération du PDF${
          e?.message ? ` : ${e.message}` : ""
        }`
      );
    }
  }, [roadTrip, canAccessPremium]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <NotFoundMessage
          title="Itinéraire introuvable"
          message="L'itinéraire que vous recherchez n'existe pas ou a été supprimé."
          linkHref="/"
          linkLabel="Retour à l'accueil"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Chargement des détails du roadtrip..." />
      </div>
    );
  }

  if (!roadTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <NotFoundMessage
          title="Itinéraire introuvable"
          message="L'itinéraire que vous recherchez n'existe pas ou a été supprimé."
          linkHref="/"
          linkLabel="Retour à l'accueil"
        />
      </div>
    );
  }

  return (
    <>
      <RoadTripView
        roadTrip={roadTrip}
        userRole={userRole}
        canAccessPremium={canAccessPremium}
        favorite={favorite}
        favoriteLoading={favoriteLoading}
        onAddToFavorites={handleAddToFavorites}
        onShare={handleShare}
        onGeneratePdf={generatePdf}
        onDelete={handleDelete}
      />

      <LoginPromptModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onConfirm={() => router.push("/login")}
        title="Connectez-vous pour continuer"
        message="Vous devez être connecté pour ajouter un favori."
      />
    </>
  );
}
