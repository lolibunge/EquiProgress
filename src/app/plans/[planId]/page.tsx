
// src/app/plans/[planId]/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getPlanById, getTrainingBlocks, getExercisesForBlock, type TrainingPlan, type TrainingBlock, type BlockExerciseDisplay } from "@/services/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface WeekWithDays extends TrainingBlock {
  days: BlockExerciseDisplay[];
}

function PlanDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, userProfile, loading: authLoading } = useAuth(); // Added userProfile
  const { toast } = useToast();

  const planId = params.planId as string;

  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [weeksWithDays, setWeeksWithDays] = useState<WeekWithDays[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanDetails = useCallback(async () => {
    if (!planId || !currentUser) return; // Ensure currentUser is available
    setIsLoading(true);
    setError(null);
    try {
      const fetchedPlan = await getPlanById(planId);
      if (!fetchedPlan) {
        setError("Plan no encontrado.");
        setIsLoading(false);
        return;
      }
      setPlan(fetchedPlan);

      const userCtx = { uid: currentUser.uid, role: userProfile?.role };
      const fetchedBlocks = await getTrainingBlocks(planId, userCtx);
      const sortedBlocks = fetchedBlocks.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
      
      const blocksWithExercises: WeekWithDays[] = await Promise.all(
        sortedBlocks.map(async (block) => {
          const days = await getExercisesForBlock(block.id, userCtx);
          return { ...block, days: days.sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity)) };
        })
      );
      setWeeksWithDays(blocksWithExercises);

    } catch (err) {
      console.error("Error fetching plan details:", err);
      setError("Ocurrió un error al cargar los detalles del plan.");
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los detalles del plan." });
    } finally {
      setIsLoading(false);
    }
  }, [planId, toast, currentUser, userProfile]); // Added currentUser and userProfile

  useEffect(() => {
    if (currentUser) { // Fetch only if user is available
      fetchPlanDetails();
    } else if (!authLoading && !currentUser) { // If auth is done and no user, stop loading
        setIsLoading(false);
        setError("Debes iniciar sesión para ver los detalles del plan.");
    }
  }, [currentUser, authLoading, fetchPlanDetails]);

  if (authLoading || (currentUser && isLoading)) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Icons.spinner className="h-10 w-10 animate-spin" />
        <p className="ml-2">Cargando detalles del plan...</p>
      </div>
    );
  }

  if (!currentUser && !authLoading) { // Ensure authLoading is also false
     return (
      <div className="container mx-auto flex flex-col items-center justify-center py-10 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              Debes iniciar sesión para ver los detalles del plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
             <Button variant="outline" onClick={() => router.back()}>
                Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 sm:py-10 text-center">
        <Card className="w-full max-w-lg p-6">
            <Icons.alert className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-xl text-destructive">{error}</CardTitle>
            <CardContent className="mt-4">
                <Button variant="outline" onClick={() => router.push('/plans')}>
                    <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver a Planes
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan && !isLoading) { // Also check isLoading to avoid premature "not found"
    return (
      <div className="container mx-auto py-6 sm:py-10 text-center">
        <p>Plan no encontrado o no tienes acceso.</p>
         <Button variant="outline" onClick={() => router.push('/plans')} className="mt-4">
            <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver a Planes
        </Button>
      </div>
    );
  }
  
  if (!plan) return null; // Should be covered by loading state or error state

  return (
    <div className="container mx-auto py-6 sm:py-10">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <div>
                <CardTitle className="text-2xl md:text-3xl">{plan.title}</CardTitle>
                <CardDescription>
                {plan.template && <Badge variant="secondary" className="mr-2 my-1">Plantilla</Badge>}
                Total: {weeksWithDays.length} {weeksWithDays.length === 1 ? "etapa" : "etapas"}
                </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => router.back()} className="flex-grow sm:flex-grow-0">
                    <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {weeksWithDays.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {weeksWithDays.map((week) => (
                <AccordionItem key={week.id} value={week.id} className="rounded-lg border bg-card shadow-sm">
                  <AccordionTrigger className="p-4 hover:no-underline">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                        <span className="text-lg font-semibold">{week.title}</span>
                        <span className="text-sm text-muted-foreground mt-1 sm:mt-0">
                            {week.duration && `Duración: ${week.duration} | `}
                            {week.days.length} {week.days.length === 1 ? "ejercicio sugerido" : "ejercicios sugeridos"}
                        </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {week.goal && <p className="text-sm text-primary mb-3"><strong>Meta de la Etapa:</strong> {week.goal}</p>}
                    {week.notes && <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap"><strong>Notas de la Etapa:</strong> {week.notes}</p>}
                    
                    {week.days.length > 0 ? (
                      <div className="space-y-3">
                        {week.days.map((day) => (
                          <Card key={day.id} className="bg-muted/30 p-3">
                            <p className="font-semibold text-md">{day.title}</p>
                            {day.description && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{day.description}</p>}
                            {day.objective && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap"><strong>Objetivo:</strong> {day.objective}</p>}
                            {day.suggestedReps && <p className="text-xs text-muted-foreground mt-0.5"><strong>Sugerido:</strong> {day.suggestedReps}</p>}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Esta etapa no tiene ejercicios sugeridos.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground text-center py-4">Este plan no tiene etapas definidas o no tienes acceso a ninguna.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PlanDetailPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Icons.spinner className="h-12 w-12 animate-spin" /></div>}>
            <PlanDetailPageContent />
        </Suspense>
    )
}
