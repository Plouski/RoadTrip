import { Check } from "lucide-react";
import { Button } from "../ui/button";
import Title from "../ui/title";
import Paragraph from "../ui/paragraph";

interface PricingFeature {
  title: string;
}

interface PremiumPlanCardProps {
  type: "monthly" | "annual";
  price: string;
  period: string;
  regularPrice?: string;
  savings?: string;
  features: PricingFeature[];
  onSubscribe: () => void;
}

export default function PremiumPlanCard({
  type,
  price,
  period,
  regularPrice,
  savings,
  features,
  onSubscribe,
}: PremiumPlanCardProps) {
  return (
    <div className="bg-white border-2 border-red-200 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-200 relative h-full flex flex-col">
      {/* Popular badge */}
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full whitespace-nowrap">
        {type === "monthly" ? "Recommandé" : "Économie de 25%"}
      </div>
      
      {/* Plan title */}
      <Title level={4} className="mb-4 sm:mb-5 mt-2 sm:mt-3">
        Premium {type === "monthly" ? "Mensuel" : "Annuel"}
      </Title>

      {/* Price section */}
      <div className="mb-4 sm:mb-5">
        <div className="text-3xl sm:text-4xl font-bold text-gray-900">{price}</div>
        <Paragraph size="sm">
          {period}
        </Paragraph>
        
        {/* Savings info for annual plan */}
        {regularPrice && savings && (
          <div className="mt-2 text-sm sm:text-base">
            <span className="line-through text-gray-400 mr-2">{regularPrice}</span>
            <span className="text-green-600 font-medium">{savings}</span>
          </div>
        )}
      </div>

      {/* Features list */}
      <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-grow">
        {features.map(({ title }, index) => (
          <li key={index} className="flex items-start">
            <div className="h-5 w-5 sm:h-6 sm:w-6 mr-3 mt-0.5 flex items-center justify-center rounded-full bg-red-100 flex-shrink-0">
              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-600" />
            </div>
            <span className="text-gray-700 text-sm sm:text-base leading-relaxed">
              {title}
            </span>
          </li>
        ))}
      </ul>
      
      {/* CTA Button */}
      <Button
        onClick={onSubscribe}
        className="w-full"
      >
        {type === "monthly" ? "S'abonner maintenant" : "S'abonner à l'année"}
      </Button>
    </div>
  );
}