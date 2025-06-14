
// src/app/plans/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getTrainingPlans, getTrainingBlocks, type TrainingPlan, type TrainingBlock } from "@/services/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface PlanWithWeekCount extends TrainingPlan {
  weekCount: number;
}

export default function PlansPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [plansWithWeeks, setPlansWithWeeks] = useState<PlanWithWeekCount[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  const fetchPlansAndWeekCounts = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const fetchedPlans = await getTrainingPlans();
      const plansWithCounts: PlanWithWeekCount[] = await Promise.all(
        fetchedPlans.map(async (plan) => {
          const blocks = await getTrainingBlocks(plan.id);
          return { ...plan, weekCount: blocks.length };
        })
      );
      setPlansWithWeeks(plansWithCounts);
    } catch (error) {
      console.error("Error fetching plans and week counts:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los planes de entrenamiento." });
    } finally {
      setIsLoadingPlans(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser) {
      fetchPlansAndWeekCounts();
    }
  }, [currentUser, fetchPlansAndWeekCounts]);

  if (authLoading || (currentUser && isLoadingPlans)) {
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
              Debes iniciar sesión para ver los planes de entrenamiento.
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
    <div className="container mx-auto py-6 sm:py-10">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planes de Entrenamiento</h1>
          <p className="text-muted-foreground">
            Explora los planes disponibles y visualiza sus detalles.
          </p>
        </div>
         <Button variant="outline" onClick={() => router.push('/')}>
            <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver al Dashboard
        </Button>
      </div>

      {isLoadingPlans ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Icons.spinner className="h-6 w-6 animate-spin" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Cargando plan...</p>
              </CardContent>
              <CardFooter>
                <Button disabled className="w-full">Cargando...</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : plansWithWeeks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
          <Icons.bookMarked className="h-16 w-16 text-muted-foreground mb-4" data-ai-hint="empty book list" />
          <h3 className="text-xl font-semibold">No Hay Planes Disponibles</h3>
          <p className="text-muted-foreground">
            Actualmente no hay planes de entrenamiento para mostrar. Los administradores pueden crear nuevos planes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plansWithWeeks.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{plan.title}</CardTitle>
                <CardDescription>
                  {plan.template && <Badge variant="outline" className="mr-2">Plantilla</Badge>}
                  Duración: {plan.weekCount} {plan.weekCount === 1 ? "semana" : "semanas"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {/* Future: Add a short description of the plan if available */}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/plans/${plan.id}`}>
                    <Icons.search className="mr-2 h-4 w-4" /> Ver Detalles
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
