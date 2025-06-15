
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
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const planId = params.planId as string;

  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [weeksWithDays, setWeeksWithDays] = useState<WeekWithDays[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDeniedToPlan, setAccessDeniedToPlan] = useState(false);

  const fetchPlanDetails = useCallback(async () => {
    if (!planId || !currentUser) {
        setIsLoading(false);
        if (!currentUser) setError("Debes iniciar sesión para ver los detalles del plan.");
        else if (!planId) setError("ID del plan no encontrado.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setAccessDeniedToPlan(false);

    try {
      const fetchedPlan = await getPlanById(planId);
      if (!fetchedPlan) {
        setError("Plan no encontrado.");
        setIsLoading(false);
        return;
      }

      const userCtx = { uid: currentUser.uid, role: userProfile?.role };

      // Check plan-level access for non-admin users
      if (userCtx.role !== 'admin') {
        const planAllowedUserIds = fetchedPlan.allowedUserIds;
        if (Array.isArray(planAllowedUserIds)) {
          if (planAllowedUserIds.length === 0) { 
            setAccessDeniedToPlan(true);
            setPlan(fetchedPlan); 
            setIsLoading(false);
            return;
          }
          if (!planAllowedUserIds.includes(userCtx.uid)) { 
            setAccessDeniedToPlan(true);
            setPlan(fetchedPlan);
            setIsLoading(false);
            return;
          }
        }
        // If planAllowedUserIds is null/undefined, it's public, so access is granted (unless blocks/exercises restrict further)
      }
      
      setPlan(fetchedPlan);

      // Get all blocks for this plan, annotated with accessStatus by getTrainingBlocks
      const fetchedBlocks = await getTrainingBlocks(planId, userCtx);
      const sortedBlocks = fetchedBlocks.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
      
      const blocksWithExercisesPromises = sortedBlocks.map(async (block) => {
        // For each block, get its exercises, annotated with accessStatus by getExercisesForBlock
        // Pass the block's own accessStatus to help determine exercise access
        const days = await getExercisesForBlock(block.id, userCtx, block.accessStatus);
        return { ...block, days: days.sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity)) };
      });
      
      const resolvedBlocksWithExercises = await Promise.all(blocksWithExercisesPromises);
      setWeeksWithDays(resolvedBlocksWithExercises);

    } catch (err) {
      console.error("Error fetching plan details:", err);
      setError("Ocurrió un error al cargar los detalles del plan.");
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los detalles del plan." });
    } finally {
      setIsLoading(false);
    }
  }, [planId, toast, currentUser, userProfile]);

  useEffect(() => {
    if (currentUser) {
      fetchPlanDetails();
    } else if (!authLoading && !currentUser) {
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

  if (!currentUser && !authLoading) {
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

  if (accessDeniedToPlan) {
    return (
      <div className="container mx-auto py-6 sm:py-10 text-center">
        <Card className="w-full max-w-lg p-6">
            <Icons.lock className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-xl text-destructive">Acceso Denegado al Plan</CardTitle>
            <CardDescription className="mt-2">No tienes permiso para ver este plan.</CardDescription>
            <CardContent className="mt-4">
                <Button variant="outline" onClick={() => router.push('/plans')}>
                    <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver a Planes
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
  
  if (!plan && !isLoading) {
    return (
      <div className="container mx-auto py-6 sm:py-10 text-center">
        <p>Plan no encontrado o no tienes acceso.</p>
         <Button variant="outline" onClick={() => router.push('/plans')} className="mt-4">
            <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver a Planes
        </Button>
      </div>
    );
  }
  
  if (!plan) return null;

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
                 {userProfile?.role === 'admin' && (
                    <Button variant="outline" asChild>
                        <Link href={`/admin/plans/edit/${plan.id}`}> {/* Placeholder, admin edit page doesn't exist yet */}
                           <Icons.edit className="mr-2 h-4 w-4" /> Editar Plan (Admin)
                        </Link>
                    </Button>
                 )}
                <Button variant="outline" onClick={() => router.back()} className="flex-grow sm:flex-grow-0">
                    <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {weeksWithDays.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {weeksWithDays.map((week) => {
                const isBlockDenied = week.accessStatus === 'denied' || week.accessStatus === 'parent_denied';
                return (
                <AccordionItem key={week.id} value={week.id} className={`rounded-lg border bg-card shadow-sm ${isBlockDenied ? 'opacity-60 bg-muted/30' : ''}`}>
                  <AccordionTrigger 
                    className={`p-4 hover:no-underline ${isBlockDenied ? 'cursor-not-allowed' : ''}`}
                    // disabled={isBlockDenied} // Making it expandable to see locked exercises
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                        <div className="flex items-center">
                           {isBlockDenied && <Icons.lock className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />}
                           <span className={`text-lg font-semibold ${isBlockDenied ? 'text-muted-foreground' : ''}`}>{week.title}</span>
                        </div>
                        <span className={`text-sm text-muted-foreground mt-1 sm:mt-0 ${isBlockDenied ? 'text-muted-foreground/70' : ''}`}>
                            {week.duration && `Duración: ${week.duration} | `}
                            {week.days.length} {week.days.length === 1 ? "ejercicio sugerido" : "ejercicios sugeridos"}
                        </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {week.goal && <p className={`text-sm mb-3 ${isBlockDenied ? 'text-muted-foreground/80' : 'text-primary'}`}><strong>Meta de la Etapa:</strong> {week.goal}</p>}
                    {week.notes && <p className={`text-sm mb-3 whitespace-pre-wrap ${isBlockDenied ? 'text-muted-foreground/80' : 'text-muted-foreground'}`}><strong>Notas de la Etapa:</strong> {week.notes}</p>}
                    
                    {week.days.length > 0 ? (
                      <div className="space-y-3">
                        {week.days.map((day) => {
                          const isExerciseDenied = day.accessStatus === 'denied' || day.accessStatus === 'parent_denied';
                          return (
                          <Card key={day.id} className={`p-3 ${isExerciseDenied ? 'bg-muted/20 opacity-60' : 'bg-muted/50'}`}>
                            <div className="flex items-center">
                               {isExerciseDenied && <Icons.lock className="h-3.5 w-3.5 mr-2 text-muted-foreground flex-shrink-0" />}
                               <p className={`font-semibold text-md ${isExerciseDenied ? 'text-muted-foreground' : ''}`}>{day.title}</p>
                            </div>
                            {day.description && <p className={`text-xs mt-0.5 whitespace-pre-wrap ${isExerciseDenied ? 'text-muted-foreground/80' : 'text-muted-foreground'}`}>{day.description}</p>}
                            {day.objective && <p className={`text-xs mt-0.5 whitespace-pre-wrap ${isExerciseDenied ? 'text-muted-foreground/80' : 'text-muted-foreground'}`}><strong>Objetivo:</strong> {day.objective}</p>}
                            {day.suggestedReps && <p className={`text-xs mt-0.5 ${isExerciseDenied ? 'text-muted-foreground/80' : 'text-muted-foreground'}`}><strong>Sugerido:</strong> {day.suggestedReps}</p>}
                          </Card>
                        )})}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Esta etapa no tiene ejercicios sugeridos.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )})}
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

