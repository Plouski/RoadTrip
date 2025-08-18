"use client";

import { LoaderCircle } from "lucide-react";

interface LoadingProps {
  text?: string;
  className?: string;
}

export default function Loading({ 
  text = "Chargement...", 
  className = "" 
}: LoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-10 text-gray-500 ${className}`}
      role="status"
      aria-label={text}
    >
      <LoaderCircle 
        className="h-10 w-10 animate-spin text-red-600 mb-5" 
        aria-hidden="true"
      />
      <p className="text-sm sm:text-base md:text-lg text-center max-w-sm">
        {text}
        <span className="sr-only"> - Veuillez patienter</span>
      </p>
    </div>
  );
}