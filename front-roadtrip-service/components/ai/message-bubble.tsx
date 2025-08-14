"use client";

import { Bot, User, Download } from "lucide-react";
import { memo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface MessageBubbleProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt?: string;
  };
  showTimestamp?: boolean;
  formatDate?: (date: string) => string;
}

export const MessageBubble = memo(
  ({ message, showTimestamp = true, formatDate }: MessageBubbleProps) => {
    
    // Fonction pour exporter un message spécifique en PDF
    const exportMessageToPDF = useCallback(async () => {
      try {
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        let currentY = margin;

        // En-tête du document
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("ROADTRIP Assistant - Réponse", margin, currentY);
        currentY += 10;

        // Date et heure
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(128, 128, 128);
        const now = new Date();
        const dateStr = `Généré le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR")}`;
        pdf.text(dateStr, margin, currentY);
        currentY += 15;

        // Ligne de séparation
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 15;

        // Type de message
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        
        if (message.role === "user") {
          pdf.setTextColor(0, 100, 200);
          pdf.text("Votre question :", margin, currentY);
        } else {
          pdf.setTextColor(200, 0, 100);
          pdf.text("Réponse de l'assistant :", margin, currentY);
        }
        
        currentY += 10;
        pdf.setTextColor(0, 0, 0);

        // Contenu du message
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        
        // Nettoyer le contenu
        let cleanContent = message.content
          .replace(/\*\*(.*?)\*\*/g, '$1')     // **bold** → texte normal
          .replace(/\*(.*?)\*/g, '$1')         // *italic* → texte normal  
          .replace(/`(.*?)`/g, '$1')           // `code` → texte normal
          .replace(/#{1,6}\s+/g, '')           // # headers → sans #
          .replace(/^\s*[-*+]\s+/gm, '• ')     // listes → puces
          .replace(/\n\n+/g, '\n\n')           // normaliser sauts de ligne
          .replace(/[^\w\s\u00C0-\u017F.,;:!?\-•\n]/g, ''); // Supprimer tous les émojis et caractères spéciaux

        // Diviser le texte en lignes
        const lines = pdf.splitTextToSize(cleanContent, contentWidth);
        
        // Ajouter chaque ligne avec gestion de pagination
        for (let i = 0; i < lines.length; i++) {
          if (currentY > 270) { // Nouvelle page si nécessaire
            pdf.addPage();
            currentY = margin;
          }
          
          pdf.text(lines[i], margin, currentY);
          currentY += 6;
        }

        // Pied de page
        const pageCount = pdf.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(128, 128, 128);
          pdf.text(`Page ${i}/${pageCount}`, pageWidth - margin - 15, 285);
          pdf.text("ROADTRIP Assistant", margin, 285);
        }

        // Nom du fichier basé sur le contenu
        const contentPreview = message.content
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .substring(0, 30)
          .replace(/\s+/g, '-')
          .toLowerCase();
        
        const fileName = `roadtrip-${message.role}-${contentPreview || 'message'}-${Date.now()}.pdf`;
        
        pdf.save(fileName);
        toast.success(`✅ Message exporté en PDF`);
        
      } catch (error) {
        console.error("Erreur lors de l'export PDF:", error);
        toast.error("❌ Erreur lors de l'export PDF");
      }
    }, [message]);

    return (
      <div
        className={`group flex ${
          message.role === "user" ? "justify-end" : "justify-start"
        } items-start gap-3`}
      >
        {/* Avatar assistant */}
        {message.role === "assistant" && (
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <Bot className="h-5 w-5 text-red-600" />
          </div>
        )}

        {/* Conteneur pour la bulle + bouton PDF */}
        <div className="flex flex-col">
          {/* Bulle de message */}
          <div
            className={`max-w-xs sm:max-w-md md:max-w-2xl p-4 md:p-5 rounded-2xl text-sm md:text-base whitespace-pre-wrap leading-relaxed shadow-sm ${
              message.role === "assistant"
                ? "bg-white text-stone-800 border border-stone-200"
                : "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-md"
            }`}
          >
            {message.role === "assistant" ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-2">{children}</ul>
                  ),
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold my-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold my-2">{children}</h2>
                  ),
                  code: ({ children }) => (
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                      {children}
                    </pre>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              message.content
            )}

            {showTimestamp && message.createdAt && formatDate && (
              <div
                className={`mt-2 text-xs ${
                  message.role === "assistant" ? "text-stone-400" : "text-red-100"
                }`}
              >
                {formatDate(message.createdAt)}
              </div>
            )}
          </div>

          {/* Bouton PDF pour les messages de l'assistant */}
          {message.role === "assistant" && (
            <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={exportMessageToPDF}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs 
                          bg-white/90 hover:bg-white border border-gray-200 
                          rounded-md transition-all duration-200 hover:shadow-sm
                          text-gray-600 hover:text-gray-800 backdrop-blur-sm"
                title="Exporter ce message en PDF"
              >
                <Download className="w-3 h-3" />
                PDF
              </button>
            </div>
          )}
        </div>

        {/* Avatar utilisateur */}
        {message.role === "user" && (
          <div className="flex-shrink-0 w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-stone-600" />
          </div>
        )}
      </div>
    );
  }
);

MessageBubble.displayName = "MessageBubble";