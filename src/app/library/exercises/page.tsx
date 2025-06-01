
// src/app/library/exercises/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Icons } from "@/components/icons";

// TODO: Implement full CRUD for MasterExercises here

export default function ExerciseLibraryPage() {
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
      <div className="container mx-auto flex flex-col items-center justify-center py-10 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              Debes iniciar sesión para acceder a la biblioteca de ejercicios.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl md:text-3xl">Biblioteca de Ejercicios</CardTitle>
              <CardDescription>
                Aquí puedes ver, crear, editar y eliminar los ejercicios maestros.
              </CardDescription>
            </div>
            <Button disabled> {/* TODO: Implement Add Exercise functionality */}
              <Icons.plus className="mr-2 h-4 w-4" />
              Añadir Nuevo Ejercicio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
            <Icons.logo className="h-16 w-16 text-muted-foreground mb-4" data-ai-hint="books list" />
            <h3 className="text-xl font-semibold">Próximamente</h3>
            <p className="text-muted-foreground">
              La funcionalidad completa de la biblioteca de ejercicios está en desarrollo.
            </p>
            <Button variant="outline" asChild className="mt-6">
                <Link href="/">Volver al Dashboard</Link>
            </Button>
          </div>
          {/* 
            TODO: 
            - Fetch and display MasterExercises from Firestore using getMasterExercises()
            - Implement a table or list view for exercises
            - Add Dialogs with forms for creating/editing MasterExercises
            - Implement deletion with confirmation
          */}
        </CardContent>
      </Card>
    </div>
  );
}
