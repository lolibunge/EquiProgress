
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

export default function Navbar() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      console.error("Failed to log out", error);
      // Handle error (e.g., show toast)
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
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M2 12h2"/><path d="M6 6v.01"/><path d="M10 3.5A1.5 1.5 0 0 1 8.5 2A1.5 1.5 0 0 1 7 3.5V5c0 .6.4 1 1 1h1.5c.6 0 1-.4 1-1V3.5Z"/><path d="M18 6v.01"/><path d="M22 12h-2"/><path d="M17.5 3.5A1.5 1.5 0 0 0 16 2a1.5 1.5 0 0 0-1.5 1.5V5c0 .6.4 1 1 1H16c.6 0 1-.4 1-1V3.5Z"/><path d="M6 18v.01"/><path d="M18 18v.01"/><path d="M8.7 15.8c1-.4 1.9-.8 2.6-1.3a2 2 0 0 0-2.6-3c-.9.5-1.7.9-2.6 1.3"/><path d="m15.3 15.8c-1-.4-1.9-.8-2.6-1.3a2 2 0 0 1 2.6-3c.9.5 1.7.9 2.6 1.3"/><path d="M12 22v-4"/><path d="M6 12c0-1.5 1.2-2.8 2.7-3"/><path d="M18 12c0-1.5-1.2-2.8-2.7-3"/></svg>
          EquiProgress
        </Link>
        <div className="flex items-center gap-4">
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
