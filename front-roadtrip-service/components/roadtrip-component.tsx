import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Lock,
  Heart,
  Share2,
  TriangleAlert,
  Download,
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";

// Hero Section
export const RoadTripHero = ({
  image,
  title,
  description,
  country,
  region,
  isPremium,
  canAccessPremium,
  tags,
}: any) => {
  return (
    <div className="relative h-[350px] sm:h-[450px] lg:h-[500px] w-full overflow-hidden">
      {/* Image de fond */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
      {/* Overlay dégradé sombre */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      <div className="container relative z-10 flex h-full flex-col justify-end pb-6 sm:pb-8 lg:pb-12 text-white px-4 sm:px-6 lg:px-8">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
          {tags?.map((tag: string, index: number) => (
            <Badge 
              key={index} 
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-xs sm:text-sm"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Titre */}
        <Title level={1} className="mb-3 sm:mb-4 max-w-4xl text-white">
          {title}
        </Title>

        {/* Description */}
        {description && (
          <div className="relative max-w-3xl mb-3 sm:mb-4">
            <Paragraph 
              size="base" 
              className="text-white/90 line-clamp-3 lg:line-clamp-none"
            >
              {description}
            </Paragraph>
            {/* Effet fondu si description longue sur petit écran */}
            <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-black to-transparent pointer-events-none lg:hidden" />
          </div>
        )}

        {/* Localisation + Premium */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center text-sm sm:text-base font-medium">
            <MapPin className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white/90 flex-shrink-0" />
            <span>
              {country}
              {region ? ` • ${region}` : ""}
            </span>
          </div>

          {isPremium && (
            <Badge
              className={`w-fit ${
                canAccessPremium ? "bg-green-500/90" : "bg-primary/90"
              } text-white border-none transition-colors backdrop-blur-sm text-xs sm:text-sm`}
            >
              {canAccessPremium ? "Premium Débloqué" : "Premium"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

// Itinéraire
export const RoadTripItinerary = ({ itinerary }: any) => {
  return (
    <section>
      <div className="flex items-center mb-6 sm:mb-8">
        <div className="h-8 sm:h-10 w-1 sm:w-1.5 bg-primary rounded-full mr-3 sm:mr-4"></div>
        <Title level={2}>
          Itinéraire jour par jour
        </Title>
      </div>
      
      <div className="space-y-4 sm:space-y-6">
        {itinerary.map((step: any, index: number) => (
          <div
            key={index}
            className={`border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 ${
              index % 2 === 0 ? "bg-gray-50/50" : "bg-white"
            }`}
          >
            <Title level={4} className="mb-2 sm:mb-3">
              Jour {step.day} — {step.title}
            </Title>
            
            <Paragraph size="sm" className="mb-3">
              {step.description}
            </Paragraph>
            
            {step.overnight && (
              <div className="flex items-center text-xs sm:text-sm text-primary font-medium">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                Nuit sur place
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

// Premium Verrouillé
export const PremiumItineraryLocked = () => {
  return (
    <section className="border border-gray-100 rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center mb-6 sm:mb-8">
        <div className="h-8 sm:h-10 w-1 sm:w-1.5 bg-primary rounded-full mr-3 sm:mr-4" />
        <Title level={2}>
          Itinéraire détaillé jour par jour
        </Title>
      </div>

      <div className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 sm:py-16 lg:py-20 bg-white border border-dashed border-primary/30 rounded-xl">
        <div className="mb-6 sm:mb-8">
          <div className="bg-primary/10 p-4 sm:p-6 rounded-full inline-flex items-center justify-center">
            <Lock className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>
        </div>
        
        <Title level={3} className="mb-4 sm:mb-6">
          Contenu réservé aux membres Premium
        </Title>
        
        <Paragraph 
          size="base" 
          align="center"
          className="max-w-xl mb-6 sm:mb-8 px-4 sm:px-0"
        >
          Débloquez l'accès à l'itinéraire détaillé, la carte interactive, les
          conseils exclusifs et bien plus encore.
        </Paragraph>
        
        <Link href="/premium">
          <Button className="px-6 sm:px-8 py-3">
            Passer à Premium
          </Button>
        </Link>
      </div>
    </section>
  );
};

// Points d'intérêt
export const PointsOfInterest = ({ points }: any) => {
  return (
    <section>
      <div className="flex items-center mb-6 sm:mb-8">
        <div className="h-8 sm:h-10 w-1 sm:w-1.5 bg-primary rounded-full mr-3 sm:mr-4"></div>
        <Title level={2}>
          Points d'intérêt
        </Title>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {points?.map((poi: any, index: number) => (
          <div
            key={index}
            className="border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-white"
          >
            <div className="relative overflow-hidden h-40 sm:h-48 lg:h-52">
              <img
                src={poi.image || "/placeholder.svg"}
                alt={poi.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4 sm:p-5 lg:p-6">
              <Title level={4} className="mb-2 sm:mb-3">
                {poi.name}
              </Title>
              <Paragraph size="sm">
                {poi.description}
              </Paragraph>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// Sidebar
export const RoadTripSidebar = ({
  roadTrip,
  userRole,
  canAccessPremium,
  favorite,
  handleAddToFavorites,
  handleShare,
  handleDelete,
}: any) => {
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-4 space-y-4 sm:space-y-6">
        {/* Informations pratiques */}
        <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <Title level={4} className="mb-4 sm:mb-6 text-center">
            Informations pratiques
          </Title>
          
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-start group">
              <div className="mr-3 mt-1 flex-shrink-0">
                <Calendar className="h-5 w-5 text-primary/80" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm sm:text-base">Meilleure saison</div>
                <Paragraph size="sm" className="mt-1">
                  {roadTrip.bestSeason}
                </Paragraph>
              </div>
            </div>
            
            <div className="flex items-start group">
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
            
            <div className="flex items-start group">
              <div className="mr-3 mt-1 flex-shrink-0">
                <DollarSign className="h-5 w-5 text-primary/80" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm sm:text-base">Budget estimé</div>
                <Paragraph size="sm" className="mt-1">
                  {typeof roadTrip.budget === "object"
                    ? `${roadTrip.budget.amount || 0} ${roadTrip.budget.currency || "€"}`
                    : `${roadTrip.budget || 0} €`}
                </Paragraph>
              </div>
            </div>
          </div>
        </div>

        {/* Statut d'accès Premium */}
        {roadTrip.isPremium && userRole === "user" && (
          <div className="rounded-xl p-5 sm:p-6 shadow-sm bg-primary/5 border border-primary/10 transition-shadow hover:shadow-md">
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
                className="w-full sm:w-auto rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm hover:shadow px-4 py-2"
              >
                Débloquer Premium
              </Button>
            </Link>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="space-y-3 bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          {/* Partage */}
          <Button 
            variant="outline" 
            onClick={handleShare}
            className="w-full justify-between"
          >
            <span>Partager</span>
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Export PDF (si autorisé) */}
          {(canAccessPremium || !roadTrip.isPremium) && (
            <Button
              variant="outline"
              onClick={() => generateRoadtripPdf(roadTrip.title || "roadtrip")}
              className="w-full justify-between"
            >
              <span>Télécharger PDF</span>
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}

          {/* Favoris */}
          <Button 
            onClick={handleAddToFavorites}
            className="w-full justify-between"
          >
            <span>{favorite ? "Ajouté aux favoris" : "Ajouter aux favoris"}</span>
            <Heart
              className={`h-4 w-4 sm:h-5 sm:w-5 ${
                favorite ? "fill-white" : ""
              } transition-transform hover:scale-110`}
            />
          </Button>

          {/* Boutons admin */}
          {userRole === "admin" && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Title level={4} className="mb-3 sm:mb-4">
                Administration
              </Title>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href={`/admin/roadtrip/update/${roadTrip._id}`}
                  className="block"
                >
                  <Button variant="outline" className="w-full">
                    Modifier
                  </Button>
                </Link>
                <Button 
                  onClick={handleDelete}
                  className="w-full"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Génération PDF
export const generateRoadtripPdf = async (fileName = "roadtrip") => {
  const input = document.getElementById("roadtrip-pdf");
  if (!input) return;

  window.scrollTo(0, 0);

  const canvas = await html2canvas(input, {
    scale: 2,
    useCORS: true,
    scrollY: -window.scrollY,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${fileName}.pdf`);
};