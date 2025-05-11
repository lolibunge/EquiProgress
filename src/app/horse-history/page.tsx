
"use client";

import HorseHistory from "@/components/HorseHistory";
import { useAuth } from "@/context/AuthContext";
import { Icons } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HorseHistoryPage() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Icons.spinner className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container flex flex-col items-center justify-center py-10 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              Debes iniciar sesión para ver el historial de sesiones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <HorseHistory />;
}
