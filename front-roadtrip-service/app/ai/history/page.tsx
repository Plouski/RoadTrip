"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, JSX } from "react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { AiService } from "@/services/ai-service";
import { AuthService } from "@/services/auth-service";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import {
  MessageSquare,
  Clock,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  conversationId: string;
}

interface GroupedMessages {
  [conversationId: string]: Message[];
}

export default function HistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [groupedMessages, setGroupedMessages] = useState<GroupedMessages>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Formate une date pour l'affichage selon le contexte mobile/desktop
  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const formatPattern = isMobile ? "d MMM à HH:mm" : "d MMMM yyyy à HH:mm";
      return format(date, formatPattern, { locale: fr });
    } catch (error) {
      console.error("Erreur de formatage de date:", error);
      return "Date inconnue";
    }
  }, [isMobile]);

  // Récupère la date de création d'une conversation (premier message)
  const getConversationDate = useCallback((messages: Message[]): string => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return "Date inconnue";
    }

    try {
      const sortedMessages = [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return formatDate(sortedMessages[0].createdAt);
    } catch (error) {
      console.error("Erreur lors de l'extraction de la date de conversation:", error);
      return "Date inconnue";
    }
  }, [formatDate]);

  // Génère un titre pour la conversation basé sur le premier message utilisateur
  const getConversationTitle = useCallback((messages: Message[]): string => {
    try {
      if (!Array.isArray(messages)) {
        console.warn("Les messages ne sont pas un tableau:", messages);
        return "Nouvelle conversation";
      }

      const firstUserMessage = messages.find(msg => msg?.role === "user");
      
      if (!firstUserMessage?.content) {
        return "Nouvelle conversation";
      }

      const maxLength = isMobile ? 25 : 40;
      const content = firstUserMessage.content.trim();
      
      return content.length > maxLength 
        ? `${content.substring(0, maxLength)}...` 
        : content;
    } catch (error) {
      console.error("Erreur lors de la génération du titre:", error);
      return "Nouvelle conversation";
    }
  }, [isMobile]);

  // Charge l'historique des conversations depuis l'API
  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      const history = await AiService.getHistory();

      if (history && typeof history === "object") {
        setGroupedMessages(history);
        setError(null);
      } else {
        console.error("Format de réponse d'historique invalide:", history);
        setError("Format de données non reconnu.");
      }
    } catch (err) {
      console.error("Erreur lors du chargement de l'historique:", err);
      setError("Erreur lors du chargement de l'historique.");
    }
  }, []);

  // Vérifie l'authentification et les permissions de l'utilisateur
  const checkAuthentication = useCallback(async (): Promise<void> => {
    try {
      const { isAuthenticated, role } = await AuthService.checkAuthenticationAndRole();

      if (!isAuthenticated) {
        console.log("Utilisateur non authentifié, redirection vers /auth");
        router.push("/auth");
        return;
      }

      if (role !== "premium" && role !== "admin") {
        console.log(`Rôle ${role} non autorisé pour cette page, redirection vers /premium`);
        router.push("/premium");
        return;
      }

      await loadHistory();
    } catch (error) {
      console.error("Erreur lors de la vérification d'authentification:", error);
      setError("Erreur lors de la vérification de votre accès.");
    }
  }, [router, loadHistory]);

  // Initie le processus de suppression d'une conversation
  const handleDeleteClick = useCallback((conversationId: string): void => {
    setConversationToDelete(conversationId);
    setDialogOpen(true);
  }, []);

  // Confirme et exécute la suppression d'une conversation
  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!conversationToDelete) return;

    setIsDeleting(conversationToDelete);

    try {
      await AiService.deleteConversation(conversationToDelete);

      setGroupedMessages(prevMessages => {
        const updatedMessages = { ...prevMessages };
        delete updatedMessages[conversationToDelete];
        return updatedMessages;
      });

      toast.success("Conversation supprimée avec succès.");
    } catch (error) {
      console.error("Erreur lors de la suppression de la conversation:", error);
      toast.error("Impossible de supprimer la conversation.");
    } finally {
      setDialogOpen(false);
      setIsDeleting(null);
      setConversationToDelete(null);
    }
  }, [conversationToDelete]);

  // Ferme le dialogue de confirmation sans supprimer
  const handleCancelDelete = useCallback((): void => {
    setDialogOpen(false);
    setConversationToDelete(null);
  }, []);

  // vérification d'authentification au chargement
  useEffect(() => {
    const initializePage = async (): Promise<void> => {
      setIsLoading(true);
      await checkAuthentication();
      setIsLoading(false);
    };

    initializePage();
  }, [checkAuthentication]);

  // Composant pour le header de la page
  const PageHeader = (): JSX.Element => (
    <div className="mb-6 md:mb-12 flex items-center justify-between md:justify-center">
      {/* Bouton retour (mobile uniquement) */}
      {isMobile && (
        <Link
          href="/ai"
          className="inline-flex items-center text-stone-600 hover:text-stone-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span>Retour</span>
        </Link>
      )}
      
      {/* Titre principal */}
      <div className={`${isMobile ? "text-center flex-1" : "text-center"}`}>
        <h1 className="text-2xl md:text-3xl font-light text-stone-800 mb-2 md:mb-3">
          Historique des voyages
        </h1>
        {!isMobile && (
          <p className="text-stone-500 text-lg">
            Retrouvez toutes vos conversations avec l'assistant ROADTRIP!
          </p>
        )}
      </div>
      
      {/* Espacement pour mobile (équilibrer le layout) */}
      {isMobile && <div className="w-16" />}
    </div>
  );

  // Composant pour afficher un message d'erreur
  const ErrorMessage = (): JSX.Element | null => {
    if (!error) return null;

    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 md:p-4 mb-6 md:mb-8 text-center shadow-sm">
        <AlertCircle className="h-4 w-4 inline mr-2" />
        {error}
      </div>
    );
  };

  // Composant pour une carte de conversation individuelle
  const ConversationCard = ({ conversationId, messages }: { 
    conversationId: string; 
    messages: Message[] 
  }): JSX.Element | null => {
    if (!Array.isArray(messages)) {
      console.warn(`Messages invalides pour la conversation ${conversationId}:`, messages);
      return null;
    }

    const validMessages = messages.filter(msg => msg && typeof msg === "object");
    if (validMessages.length === 0) return null;

    const conversationTitle = getConversationTitle(validMessages);
    const conversationDate = getConversationDate(validMessages);
    const isCurrentlyDeleting = isDeleting === conversationId;
    const previewMessages = validMessages.slice(0, 2);

    return (
      <div
        className={`bg-white border border-stone-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${
          isCurrentlyDeleting ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {/* En-tête de la conversation */}
        <div className="p-4 md:p-6 border-b border-stone-100">
          <h2 className="text-lg md:text-xl font-medium text-stone-800 mb-1 md:mb-2 line-clamp-2">
            {conversationTitle}
          </h2>
          <div className="flex items-center gap-2 text-stone-500 text-xs md:text-sm">
            <Clock className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span>{conversationDate}</span>
          </div>
        </div>

        {/* Aperçu des messages */}
        <div className="p-4 md:p-6 space-y-3 md:space-y-4 bg-stone-50 border-b border-stone-100">
          {previewMessages.map((message) => (
            <div
              key={message._id}
              className={`rounded-lg p-3 md:p-4 ${
                message.role === "user"
                  ? "bg-red-600 text-white"
                  : "bg-white text-stone-700 border border-stone-200"
              }`}
            >
              <div className="text-xs md:text-sm mb-1 md:mb-2 font-medium">
                {message.role === "user" ? "Vous" : "Assistant ROADTRIP!"}
              </div>
              <p className="text-xs md:text-sm line-clamp-2">
                {message.content}
              </p>
            </div>
          ))}
        </div>

        {/* Actions de la conversation */}
        <div className="p-3 md:p-4 flex justify-between items-center bg-white">
          <div className="flex gap-2 items-center">
            {/* Compteur de messages */}
            <div className="text-xs text-stone-500 font-light">
              {validMessages.length} message{validMessages.length > 1 ? "s" : ""}
            </div>

            {/* Bouton de suppression */}
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full transition-colors"
              onClick={() => handleDeleteClick(conversationId)}
              disabled={isCurrentlyDeleting}
              aria-label="Supprimer la conversation"
            >
              <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>

          {/* Lien vers la conversation complète */}
          <Link
            href={`/ai/conversation/${conversationId}`}
            className="flex items-center text-red-500 hover:text-red-700 transition-colors text-xs md:text-sm font-medium group"
          >
            {isMobile ? "Voir" : "Voir la conversation"}
            <ArrowRight className="ml-1 h-3 w-3 md:h-4 md:w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  };

  // Composant pour l'état vide (aucune conversation)
  const EmptyState = (): JSX.Element => (
    <div className="bg-white border border-stone-200 rounded-xl p-6 md:p-10 text-center mt-6 md:mt-8 shadow-sm">
      <MessageSquare className="h-10 w-10 md:h-12 md:w-12 text-stone-300 mx-auto mb-3 md:mb-4" />
      <h3 className="text-lg md:text-xl font-medium text-stone-700 mb-2">
        Aucune conversation
      </h3>
      <p className="text-stone-500 mb-4 md:mb-6 text-sm md:text-base">
        Vous n'avez pas encore démarré de conversation avec l'assistant ROADTRIP!.
      </p>
      <Link
        href="/ai"
        className="inline-flex items-center bg-red-500 hover:bg-red-600 text-white py-2 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg transition-colors shadow-sm"
      >
        Démarrer une conversation
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </div>
  );

  // Dialogue de confirmation de suppression
  const DeleteConfirmationDialog = (): JSX.Element => (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogContent className="bg-white max-w-xs md:max-w-md mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-stone-800 text-lg md:text-xl">
            Confirmer la suppression
          </AlertDialogTitle>
          <AlertDialogDescription className="text-stone-600 text-sm md:text-base">
            Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex space-x-2 justify-end">
          <AlertDialogCancel 
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 border-none text-sm"
            onClick={handleCancelDelete}
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 hover:bg-red-600 text-white text-sm"
            onClick={handleConfirmDelete}
            disabled={isDeleting !== null}
          >
            {isDeleting ? "Suppression..." : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Affichage du loader pendant le chargement initial
  if (isLoading) {
    return <Loading text="Chargement de l'historique..." />;
  }

  const hasConversations = Object.keys(groupedMessages).length > 0;

  return (
    <div className="min-h-screen bg-stone-50 py-8 md:py-16">
      <div className="container max-w-5xl px-4 md:px-6">
        {/* En-tête de la page */}
        <PageHeader />

        {/* Message d'erreur */}
        <ErrorMessage />

        {/* Grille des conversations */}
        {hasConversations && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {Object.entries(groupedMessages).map(([conversationId, messages]) => (
              <ConversationCard
                key={conversationId}
                conversationId={conversationId}
                messages={messages}
              />
            ))}
          </div>
        )}

        {/* État vide */}
        {!hasConversations && !error && <EmptyState />}
      </div>

      {/* Dialogue de confirmation de suppression */}
      <DeleteConfirmationDialog />
    </div>
  );
}