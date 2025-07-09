"use client";

import { useEffect, useRef, useState, useCallback, JSX } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { AiService } from "@/services/ai-service";
import { AuthService } from "@/services/auth-service";
import { useIsMobile } from "@/hooks/use-mobile";
import Loading from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { MessageBubble } from "@/components/assistant/message-bubble";
import { TypingIndicator } from "@/components/assistant/typing-indicator";
import { AssistantSidebar } from "@/components/assistant/assistant-sidebar";
import { ChatHeader } from "@/components/assistant/chat-header";
import { SidebarToggle } from "@/components/assistant/sidebar-toggle";
import { ChatInput } from "@/components/assistant/chat-input";
import { formatAiResponse } from "@/lib/formatAiResponse";

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  conversationId: string;
}

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.conversationId as string;
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationTitle, setConversationTitle] = useState("Conversation");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fait défiler automatiquement vers le bas des messages
  const scrollToBottom = useCallback((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Formate une date pour l'affichage selon le contexte mobile/desktop
  const formatDate = useCallback(
    (dateString: string): string => {
      try {
        const date = new Date(dateString);
        const formatPattern = isMobile ? "d MMM, HH:mm" : "d MMM yyyy à HH:mm";
        return format(date, formatPattern, { locale: fr });
      } catch (error) {
        console.error("Erreur de formatage de date:", error);
        return "";
      }
    },
    [isMobile]
  );

  // Génère un titre pour la conversation basé sur le premier message utilisateur
  const generateConversationTitle = useCallback(
    (messagesArray: Message[]): string => {
      const firstUserMessage = messagesArray.find((msg) => msg.role === "user");
      if (!firstUserMessage) return "Conversation";

      const content = firstUserMessage.content;
      const maxLength = isMobile ? 25 : 35;
      return content.length > maxLength
        ? `${content.substring(0, maxLength)}...`
        : content;
    },
    [isMobile]
  );

  // Vérifie l'authentification et les permissions de l'utilisateur
  const checkAuthentication = useCallback(async (): Promise<boolean> => {
    try {
      const { isAuthenticated, role } =
        await AuthService.checkAuthenticationAndRole();

      if (!isAuthenticated) {
        console.log("Utilisateur non authentifié, redirection vers /auth");
        router.push("/auth");
        return false;
      }

      if (role !== "premium" && role !== "admin") {
        console.log(
          `Rôle ${role} non autorisé pour cette page, redirection vers /premium`
        );
        router.push("/premium");
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "Erreur lors de la vérification d'authentification:",
        error
      );
      setError("Erreur lors de la vérification de votre accès.");
      return false;
    }
  }, [router]);

  // Charge les messages de la conversation depuis l'API
  const loadConversation = useCallback(async (): Promise<void> => {
    if (!conversationId) {
      setError("ID de conversation manquant");
      return;
    }

    try {
      const result = await AiService.getConversationById(conversationId);
      let messagesArray: Message[] = [];

      // Gestion des différents formats de réponse de l'API
      if (Array.isArray(result)) {
        messagesArray = result;
      } else if (result && typeof result === "object") {
        // Chercher les messages dans différentes propriétés possibles
        messagesArray = result.messages || result.data || [];
      }

      if (!Array.isArray(messagesArray)) {
        console.warn("Format de réponse inattendu:", result);
        messagesArray = [];
      }

      setMessages(messagesArray);

      // Générer le titre de la conversation
      if (messagesArray.length > 0) {
        const title = generateConversationTitle(messagesArray);
        setConversationTitle(title);
      }

      setError(null);

      // Focus automatique sur le champ de saisie
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (err) {
      console.error("Erreur lors du chargement de la conversation:", err);
      setError("Erreur lors du chargement de la conversation.");
    }
  }, [conversationId, generateConversationTitle]);

  // Gère l'envoi d'un nouveau message
  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      if (!input.trim() || isSubmitting) return;

      // Créer le message utilisateur
      const userMessage: Message = {
        _id: Date.now().toString(),
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
        conversationId,
      };

      // Ajouter le message à l'état et vider le champ de saisie
      setMessages((prev) => [...prev, userMessage]);
      const currentInput = input;
      setInput("");
      setIsSubmitting(true);

      try {
        // Sauvegarder le message utilisateur
        await AiService.saveMessage(
          "user",
          currentInput,
          conversationId
        );

        console.log("🚀 ENVOI REQUÊTE IA:", currentInput);

        // Appeler l'assistant IA
        const result = await AiService.askAssistant(currentInput, {
          includeWeather: true,
          conversationId,
        });

        console.log("📥 RÉPONSE BRUTE REÇUE:", result);
        console.log("📊 TYPE DE RÉPONSE:", typeof result);
        console.log("🏷️ TYPE DANS OBJET:", result?.type);

        // Vérifier si c'est déjà une string ou un objet
        let formatted: string;

        if (typeof result === "string") {
          console.log("⚠️ RÉPONSE DÉJÀ EN STRING — tentative de parsing JSON");
          try {
            const parsed = JSON.parse(result);
            formatted = formatAiResponse(parsed);
          } catch {
            console.warn("Impossible de parser la chaîne JSON, on garde brut");
            formatted = result; // fallback si ce n'est pas du JSON
          }
        } else if (result && typeof result === "object") {
          console.log("✅ FORMATAGE DE L'OBJET");
          formatted = formatAiResponse(result);
          console.log(
            "🎨 RÉSULTAT FORMATÉ:",
            formatted.substring(0, 200) + "..."
          );
        } else {
          console.log("❌ RÉPONSE INVALIDE");
          formatted = "❌ Réponse invalide reçue de l'assistant.";
        }

        // Créer le message de réponse de l'assistant
        const assistantMessage: Message = {
          _id: (Date.now() + 1).toString(),
          role: "assistant",
          content: formatted,
          createdAt: new Date().toISOString(),
          conversationId,
        };

        console.log(
          "💬 MESSAGE FINAL:",
          assistantMessage.content.substring(0, 200) + "..."
        );

        // Ajouter la réponse de l'assistant
        setMessages((prev) => [...prev, assistantMessage]);

        // Sauvegarder la réponse de l'assistant
        await AiService.saveMessage(
          "assistant",
          formatted,
          conversationId
        );

        toast.success("Message envoyé avec succès");
      } catch (error) {
        console.error("❌ ERREUR COMPLÈTE:", error);

        // Ajouter un message d'erreur détaillé
        const errorMessage: Message = {
          _id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `❌ **Erreur technique**\n\nDétails : ${
            error instanceof Error ? error.message : "Erreur inconnue"
          }\n\nVeuillez réessayer dans quelques instants.`,
          createdAt: new Date().toISOString(),
          conversationId,
        };

        setMessages((prev) => [...prev, errorMessage]);
        toast.error("Erreur lors de l'appel à l'IA");
      } finally {
        setIsSubmitting(false);
        setTimeout(scrollToBottom, 100);
      }
    },
    [input, isSubmitting, conversationId, scrollToBottom]
  );

  // Gère le téléchargement de la conversation en PDF
  const handleDownloadPDF = useCallback(async (): Promise<void> => {
    const element = document.getElementById("pdf-content");
    if (!element) {
      toast.error("Impossible de trouver le contenu à exporter");
      return;
    }

    toast.info("Génération du PDF en cours...");

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY,
        backgroundColor: "#fafaf9",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `${conversationTitle || "conversation"}-${
          new Date().toISOString().split("T")[0]
        }.pdf`
      );

      if (isMobile) {
        setSidebarOpen(false);
      }

      toast.success("PDF téléchargé avec succès");
    } catch (error) {
      console.error("Erreur lors de la création du PDF:", error);
      toast.error("Impossible de générer le PDF");
    }
  }, [conversationTitle, isMobile]);

  // Démarre une nouvelle session de conversation
  const startNewSession = useCallback((): void => {
    router.push("/ai");
  }, [router]);

  // Gère l'ouverture/fermeture de la sidebar
  const toggleSidebar = useCallback((): void => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  // Gère le changement de valeur du champ de saisie
  const handleInputChange = useCallback((value: string): void => {
    setInput(value);
  }, []);

  // Vérification d'authentification et chargement de la conversation
  useEffect(() => {
    const initializePage = async (): Promise<void> => {
      setIsLoading(true);

      const isAuthenticated = await checkAuthentication();
      if (isAuthenticated) {
        await loadConversation();
      }

      setIsLoading(false);
    };

    initializePage();
  }, [checkAuthentication, loadConversation]);

  // Gestion responsive de la sidebar
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Composant pour afficher un message d'erreur
  const ErrorDisplay = (): JSX.Element => (
    <div className="flex h-screen flex-col items-center justify-center bg-stone-50 p-4">
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 max-w-md text-center mb-6 shadow-sm">
        <MessageSquare className="h-8 w-8 mx-auto mb-3 text-red-500" />
        <p>{error}</p>
      </div>
      <Link href="/ai/history">
        <Button
          variant="outline"
          className="flex items-center gap-2 hover:bg-stone-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour à l'historique
        </Button>
      </Link>
    </div>
  );

  // Composant pour afficher les messages avec état vide
  const MessagesArea = (): JSX.Element => (
    <div
      ref={chatContainerRef}
      id="pdf-content"
      className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-gradient-to-b from-stone-50 to-stone-100"
    >
      {messages.length === 0 ? (
        <div className="flex justify-center items-center h-40">
          <div className="text-stone-400 text-center">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Aucun message trouvé dans cette conversation</p>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={{
              id: message._id,
              role: message.role,
              content: message.content,
              createdAt: message.createdAt,
            }}
            showTimestamp={true}
            formatDate={formatDate}
          />
        ))
      )}

      {/* Indicateur de frappe pendant l'envoi */}
      {isSubmitting && <TypingIndicator />}

      {/* Élément pour le scroll automatique */}
      <div ref={messagesEndRef} />
    </div>
  );

  // Affichage du loader pendant le chargement initial
  if (isLoading) {
    return <Loading text="Chargement de la conversation..." />;
  }

  // Affichage de l'erreur si elle existe
  if (error) {
    return <ErrorDisplay />;
  }

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar avec navigation et actions */}
      <AssistantSidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        currentTitle={conversationTitle}
        showCurrentConversation={true}
        isMobile={isMobile}
        onNewConversation={startNewSession}
        onDownloadPDF={handleDownloadPDF}
        downloadDisabled={messages.length === 0}
      />

      {/* Zone de chat principale */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header du chat */}
        <ChatHeader
          title={conversationTitle}
          subtitle={
            isSubmitting ? "En train de réfléchir..." : "Conversation active"
          }
          showMenuButton={!sidebarOpen || isMobile}
          onMenuClick={toggleSidebar}
          showHistoryButton={true}
          isMobile={isMobile}
          isLoading={isSubmitting}
        />

        {/* Bouton de fermeture de la sidebar (desktop) */}
        <SidebarToggle
          isOpen={sidebarOpen}
          onClick={toggleSidebar}
          isMobile={isMobile}
        />

        {/* Zone des messages */}
        <MessagesArea />

        {/* Zone de saisie */}
        <ChatInput
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={isSubmitting}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}
