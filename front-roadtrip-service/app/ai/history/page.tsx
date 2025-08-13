"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AiService } from "@/services/ai-service";
import { useIsMobile } from "@/hooks/useMobile";
import { formatDateFR } from "@/lib/formatDateFR";

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

type Role = "user" | "assistant";

export interface Message {
  _id: string;
  role: Role;
  content: string;
  createdAt: string;
  conversationId: string;
}

export interface GroupedMessages {
  [conversationId: string]: Message[];
}

interface Conversation {
  id: string;
  messages: Message[];
  title: string;
  createdAtLabel: string;
  count: number;
  preview: Message[];
}

function useHistoryPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);

  const makeTitle = useCallback(
    (messages: Message[]) => {
      const firstUser = messages.find((m) => m.role === "user");
      if (!firstUser?.content) return "Nouvelle conversation";
      const content = firstUser.content.trim();
      const max = isMobile ? 25 : 40;
      return content.length > max ? `${content.slice(0, max)}...` : content;
    },
    [isMobile]
  );

  const makeCreatedLabel = useCallback(
    (messages: Message[]) => {
      if (!messages.length) return "Date inconnue";
      const first = [...messages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];
      return formatDateFR(first.createdAt, isMobile);
    },
    [isMobile]
  );

  const normalize = useCallback(
    (grouped: GroupedMessages): Conversation[] => {
      return Object.entries(grouped).map(([id, msgs]) => {
        const safe = (Array.isArray(msgs) ? msgs : []).filter(Boolean);
        return {
          id,
          messages: safe,
          title: makeTitle(safe),
          createdAtLabel: makeCreatedLabel(safe),
          count: safe.length,
          preview: safe.slice(0, 2),
        };
      });
    },
    [makeTitle, makeCreatedLabel]
  );

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {

      const history = await AiService.getHistory();
      if (!history || typeof history !== "object") {
        setError("Format de données non reconnu.");
        setConversations([]);
        return;
      }

      const conv = normalize(history as GroupedMessages);
      conv.sort((a, b) => {
        const la = a.messages[a.messages.length - 1];
        const lb = b.messages[b.messages.length - 1];
        return (
          new Date(lb?.createdAt || 0).getTime() -
          new Date(la?.createdAt || 0).getTime()
        );
      });

      setConversations(conv);
    } catch (e) {
      console.error(e);
      setError("Erreur lors du chargement de l'historique.");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [normalize, router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const requestDelete = useCallback((id: string) => {
    setToDeleteId(id);
    setDialogOpen(true);
  }, []);

  const cancelDelete = useCallback(() => {
    setDialogOpen(false);
    setToDeleteId(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!toDeleteId) return;
    setDeletingId(toDeleteId);
    setDialogOpen(false);

    const prev = conversations;
    setConversations((curr) => curr.filter((c) => c.id !== toDeleteId));

    try {
      await AiService.deleteConversation(toDeleteId);
      toast.success("Conversation supprimée avec succès.");
    } catch (e) {
      console.error(e);
      toast.error("Impossible de supprimer la conversation.");
      setConversations(prev);
    } finally {
      setDeletingId(null);
      setToDeleteId(null);
    }
  }, [toDeleteId, conversations]);

  return {
    state: {
      loading,
      error,
      conversations,
      dialogOpen,
      deletingId,
    },
    actions: {
      requestDelete,
      cancelDelete,
      confirmDelete,
      setDialogOpen,
    },
  };
}

const PageHeader = memo(function PageHeader({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="mb-6 md:mb-12 flex items-center justify-between md:justify-center">
      {isMobile && (
        <Link
          href="/ai"
          className="inline-flex items-center text-stone-600 hover:text-stone-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span>Retour</span>
        </Link>
      )}

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

      {isMobile && <div className="w-16" />}
    </div>
  );
});

const ErrorMessage = memo(function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 md:p-4 mb-6 md:mb-8 text-center shadow-sm">
      <AlertCircle className="h-4 w-4 inline mr-2" />
      {error}
    </div>
  );
});

const ConversationCard = memo(function ConversationCard({
  conversation,
  onDelete,
  isDeleting,
  isMobile,
}: {
  conversation: Conversation;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isMobile: boolean;
}) {
  const { id, title, createdAtLabel, count, preview } = conversation;

  return (
    <div
      className={`bg-white border border-stone-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${
        isDeleting ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <div className="p-4 md:p-6 border-b border-stone-100">
        <h2 className="text-lg md:text-xl font-medium text-stone-800 mb-1 md:mb-2 line-clamp-2">
          {title}
        </h2>
        <div className="flex items-center gap-2 text-stone-500 text-xs md:text-sm">
          <Clock className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
          <span>{createdAtLabel}</span>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-3 md:space-y-4 bg-stone-50 border-b border-stone-100">
        {preview.map((m) => (
          <div
            key={m._id}
            className={`rounded-lg p-3 md:p-4 ${
              m.role === "user"
                ? "bg-red-600 text-white"
                : "bg-white text-stone-700 border border-stone-200"
            }`}
          >
            <div className="text-xs md:text-sm mb-1 md:mb-2 font-medium">
              {m.role === "user" ? "Vous" : "Assistant ROADTRIP!"}
            </div>
            <p className="text-xs md:text-sm line-clamp-2">{m.content}</p>
          </div>
        ))}
      </div>

      <div className="p-3 md:p-4 flex justify-between items-center bg-white">
        <div className="flex gap-2 items-center">
          <div className="text-xs text-stone-500 font-light">
            {count} message{count > 1 ? "s" : ""}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full transition-colors"
            onClick={() => onDelete(id)}
            disabled={isDeleting}
            aria-label="Supprimer la conversation"
          >
            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </div>

        <Link
          href={`/ai/conversation/${id}`}
          className="flex items-center text-red-500 hover:text-red-700 transition-colors text-xs md:text-sm font-medium group"
        >
          {isMobile ? "Voir" : "Voir la conversation"}
          <ArrowRight className="ml-1 h-3 w-3 md:h-4 md:w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
});

const EmptyState = memo(function EmptyState() {
  return (
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
});

export default function HistoryPage() {
  const isMobile = useIsMobile();
  const {
    state: { loading, error, conversations, dialogOpen, deletingId },
    actions: { requestDelete, cancelDelete, confirmDelete, setDialogOpen },
  } = useHistoryPage();

  if (loading) {
    return <Loading text="Chargement de l'historique..." />;
  }

  const hasConversations = conversations.length > 0;

  return (
    <div className="min-h-screen bg-stone-50 py-8 md:py-16">
      <div className="container max-w-5xl px-4 md:px-6">
        <PageHeader isMobile={isMobile} />
        <ErrorMessage error={error} />

        {hasConversations ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {conversations.map((c) => (
              <ConversationCard
                key={c.id}
                conversation={c}
                onDelete={requestDelete}
                isDeleting={deletingId === c.id}
                isMobile={isMobile}
              />
            ))}
          </div>
        ) : (
          !error && <EmptyState />
        )}
      </div>

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
              onClick={cancelDelete}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white text-sm"
              onClick={confirmDelete}
              disabled={!!deletingId}
            >
              {deletingId ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
