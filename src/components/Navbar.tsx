
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
import { Icons } from './icons';
import { BookMarked, ListChecks } from 'lucide-react'; // Added ListChecks for Exercises

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

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Icons.logo className="h-6 w-6 text-primary"/>
          EquiProgress
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          {!loading && currentUser && (
            <>
              <Button variant="ghost" asChild>
                <Link href="/library/exercises">Ejercicios</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/horse-history">Historial</Link>
              </Button>
            </>
          )}
          {!loading && !currentUser && (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Regístrate</Link>
              </Button>
            </>
          )}
          {!loading && currentUser && userProfile && (
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
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <Icons.user className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                {/* <DropdownMenuItem onClick={() => router.push('/library/exercises')}>
                  <ListChecks className="mr-2 h-4 w-4" />
                  <span>Biblioteca de Ejercicios</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/horse-history')}>
                  <Icons.bookMarked className="mr-2 h-4 w-4" />
                  <span>Historial de Sesiones</span>
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <Icons.close className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
           {!loading && currentUser && !userProfile && (
             <Button variant="ghost" onClick={handleLogout}>Cerrar Sesión</Button>
           )}
        </div>
      </div>
    </nav>
  );
}
