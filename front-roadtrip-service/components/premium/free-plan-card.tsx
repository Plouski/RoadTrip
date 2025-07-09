"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Check } from "lucide-react";
import { AuthService } from "@/services/auth-service";
import Title from "../ui/title";
import Paragraph from "../ui/paragraph";

export default function FreePlanCard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await AuthService.checkAuthentication();
        setIsAuthenticated(authenticated);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="bg-white border-gray-100 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-lg transition-all duration-200 h-full flex flex-col">
      {/* Plan title */}
      <Title level={4} className="mb-4 sm:mb-5">
        Découverte
      </Title>
      
      {/* Price section */}
      <div className="mb-4 sm:mb-5">
        <div className="text-3xl sm:text-4xl font-bold text-gray-900">0€</div>
        <Paragraph size="sm">
          pour toujours
        </Paragraph>
      </div>
      
      {/* Features list */}
      <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-grow">
        {[
          "Accès aux itinéraires de base",
          "Recherche de destinations",
          "Sauvegarde de favoris",
        ].map((item, index) => (
          <li key={index} className="flex items-start">
            <div className="h-5 w-5 sm:h-6 sm:w-6 mr-3 mt-0.5 flex items-center justify-center rounded-full bg-green-100 flex-shrink-0">
              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600" />
            </div>
            <span className="text-gray-700 text-sm sm:text-base leading-relaxed">
              {item}
            </span>
          </li>
        ))}
      </ul>
      
      {/* CTA Button */}
      {!isAuthenticated && (
        <Link href="/auth" className="mt-auto">
          <Button 
            variant="outline" 
            className="w-full"
          >
            Continuer gratuitement
          </Button>
        </Link>
      )}
    </div>
  );
}