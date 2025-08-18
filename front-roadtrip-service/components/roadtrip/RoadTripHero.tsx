"use client";

import { Badge } from "@/components/ui/badge";
import Title from "@/components/ui/title";
import Paragraph from "@/components/ui/paragraph";
import { MapPin, Sparkles } from "lucide-react";

type Props = {
  image: string;
  title: string;
  description?: string;
  country: string;
  region?: string;
  isPremium?: boolean;
  canAccessPremium?: boolean;
  tags?: string[];
};

export default function RoadTripHero({
  image,
  title,
  description,
  country,
  region,
  isPremium,
  canAccessPremium,
  tags = [],
}: Props) {
  return (
    <section
      aria-label={`Hero: ${title}`}
      className="relative w-full h-[420px] sm:h-[520px] lg:h-[580px] overflow-hidden"
    >
      <img
        src={image}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="
        absolute inset-0
        md:bg-gradient-to-r md:from-black/80 md:via-black/45 md:to-transparent
        bg-gradient-to-t from-black/85 via-black/50 to-transparent
      " />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 100%, transparent 40%, rgba(0,0,0,0.35) 100%)",
        }}
      />

      <div className="container relative z-10 h-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-end pb-6 sm:pb-8 lg:pb-12">
          <div className="
            max-w-3xl md:max-w-4xl text-white
            bg-black/35 backdrop-blur-[2px] rounded-xl p-4 sm:p-6
            md:bg-transparent md:backdrop-blur-0 md:p-0
          ">
            {tags.length > 0 && (
              <div className="mb-3 sm:mb-4 flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <Badge
                    key={`${tag}-${i}`}
                    className="bg-white/15 text-white border border-white/20 hover:bg-white/20"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <Title
              level={1}
              className="mb-3 sm:mb-4 max-w-4xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
            >
              {title}
            </Title>

            {description && (
              <div className="relative mb-3 sm:mb-4 max-w-2xl">
                <Paragraph
                  size="base"
                  className="text-white/90 whitespace-pre-line drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)] line-clamp-4 md:line-clamp-none"
                >
                  {description}
                </Paragraph>
                <div className="absolute -bottom-1 left-0 right-0 h-6 bg-gradient-to-t from-black/50 to-transparent pointer-events-none md:hidden" />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center text-sm sm:text-base font-medium">
                <MapPin className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white/90 shrink-0" />
                <span className="drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
                  {country}
                  {region ? ` • ${region}` : ""}
                </span>
              </div>

              {isPremium && (
                <Badge
                  className={`
                    w-fit border-none text-white
                    ring-1 ring-white/20
                    ${canAccessPremium ? "bg-emerald-500/90" : "bg-red-600/90"}
                  `}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {canAccessPremium ? "Premium débloqué" : "Premium"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
