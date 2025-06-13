
"use client";

import HorseHistory from "@/components/HorseHistory";
import { useAuth } from "@/context/AuthContext";
import { Icons } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HorseHistoryPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Icons.spinner className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center py-6 sm:py-10 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              Debes iniciar sesión para ver el historial de sesiones.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-10">
      <HorseHistory />
      <div className="mt-8 flex justify-center">
        <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver
        </Button>
      </div>
    </div>
  );
}
