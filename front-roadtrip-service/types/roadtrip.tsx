export interface PointOfInterest {
  name: string;
  description: string;
  image: string;
}

export interface ItineraryStep {
  day: number;
  title: string;
  description: string;
  overnight: boolean;
}

export interface Roadtrip {
  _id?: string;
  title: string;
  image: string;
  country: string;
  region?: string;
  duration: number;
  budget: number | { amount: number; currency?: string };
  tags: string[];
  description: string;
  isPremium: boolean;
  bestSeason: string;
  pointsOfInterest: PointOfInterest[];
  itinerary: ItineraryStep[];
  isPublished: boolean;
}
