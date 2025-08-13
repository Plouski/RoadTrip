"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AuthService } from "@/services/auth-service";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  User,
  Heart,
  Map,
  Home,
  LogOut,
  UserCircle,
  Settings,
  Sparkles,
} from "lucide-react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = userRole === "admin";
  const isPremium = userRole === "premium";

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const authenticated = await AuthService.checkAuthentication();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          const userData = await AuthService.getProfile();
          setUserRole(userData?.role || "user");
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error("Erreur d'authentification :", error);
        setIsAuthenticated(false);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname]);

  // Gestion des redirections de sécurité
  useEffect(() => {
    if (isLoading) return; // Attendre que l'auth soit vérifiée

    // Si connecté et sur la page d'accueil -> redirection vers explorer
    if (isAuthenticated && pathname === '/') {
      router.push('/explorer');
      return;
    }

    // Si pas connecté et sur une page protégée -> redirection vers accueil
    if (!isAuthenticated && (pathname.startsWith('/profile') || pathname.startsWith('/favorites') || pathname.startsWith('/admin') || pathname.startsWith('/ai'))) {
      router.push('/');
      return;
    }

    // Si connecté mais pas admin et sur /admin -> redirection vers explorer
    if (isAuthenticated && !isAdmin && pathname.startsWith('/admin')) {
      router.push('/explorer');
      return;
    }

    // Si connecté mais pas premium/admin et sur /ai -> redirection vers premium
    if (isAuthenticated && !isPremium && !isAdmin && pathname.startsWith('/ai')) {
      router.push('/premium');
      return;
    }
  }, [isAuthenticated, isAdmin, isPremium, pathname, router, isLoading]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setUserRole(null);
    await AuthService.logout();
    router.push("/");
  };

  const handleNavigation = (href: string) => {
    // Si connecté et tentative d'aller vers accueil -> redirection vers explorer
    if (isAuthenticated && href === '/') {
      router.push('/explorer');
      return;
    }

    // Vérifications avant navigation
    if (!isAuthenticated && (href.startsWith('/profile') || href.startsWith('/favorites') || href.startsWith('/admin') || href.startsWith('/ai'))) {
      router.push('/');
      return;
    }

    if (isAuthenticated && !isAdmin && href.startsWith('/admin')) {
      router.push('/explorer');
      return;
    }

    if (isAuthenticated && !isPremium && !isAdmin && href.startsWith('/ai')) {
      router.push('/premium');
      return;
    }

    router.push(href);
  };

  const navItems = [
    { name: "Accueil", href: "/", icon: Home, showOnlyWhenNotAuth: true },
    { name: "Explorer", href: "/explorer", icon: Map },
    { name: "Favoris", href: "/favorites", icon: Heart, requiresAuth: true },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.showOnlyWhenNotAuth && isAuthenticated) return false;
    return true;
  });

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b backdrop-blur transition-all duration-200",
        scrolled ? "bg-white/95 shadow-sm" : "bg-white border-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => handleNavigation("/")}
            className="flex items-center"
          >
            <Image
              src="/logo.png"
              alt="ROADTRIP!"
              width={180}
              height={50}
              className="hidden sm:block h-10 w-auto"
              priority
            />
            <Image
              src="/logo.png"
              alt="ROADTRIP!"
              width={40}
              height={40}
              className="block sm:hidden h-8 w-auto"
              priority
            />
          </button>

          <nav className="hidden md:flex gap-6">
            {filteredNavItems.map(({ name, href, icon: Icon }) => (
              <button
                key={href}
                onClick={() => handleNavigation(href)}
                className={cn(
                  "flex items-center text-sm font-medium transition-colors relative py-1",
                  pathname === href
                    ? "text-primary"
                    : "text-gray-600 hover:text-primary"
                )}
              >
                <Icon className="mr-1 h-4 w-4" />
                {name}
                {pathname === href && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleNavigation("/admin")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Admin
            </Button>
          )}

          {isLoading ? (
            <div className="h-9 w-24 rounded-md bg-gray-100 animate-pulse" />
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserCircle className="mr-2 h-4 w-4 text-primary" />
                  Compte
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleNavigation("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigation("/favorites")}>
                  <Heart className="mr-2 h-4 w-4" />
                  Favoris
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleNavigation("/auth")}
            >
              <User className="mr-2 h-4 w-4" />
              Connexion
            </Button>
          )}

          {!isAuthenticated || (!isPremium && !isAdmin) ? (
            <Button 
              className="bg-gradient-to-r from-primary to-primary-700 hover:opacity-90 shadow-sm"
              onClick={() => handleNavigation("/premium")}
            >
              Premium
            </Button>
          ) : (
            <Button 
              className="bg-gradient-to-r from-primary to-primary-700 hover:opacity-90 shadow-sm"
              onClick={() => handleNavigation("/ai")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              IA
            </Button>
          )}
        </div>

        <div className="md:hidden">
          <button
            type="button"
            onClick={toggleMenu}
            className="p-2 rounded-md hover:bg-gray-100 transition"
            aria-label="Menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-4 shadow-sm"
        >
          {filteredNavItems.map(({ name, href, icon: Icon }) => (
            <button
              key={href}
              onClick={() => {
                handleNavigation(href);
                setIsMenuOpen(false);
              }}
              className={cn(
                "flex items-center text-sm font-medium gap-2 transition-colors w-full text-left",
                pathname === href
                  ? "text-primary"
                  : "text-gray-700 hover:text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {name}
            </button>
          ))}

          <hr />

          {isLoading ? (
            <div className="h-8 w-24 rounded-md bg-gray-100 animate-pulse" />
          ) : isAuthenticated ? (
            <>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    handleNavigation("/admin");
                    setIsMenuOpen(false);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              )}
              <button
                onClick={() => {
                  handleNavigation("/profile");
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 text-sm w-full text-left"
              >
                <User className="h-4 w-4" /> Mon profil
              </button>
              <button
                onClick={() => {
                  handleNavigation("/favorites");
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 text-sm w-full text-left"
              >
                <Heart className="h-4 w-4" /> Favoris
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 text-sm text-red-600 hover:underline w-full text-left"
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>

              {!isPremium && !isAdmin ? (
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-primary-700 hover:opacity-90 mt-3"
                  onClick={() => {
                    handleNavigation("/premium");
                    setIsMenuOpen(false);
                  }}
                >
                  Premium
                </Button>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-primary-700 hover:opacity-90 mt-3"
                  onClick={() => {
                    handleNavigation("/ai");
                    setIsMenuOpen(false);
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  IA
                </Button>
              )}
            </>
          ) : (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                handleNavigation("/auth");
                setIsMenuOpen(false);
              }}
            >
              <User className="mr-2 h-4 w-4" />
              Connexion
            </Button>
          )}
        </div>
      )}
    </header>
  );
}