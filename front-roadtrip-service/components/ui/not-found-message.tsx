import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import React from "react"

type NotFoundMessageProps = {
  title?: string
  message?: string
  linkHref?: string
  linkLabel?: string 
}

export const NotFoundMessage: React.FC<NotFoundMessageProps> = ({
  title = "Contenu non trouvé",
  message = "La ressource demandée n'existe pas ou a été supprimée.",
  linkHref = "/",
  linkLabel = "Retour à l'accueil",
}) => {
  return (
    <div className="container py-8 md:py-16 max-w-xs sm:max-w-sm md:max-w-md mx-auto">
      <div className="bg-primary/5 border border-primary/10 rounded-lg md:rounded-xl p-6 md:p-8 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-3 md:mb-4">
          <TriangleAlert className="h-6 w-6 md:h-7 md:w-7 text-primary/80" />
        </div>
        <h1 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800">
          {title}
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed sm:leading-relaxed mb-5">
          {message}
        </p>
        <Link href={linkHref}>
          <Button>{linkLabel}</Button>
        </Link>
      </div>
    </div>
  )
}