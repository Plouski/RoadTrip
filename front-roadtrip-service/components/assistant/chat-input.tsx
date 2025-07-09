"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forwardRef, memo } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
  isMobile: boolean;
}

export const ChatInput = memo(forwardRef<HTMLInputElement, ChatInputProps>(
  ({ value, onChange, onSubmit, disabled = false, placeholder, isMobile }, ref) => {
    const defaultPlaceholder = isMobile
      ? "Votre question sur le voyage..."
      : "Posez votre question sur votre voyage (destination, budget, durée...)";

    return (
      <footer className="border-t border-stone-200 bg-white/95 backdrop-blur-sm p-4 md:p-6 shadow-lg">
        <form onSubmit={onSubmit} className="flex items-center gap-3 max-w-4xl mx-auto">
          <Input
            ref={ref}
            placeholder={placeholder || defaultPlaceholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 text-sm md:text-base py-4 md:py-6 px-3 md:px-4 rounded-xl border border-stone-200 focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm bg-stone-50"
          />

          <Button
            type="submit"
            disabled={disabled || !value.trim()}
            className="bg-red-500 hover:bg-red-600 text-white p-4 md:p-6 rounded-xl transition-all shadow"
          >
            <Send className="h-4 md:h-5 w-4 md:w-5" />
          </Button>
        </form>

        {/* Indicateur de statut */}
        <div className="text-center mt-3">
          <p className="text-xs text-stone-400">
            {disabled
              ? "Traitement en cours..."
              : "Tapez votre question et appuyez sur Entrée"}
          </p>
        </div>
      </footer>
    );
  }
));