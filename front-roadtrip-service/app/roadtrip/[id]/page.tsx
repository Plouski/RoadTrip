"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserRole } from "@/lib/auth";
import { RoadtripService } from "@/services/roadtrip-service";
import { AuthService } from "@/services/auth-service";
import { AdminService } from "@/services/admin-service";
import LoginPromptModal from "@/components/ui/login-prompt-modal";
import jsPDF from "jspdf";
import {
  RoadTripHero,
  RoadTripItinerary,
  PremiumItineraryLocked,
  PointsOfInterest,
  RoadTripSidebar,
} from "@/components/roadtrip-component";
import { NotFoundMessage } from "@/components/ui/not-found-message";
import Loading from "@/components/ui/loading";

export default function RoadTripPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [roadTrip, setRoadTrip] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("visitor");
  const [canAccessPremium, setCanAccessPremium] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [favorite, setFavorite] = useState<boolean>(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // 🔥 DEBUG : Afficher les informations de debug
  console.log("🔍 Debug RoadTripPage:", {
    id,
    type: typeof id,
    params,
    isValidId: id && /^[0-9a-fA-F]{24}$/.test(id),
  });

  useEffect(() => {
    // 🔥 CORRECTION CRITIQUE : Vérifier que l'ID existe ET est valide
    if (!id) {
      console.error("❌ Pas d'ID fourni");
      setError("ID de roadtrip manquant");
      setIsLoading(false);
      return;
    }

    if (typeof id !== "string") {
      console.error("❌ ID invalide (type):", typeof id);
      setError("Format d'ID invalide");
      setIsLoading(false);
      return;
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      console.error("❌ ID invalide (format MongoDB):", id);
      setError("ID de roadtrip invalide");
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      const authStatus = await AuthService.checkAuthentication();
      setIsAuthenticated(authStatus);
    };

    const loadRoadtrip = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("🚀 Chargement du roadtrip avec ID:", id);

        const role = getUserRole() || "visitor";
        setUserRole(role);

        const trip = await RoadtripService.getRoadtripById(id);
        console.log("✅ Roadtrip chargé:", trip);
        setRoadTrip(trip);

        try {
          await RoadtripService.incrementViewCount(trip._id || id);
        } catch (err) {
          console.error("Erreur lors de l'enregistrement de la vue:", err);
        }

        if (trip.userAccess) {
          setCanAccessPremium(
            trip.userAccess.canAccessPremium || role === "admin"
          );
          setFavorite(trip.userAccess.isFavorite || false);
        } else {
          setCanAccessPremium(role === "admin" || role === "premium");
        }
      } catch (error: any) {
        console.error("❌ Erreur lors du chargement du roadtrip:", error);
        setError(error.message || "Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    // 🔥 CORRECTION : Seulement exécuter si l'ID est valide
    checkAuth();
    loadRoadtrip();
  }, [id]); // Dépendance sur id

  // Gestion des favoris
  const handleAddToFavorites = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    setFavorite(!favorite);
  };

  // Suppression (pour admin)
  const handleDelete = async () => {
    const confirmed = confirm("Voulez-vous vraiment supprimer ce roadtrip ?");
    if (!confirmed) return;

    try {
      await AdminService.deleteRoadtrip(roadTrip._id);
      router.push("/");
    } catch (error: any) {
      alert(`Erreur lors de la suppression du roadtrip: ${error.message}`);
    }
  };

  // Partage
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: roadTrip.title,
          text: roadTrip.description,
          url: window.location.href,
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Lien copié dans le presse-papiers !");
    }
  };

  // Génération PDF
  const generatePdf = () => {
    const doc = new jsPDF();
    let y = 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(roadTrip.title, 10, y);
    y += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Pays : ${roadTrip.country}`, 10, y);
    y += 6;
    if (roadTrip.region) {
      doc.text(`Région : ${roadTrip.region}`, 10, y);
      y += 6;
    }
    doc.text(`Durée : ${roadTrip.duration} jours`, 10, y);
    y += 6;
    doc.text(`Budget : ${roadTrip.budget} €`, 10, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Itinéraire :", 10, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    roadTrip.itinerary?.forEach((step: any) => {
      if (y > 270) {
        doc.addPage();
        y = 10;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`Jour ${step.day} — ${step.title}`, 10, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(step.description, 180), 10, y);
      y += 10;
    });

    doc.save(`${roadTrip.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  };

  // 🔥 CORRECTION : Affichage d'erreur avec informations de debug
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
    <div className="min-h-screen animate-fadeIn" id="roadtrip-pdf">
      <LoginPromptModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />

      <RoadTripHero
        image={roadTrip.image}
        title={roadTrip.title}
        description={roadTrip.description}
        country={roadTrip.country}
        region={roadTrip.region}
        duration={roadTrip.duration}
        budget={roadTrip.budget}
        isPremium={roadTrip.isPremium}
        canAccessPremium={canAccessPremium}
        tags={roadTrip.tags}
      />

      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-8 sm:space-y-12 lg:space-y-16">
            {roadTrip.pointsOfInterest?.length > 0 && (
              <PointsOfInterest points={roadTrip.pointsOfInterest} />
            )}

            {roadTrip.itinerary?.length > 0 && !roadTrip.isPremium && (
              <RoadTripItinerary itinerary={roadTrip.itinerary} />
            )}

            {roadTrip.isPremium &&
              roadTrip.itinerary?.length > 0 &&
              (canAccessPremium ? (
                <RoadTripItinerary itinerary={roadTrip.itinerary} />
              ) : (
                <PremiumItineraryLocked />
              ))}
          </div>

          {/* Sidebar */}
          <RoadTripSidebar
            roadTrip={roadTrip}
            userRole={userRole}
            canAccessPremium={canAccessPremium}
            favorite={favorite}
            handleAddToFavorites={handleAddToFavorites}
            handleShare={handleShare}
            generatePdf={generatePdf}
            handleDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
