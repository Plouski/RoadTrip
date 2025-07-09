import Link from "next/link"
import Title from "@/components/ui/title"
import Paragraph from "@/components/ui/paragraph"

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  const footerSections = [
    {
      title: "Découvrir",
      links: [
        { href: "/explorer", label: "Explorer" },
      ]
    },
    {
      title: "Compte", 
      links: [
        { href: "/auth", label: "Connexion" },
        { href: "/auth", label: "Inscription" },
        { href: "/favorites", label: "Mes favoris" },
        { href: "/premium", label: "Abonnement Premium" },
      ]
    },
    {
      title: "Aide",
      links: [
        { href: "/contact", label: "Contact" },
        { href: "/privacy", label: "Confidentialité" },
        { href: "/terms", label: "Conditions d'utilisation" },
      ]
    }
  ]

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Contenu principal du footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
          {/* Section marque */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-4">
            <Title level={3} className="text-primary">
              ROADTRIP!
            </Title>
            <Paragraph size="sm" className="max-w-sm">
              Votre compagnon idéal pour planifier des road trips inoubliables à travers le monde.
            </Paragraph>
          </div>
          
          {/* Sections de liens */}
          {footerSections.map((section, index) => (
            <div key={section.title} className="space-y-4">
              <Title level={4}>
                {section.title}
              </Title>
              <nav>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link 
                        href={link.href} 
                        className="text-gray-600 hover:text-primary transition-colors duration-200 text-sm block py-1"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          ))}
        </div>
        
        {/* Séparateur et copyright */}
        <div className="border-t border-gray-200 mt-8 sm:mt-12 pt-6 sm:pt-8">
          <Paragraph size="sm" align="center" className="text-gray-500">
            © {currentYear} RoadTrip! Tous droits réservés.
          </Paragraph>
        </div>
      </div>
    </footer>
  )
}