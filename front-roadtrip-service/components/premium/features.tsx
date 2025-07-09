import { LucideIcon } from "lucide-react"
import Title from "../ui/title"
import Paragraph from "../ui/paragraph"

export type FeatureProps = {
  icon: LucideIcon
  title: string
  description: string
}

function FeatureCard({ feature }: { feature: FeatureProps }) {
  const Icon = feature.icon

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md border border-gray-100 group hover:shadow-lg transition-all duration-200 h-full">
      {/* Icon container responsive */}
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gray-50 flex items-center justify-center mb-4 sm:mb-5">
        <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-red-600" />
      </div>
      
      {/* Title responsive */}
      <Title level={4} className="mb-2">
        {feature.title}
      </Title>
      
      {/* Description responsive */}
      <Paragraph size="sm">
        {feature.description}
      </Paragraph>
    </div>
  )
}

export default function FeaturesSection({ features }: { features: FeatureProps[] }) {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gray-50">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        {/* Header responsive */}
        <div className="text-center mb-12 sm:mb-16">
          <Title level={2} className="mb-3 sm:mb-4">
            Fonctionnalités exclusives
          </Title>
          <Paragraph 
            size="base" 
            align="center" 
            className="max-w-xl sm:max-w-2xl mx-auto px-4 sm:px-0"
          >
            Nos abonnés premium bénéficient d'un accès complet à des fonctionnalités exclusives conçues pour rendre chaque voyage inoubliable.
          </Paragraph>
        </div>

        {/* Grid responsive - mobile: 1 col, tablet: 2 cols, desktop: 3 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  )
}