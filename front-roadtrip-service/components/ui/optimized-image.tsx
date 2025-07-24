"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  fallbackSrc?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
  fill = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  fallbackSrc = "/images/roadtrip-placeholder.jpg",
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    console.warn(`❌ Erreur de chargement image : ${imgSrc}`);
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    } else {
      setIsError(true);
    }
  };

  const handleLoad = () => setIsLoading(false);

  if (isError) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        role="img"
        aria-label="Image non disponible"
      >
        <div className="text-center text-gray-400">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Image non disponible</p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      fill={fill}
      sizes={sizes}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      quality={85}
      className={`
        transition-all duration-300 ease-in-out
        ${isLoading ? "opacity-0 scale-105" : "opacity-100 scale-100"}
        ${fill ? "object-cover" : ""}
        ${className}
      `}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
