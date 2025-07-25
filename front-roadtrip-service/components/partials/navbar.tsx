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
    router.push("/auth");
  };

  const navItems = [
    { name: "Accueil", href: "/", icon: Home, hideWhenAuth: true },
    { name: "Explorer", href: "/explorer", icon: Map },
    { name: "Favoris", href: "/favorites", icon: Heart, requiresAuth: true },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.hideWhenAuth && isAuthenticated) return false;
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
          <Link href="/" className="flex items-center">
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
          </Link>

          <nav className="hidden md:flex gap-6">
            {filteredNavItems.map(({ name, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
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
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
            </Link>
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
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/favorites" className="flex items-center">
                    <Heart className="mr-2 h-4 w-4" />
                    Favoris
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button variant="outline" size="sm">
                <User className="mr-2 h-4 w-4" />
                Connexion
              </Button>
            </Link>
          )}

          {!isAuthenticated || (!isPremium && !isAdmin) ? (
            <Link href="/premium">
              <Button className="bg-gradient-to-r from-primary to-primary-700 hover:opacity-90 shadow-sm">
                Premium
              </Button>
            </Link>
          ) : (
            <Link href="/ai">
              <Button className="bg-gradient-to-r from-primary to-primary-700 hover:opacity-90 shadow-sm">
                <Sparkles className="mr-2 h-4 w-4" />
                IA
              </Button>
            </Link>
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
            <Link
              key={href}
              href={href}
              onClick={() => setIsMenuOpen(false)}
              className={cn(
                "flex items-center text-sm font-medium gap-2 transition-colors",
                pathname === href
                  ? "text-primary"
                  : "text-gray-700 hover:text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {name}
            </Link>
          ))}

          <hr />

          {isLoading ? (
            <div className="h-8 w-24 rounded-md bg-gray-100 animate-pulse" />
          ) : isAuthenticated ? (
            <>
              {isAdmin && (
                <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 text-sm"
              >
                <User className="h-4 w-4" /> Mon profil
              </Link>
              <Link
                href="/favorites"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 text-sm"
              >
                <Heart className="h-4 w-4" /> Favoris
              </Link>
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 text-sm text-red-600 hover:underline"
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>

              {!isPremium && !isAdmin ? (
                <Link href="/premium" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-primary to-primary-700 hover:opacity-90 mt-3">
                    Premium
                  </Button>
                </Link>
              ) : (
                <Link href="/ai" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-primary to-primary-700 hover:opacity-90 mt-3">
                    <Sparkles className="mr-2 h-4 w-4" />
                    IA
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <Link href="/auth" onClick={() => setIsMenuOpen(false)}>
              <Button variant="outline" className="w-full">
                <User className="mr-2 h-4 w-4" />
                Connexion
              </Button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
