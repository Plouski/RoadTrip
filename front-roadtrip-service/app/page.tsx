'use client'

import { useEffect, useState } from "react"
import dynamic from 'next/dynamic'
import { useMounted } from "@/hooks/useMounted"
import Hero from "@/components/accueil/hero"
import { RoadtripService } from "@/services/roadtrip-service"
import Loading from "@/components/ui/loading"

const PremiumFeatures = dynamic(() => import("@/components/accueil/premium-features"), {
  ssr: false,
  loading: () => <Loading text="Chargement des fonctionnalités..." />
})

const HowItWorks = dynamic(() => import("@/components/accueil/how-it-works"), {
  ssr: false,
  loading: () => <Loading text="Chargement des étapes..." />
})

const PopularRoadtrips = dynamic(() => import("@/components/accueil/popular-roadtrips"), {
  ssr: false,
  loading: () => <Loading text="Chargement des roadtrips populaires..." />
})

export default function Home() {
  const mounted = useMounted()
  const [roadtrips, setRoadtrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRoadtrips = async () => {
    if (!mounted) return
    
    setLoading(true)
    try {
      const popularTrips = await RoadtripService.getPopularRoadtrips()
      
      setRoadtrips(popularTrips || [])
    } catch (error) {
      console.error("❌ Erreur lors du chargement des roadtrips:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mounted) {
      fetchRoadtrips()
    }
  }, [mounted])

  return (
    <div className="overflow-hidden">
      <Hero />
        {mounted ? (
          <>
            <PopularRoadtrips roadtrips={roadtrips} loading={loading} />
            <PremiumFeatures />
            <HowItWorks />
          </>
        ) : (
          <Loading text="Chargement..." />
        )}
    </div>
  )
}