'use client'

import { useEffect, useState } from "react"
import Hero from "@/components/accueil/hero"
import PremiumFeatures from "@/components/accueil/premium-features"
import { RoadtripService } from "@/services/roadtrip-service"
import HowItWorks from "@/components/accueil/how-it-works"
import PopularRoadtrips from "@/components/accueil/popular-roadtrips"

export default function Home() {
  const [roadtrips, setRoadtrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRoadtrips = async () => {
    setLoading(true)
    try {

      const popularTrips = await RoadtripService.getPopularRoadtrips()

      setRoadtrips(popularTrips)
    } catch (error) {
      console.error("Erreur lors du chargement des roadtrips :", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoadtrips()
  }, [])

  return (
    <div className="overflow-hidden">
      <Hero />
      <div className="py-10 px-5">
        <PopularRoadtrips
          roadtrips={roadtrips}
          loading={loading}    
        />
      <PremiumFeatures />
      <HowItWorks />
      </div>
    </div>
  )
}