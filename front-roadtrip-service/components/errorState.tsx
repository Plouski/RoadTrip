"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ErrorState = ({ error }: { error: string }) => {
  return (
    <div className="container py-8 md:py-16 max-w-xs sm:max-w-sm md:max-w-md mx-auto">
      <div className="bg-red-50/80 border border-red-100 rounded-lg md:rounded-xl p-6 md:p-8 text-center shadow-sm">
        <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 text-red-400 mx-auto mb-3 md:mb-4" />
        <h1 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-red-700">
          Erreur
        </h1>
        <p className="mb-4 md:mb-6 text-red-600 text-sm md:text-base">
          {error}
        </p>
        <Link href="/">
          <Button className="px-5 md:px-6 py-1.5 md:py-2 font-medium rounded-full text-sm">
            Retour à l'accueil
          </Button>
        </Link>
      </div>
    </div>
  );
};