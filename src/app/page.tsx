
"use client";

import Dashboard from "@/components/Dashboard";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";

export default function Home() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"> {/* Adjust height if navbar height is different */}
        <Icons.spinner className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container flex flex-col items-center justify-center py-10 text-center">
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="text-3xl font-bold">¡Bienvenido/a a EquiProgress!</CardTitle>
                <CardDescription>
                Realiza seguimiento de tus sesiones de entrenamiento, monitorea el progreso y alcanza tus metas ecuestres.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M2 12h2"/><path d="M6 6v.01"/><path d="M10 3.5A1.5 1.5 0 0 1 8.5 2A1.5 1.5 0 0 1 7 3.5V5c0 .6.4 1 1 1h1.5c.6 0 1-.4 1-1V3.5Z"/><path d="M18 6v.01"/><path d="M22 12h-2"/><path d="M17.5 3.5A1.5 1.5 0 0 0 16 2a1.5 1.5 0 0 0-1.5 1.5V5c0 .6.4 1 1 1H16c.6 0 1-.4 1-1V3.5Z"/><path d="M6 18v.01"/><path d="M18 18v.01"/><path d="M8.7 15.8c1-.4 1.9-.8 2.6-1.3a2 2 0 0 0-2.6-3c-.9.5-1.7.9-2.6 1.3"/><path d="m15.3 15.8c-1-.4-1.9-.8-2.6-1.3a2 2 0 0 1 2.6-3c.9.5 1.7.9 2.6 1.3"/><path d="M12 22v-4"/><path d="M6 12c0-1.5 1.2-2.8 2.7-3"/><path d="M18 12c0-1.5-1.2-2.8-2.7-3"/></svg>
                </div>
                <p className="text-muted-foreground">
                    Por favor, inicia sesión o regístrate para continuar.
                </p>
                <div className="flex justify-center gap-4">
                    <Button asChild>
                        <Link href="/login">Iniciar Sesión</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/signup">Regístrate</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  return <Dashboard />;
}
