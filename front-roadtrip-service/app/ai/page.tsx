"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { AiService } from "@/services/ai-service";
import { AuthService } from "@/services/auth-service";
import { formatAiResponse } from "@/lib/formatAiResponse";
import { useIsMobile } from "@/hooks/use-mobile";
import Loading from "@/components/ui/loading";
import { AssistantSidebar } from "@/components/assistant/assistant-sidebar";
import { ChatHeader } from "@/components/assistant/chat-header";
import { SidebarToggle } from "@/components/assistant/sidebar-toggle";
import { MessageBubble } from "@/components/assistant/message-bubble";
import { TypingIndicator } from "@/components/assistant/typing-indicator";
import { ChatInput } from "@/components/assistant/chat-input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(() =>
    crypto.randomUUID()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Fait défiler automatiquement vers le bas des messages
  const scrollToBottom = useCallback((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Vérifie l'authentification et les permissions de l'utilisateur
  const checkAuthentication = useCallback(async (): Promise<void> => {
    setIsCheckingAuth(true);
    try {
      const { isAuthenticated, role } =
        await AuthService.checkAuthenticationAndRole();

      // Redirection si non authentifié
      if (!isAuthenticated) {
        console.log("Utilisateur non authentifié, redirection vers /auth");
        router.push("/auth");
        return;
      }

      // Vérification des rôles autorisés (admin ou premium)
      if (role !== "premium" && role !== "admin") {
        console.log(`Rôle ${role} non autorisé, redirection vers /premium`);
        router.push("/premium");
        return;
      }

      console.log(`Accès autorisé pour le rôle: ${role}`);

      // Initialisation du message de bienvenue
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Bonjour ! Je suis votre assistant ROADTRIP! \nPosez-moi vos questions sur vos prochains voyages !",
        },
      ]);

      // Focus automatique sur le champ de saisie
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      console.error(
        "Erreur lors de la vérification de l'authentification:",
        error
      );
      router.push("/auth");
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Démarre une nouvelle session de conversation
  const startNewSession = useCallback((): void => {
    const newConversationId = crypto.randomUUID();
    setConversationId(newConversationId);

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "✨ Nouvelle session démarrée !\nJe suis prêt à vous aider à planifier votre roadtrip !",
      },
    ]);

    setTimeout(() => inputRef.current?.focus(), 100);
    if (isMobile) setSidebarOpen(false);

    toast.success("🎉 Nouvelle conversation démarrée");
  }, [isMobile]);

  // Gère l'envoi d'un nouveau message
  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      // Créer le message utilisateur
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
      };

      // Ajouter le message à l'état et vider le champ de saisie
      setMessages((prev) => [...prev, userMessage]);
      const currentInput = input;
      setInput("");
      setIsLoading(true);

      // Dans handleSubmit, remplacez la section IA par :

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
            formatted = result; // fallback si ce n’est pas du JSON
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
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: formatted,
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
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `❌ **Erreur technique**\n\nDétails : ${
            error instanceof Error ? error.message : "Erreur inconnue"
          }\n\nVeuillez réessayer dans quelques instants.`,
        };

        setMessages((prev) => [...prev, errorMessage]);
        toast.error("Erreur lors de l'appel à l'IA");
      } finally {
        setIsLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    },
    [input, isLoading, conversationId, scrollToBottom]
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
        `roadtrip-conversation-${new Date().toISOString().split("T")[0]}.pdf`
      );

      if (isMobile) setSidebarOpen(false);
      toast.success("PDF téléchargé avec succès");
    } catch (error) {
      console.error("Erreur lors de la création du PDF:", error);
      toast.error("Impossible de générer le PDF");
    }
  }, [isMobile]);

  // Gère l'ouverture/fermeture de la sidebar
  const toggleSidebar = useCallback((): void => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  // Gère le changement de valeur du champ de saisie
  const handleInputChange = useCallback((value: string): void => {
    setInput(value);
  }, []);

  // Vérification d'authentification au chargement
  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  // Gestion responsive de la sidebar
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Affichage du loader pendant la vérification d'authentification
  if (isCheckingAuth) {
    return <Loading text="Chargement de l'assistant..." />;
  }

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar avec navigation et actions */}
      <AssistantSidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        isMobile={isMobile}
        onNewConversation={startNewSession}
        onDownloadPDF={handleDownloadPDF}
        downloadDisabled={messages.length <= 1}
      />

      {/* Zone de chat principale */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header du chat */}
        <ChatHeader
          title="Assistant ROADTRIP!"
          showMenuButton={!sidebarOpen || isMobile}
          onMenuClick={toggleSidebar}
          showHistoryButton={true}
          isMobile={isMobile}
          isLoading={isLoading}
        />

        {/* Bouton de fermeture de la sidebar (desktop) */}
        <SidebarToggle
          isOpen={sidebarOpen}
          onClick={toggleSidebar}
          isMobile={isMobile}
        />

        {/* Zone des messages */}
        <div
          ref={chatContainerRef}
          id="pdf-content"
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-gradient-to-b from-stone-50 to-stone-100"
        >
          {/* Affichage des messages */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              showTimestamp={false}
            />
          ))}

          {/* Indicateur de frappe pendant le chargement */}
          {isLoading && <TypingIndicator />}

          {/* Élément pour le scroll automatique */}
          <div ref={messagesEndRef} />
        </div>

        {/* Zone de saisie */}
        <ChatInput
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={isLoading}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}
