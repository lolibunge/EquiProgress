
// src/components/Navbar.tsx
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signOutUser } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { Icons } from './icons';
import { Menu, LogOut, UserCircle, Library, History, LogIn, UserPlus, Home, BookOpen, Horse } from 'lucide-react'; // Added Horse

export default function Navbar() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
    }
    return name[0].toUpperCase();
  }

  const NavLinks = ({ isMobile = false }: { isMobile?: boolean }) => {
    const linksContent = (
      <>
        <Button variant={isMobile ? "outline" : "ghost"} asChild className={isMobile ? "w-full justify-start" : ""}>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Inicio
          </Link>
        </Button>
        {currentUser && (
          <>
            <Button variant={isMobile ? "outline" : "ghost"} asChild className={isMobile ? "w-full justify-start" : ""}>
              <Link href="/horses">
                <Icons.horse className="mr-2 h-4 w-4" /> {/* Updated Icon */}
                Caballos
              </Link>
            </Button>
            <Button variant={isMobile ? "outline" : "ghost"} asChild className={isMobile ? "w-full justify-start" : ""}>
              <Link href="/plans">
                <BookOpen className="mr-2 h-4 w-4" />
                Planes
              </Link>
            </Button>
            {userProfile?.role === 'admin' && (
              <Button variant={isMobile ? "outline" : "ghost"} asChild className={isMobile ? "w-full justify-start" : ""}>
                <Link href="/library/exercises">
                  <Library className="mr-2 h-4 w-4" />
                  Ejercicios
                </Link>
              </Button>
            )}
            <Button variant={isMobile ? "outline" : "ghost"} asChild className={isMobile ? "w-full justify-start" : ""}>
              <Link href="/horse-history">
                <History className="mr-2 h-4 w-4" />
                Historial
              </Link>
            </Button>
          </>
        )}
      </>
    );

    if (isMobile) {
      return (
        <>
          <SheetClose asChild>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Inicio
              </Link>
            </Button>
          </SheetClose>
          {currentUser && (
            <>
              <SheetClose asChild>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link href="/horses">
                    <Icons.horse className="mr-2 h-4 w-4" /> {/* Updated Icon */}
                    Caballos
                  </Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link href="/plans">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Planes
                  </Link>
                </Button>
              </SheetClose>
              {userProfile?.role === 'admin' && (
                <SheetClose asChild>
                  <Button variant="outline" asChild className="w-full justify-start">
                    <Link href="/library/exercises">
                      <Library className="mr-2 h-4 w-4" />
                      Ejercicios
                    </Link>
                  </Button>
                </SheetClose>
              )}
              <SheetClose asChild>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link href="/horse-history">
                    <History className="mr-2 h-4 w-4" />
                    Historial
                  </Link>
                </Button>
              </SheetClose>
            </>
          )}
        </>
      );
    }
    return linksContent;
  };

  const AuthButtons = ({ isMobile = false }: { isMobile?: boolean }) => {
    const buttonsContent = (
       <>
        {!currentUser && (
          <>
            <Button variant={isMobile ? "outline" : "ghost"} asChild className={isMobile ? "w-full justify-start" : ""}>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Iniciar Sesión
              </Link>
            </Button>
            <Button variant={isMobile ? "default" : "default"} asChild className={isMobile ? "w-full justify-start" : ""}>
              <Link href="/signup">
                <UserPlus className="mr-2 h-4 w-4" />
                Regístrate
              </Link>
            </Button>
          </>
        )}
      </>
    );

    if (isMobile) {
        return (
            <>
                {!currentUser && (
                    <>
                        <SheetClose asChild>
                            <Button variant="outline" asChild className="w-full justify-start">
                                <Link href="/login">
                                <LogIn className="mr-2 h-4 w-4" />
                                Iniciar Sesión
                                </Link>
                            </Button>
                        </SheetClose>
                        <SheetClose asChild>
                            <Button variant="default" asChild className="w-full justify-start">
                                <Link href="/signup">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Regístrate
                                </Link>
                            </Button>
                        </SheetClose>
                    </>
                )}
            </>
        );
    }
    return buttonsContent;
  };

  const UserProfileSection = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {currentUser && userProfile && (
        isMobile ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 border-b">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || "Usuario"} />
                    <AvatarFallback>{getInitials(userProfile.displayName)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-medium leading-none">{userProfile.displayName || "Usuario"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userProfile.email}
                    </p>
                </div>
            </div>
            <SheetClose asChild>
                <Button variant="outline" onClick={handleLogout} className="w-full justify-start text-destructive hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
                </Button>
            </SheetClose>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || "Usuario"} />
                  <AvatarFallback>{getInitials(userProfile.displayName)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userProfile.displayName || "Usuario"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userProfile.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}
      {currentUser && !userProfile && !loading && ( 
        isMobile ? (
            <SheetClose asChild>
                <Button variant="outline" onClick={handleLogout} className="w-full justify-start text-destructive hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
                </Button>
            </SheetClose>
        ) : (
            <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
            </Button>
        )
      )}
    </>
  );


  if (loading) {
    return (
      <nav className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Icons.logo className="h-6 w-6 text-primary"/>
            EquiProgress
          </Link>
          <Icons.spinner className="h-6 w-6 animate-spin" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Icons.logo className="h-6 w-6 text-primary"/>
          EquiProgress
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <NavLinks />
          <AuthButtons />
          <UserProfileSection />
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                        <SheetClose asChild><Icons.logo className="h-6 w-6 text-primary"/></SheetClose>
                        <SheetClose asChild><div className="hover:no-underline">EquiProgress</div></SheetClose>
                    </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col space-y-2 p-4">
                <NavLinks isMobile />
                <AuthButtons isMobile />
                <UserProfileSection isMobile />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

