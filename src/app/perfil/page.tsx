'use client';

import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { crearCaballo, subscribeCaballos, type Caballo } from '@/lib/caballos-store';

export default function PerfilPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [caballos, setCaballos] = useState<Caballo[]>([]);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [creando, setCreando] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!user) {
      setCaballos([]);
      return;
    }
    return subscribeCaballos(user.uid, setCaballos);
  }, [user]);

  async function handleAgregarCaballo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !nombreNuevo.trim()) return;

    setCreando(true);
    try {
      await crearCaballo(user.uid, nombreNuevo);
      setNombreNuevo('');
    } catch {
      toast({ variant: 'destructive', title: 'No se pudo agregar el caballo' });
    } finally {
      setCreando(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut(auth);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <header className="sticky top-0 z-20 border-b border-primary/20 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            &larr; Volver a Hoy
          </Link>
          <h1 className="text-lg font-headline font-semibold">Mi perfil</h1>
          <div />
        </div>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <Card>
            <CardHeader>
              <CardTitle>Cargando...</CardTitle>
            </CardHeader>
          </Card>
        ) : !user ? (
          <Card>
            <CardHeader>
              <CardTitle>Iniciá sesión para ver tu perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/login">Iniciar sesión</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Cuenta</CardTitle>
                <CardDescription>{user.displayName || 'Sin nombre'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
                  {isSigningOut ? 'Cerrando...' : 'Cerrar sesión'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tus caballos</CardTitle>
                <CardDescription>Podés tener más de uno activo a la vez.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {caballos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todavía no agregaste ningún caballo.</p>
                ) : (
                  <ul className="space-y-2">
                    {caballos.map((caballo) => (
                      <li
                        key={caballo.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        {caballo.nombre}
                      </li>
                    ))}
                  </ul>
                )}

                <form className="flex gap-2" onSubmit={handleAgregarCaballo}>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="caballo-nombre" className="sr-only">
                      Nombre del caballo
                    </Label>
                    <Input
                      id="caballo-nombre"
                      value={nombreNuevo}
                      onChange={(event) => setNombreNuevo(event.target.value)}
                      placeholder="Ej: Perla"
                    />
                  </div>
                  <Button type="submit" disabled={creando || !nombreNuevo.trim()}>
                    {creando ? 'Agregando...' : 'Agregar'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
