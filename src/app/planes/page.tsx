'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';

import { ArmarPlanDialog } from '@/components/armar-plan-dialog';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUserAccountMeta } from '@/hooks/use-user-account-meta';
import { trainingPlans } from '@/data/training-plans';
import { getPlanDisplayDescription, getPlanDisplayName, getVisiblePlans } from '@/lib/plan-visibility';
import { crearCaballo, subscribeCaballos, type Caballo } from '@/lib/caballos-store';
import { cn } from '@/lib/utils';
import {
  claveDeCaballo,
  idActivoDePlanPersonalizado,
  setActivePlanIdParaCaballo,
  subscribeActivePlanesPorCaballo,
  subscribePlanesPersonalizados,
  type PlanPersonalizado,
} from '@/lib/planes-personalizados-store';

const DIAS_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function PlanesPage() {
  return (
    <Suspense fallback={null}>
      <PlanesPageContent />
    </Suspense>
  );
}

function PlanesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { allowedPlanIds, loading: accountMetaLoading } = useUserAccountMeta(user);
  const searchParams = useSearchParams();

  const [caballos, setCaballos] = useState<Caballo[]>([]);
  const [caballoSeleccionadoId, setCaballoSeleccionadoId] = useState<string | null>(null);
  const [activePlanesPorCaballo, setActivePlanesPorCaballo] = useState<Record<string, string>>({});
  const [planesPersonalizados, setPlanesPersonalizados] = useState<PlanPersonalizado[]>([]);
  const [activando, setActivando] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCaballos([]);
      return;
    }
    return subscribeCaballos(user.uid, setCaballos);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setActivePlanesPorCaballo({});
      return;
    }
    return subscribeActivePlanesPorCaballo(user.uid, setActivePlanesPorCaballo);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPlanesPersonalizados([]);
      return;
    }
    return subscribePlanesPersonalizados(user.uid, setPlanesPersonalizados);
  }, [user]);

  // Elegimos qué caballo estamos viendo: el que venga en la URL (si venís
  // desde "Hoy" con "Cambiar plan"), o el primero de la lista.
  useEffect(() => {
    if (caballos.length === 0) {
      setCaballoSeleccionadoId(null);
      return;
    }

    const desdeUrl = searchParams.get('caballo');
    if (desdeUrl && caballos.some((caballo) => caballo.id === desdeUrl)) {
      setCaballoSeleccionadoId(desdeUrl);
      return;
    }

    setCaballoSeleccionadoId((actual) => {
      if (actual && caballos.some((caballo) => caballo.id === actual)) return actual;
      return caballos[0].id;
    });
    // Solo queremos re-evaluar cuando cambia la lista de caballos o el query param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caballos, searchParams]);

  const claveActual = claveDeCaballo(caballoSeleccionadoId);
  const activePlanId = activePlanesPorCaballo[claveActual] ?? null;

  const planesDelCatalogo = useMemo(() => getVisiblePlans(trainingPlans, false, allowedPlanIds), [allowedPlanIds]);
  const planesDelCaballo = useMemo(
    () => planesPersonalizados.filter((plan) => (plan.caballoId ?? null) === caballoSeleccionadoId),
    [planesPersonalizados, caballoSeleccionadoId]
  );

  async function handleCrearCaballo(nombre: string): Promise<Caballo> {
    if (!user) throw new Error('Sin usuario');
    const caballo = await crearCaballo(user.uid, nombre);
    setCaballoSeleccionadoId(caballo.id);
    return caballo;
  }

  async function activarPlanCatalogo(planId: string) {
    if (!user) return;
    setActivando(planId);
    try {
      await setActivePlanIdParaCaballo(user.uid, claveActual, planId);
      toast({ title: 'Plan activado' });
    } catch {
      toast({ variant: 'destructive', title: 'No se pudo activar el plan' });
    } finally {
      setActivando(null);
    }
  }

  async function activarPlanPersonalizado(plan: PlanPersonalizado) {
    if (!user) return;
    const id = idActivoDePlanPersonalizado(plan.id);
    setActivando(id);
    try {
      await setActivePlanIdParaCaballo(user.uid, claveActual, id);
      toast({ title: 'Plan activado' });
    } catch {
      toast({ variant: 'destructive', title: 'No se pudo activar el plan' });
    } finally {
      setActivando(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <header className="sticky top-0 z-20 border-b border-primary/20 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href={caballoSeleccionadoId ? `/?caballo=${caballoSeleccionadoId}` : '/'}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            &larr; Volver a Hoy
          </Link>
          <h1 className="text-lg font-headline font-semibold">Tus planes</h1>
          <div />
        </div>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {authLoading || accountMetaLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Cargando tus planes...</CardTitle>
            </CardHeader>
          </Card>
        ) : !user ? (
          <Card>
            <CardHeader>
              <CardTitle>Iniciá sesión para ver tus planes</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/login">Iniciar sesión</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {caballos.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Caballo
                </span>
                {caballos.map((caballo) => (
                  <button
                    key={caballo.id}
                    type="button"
                    onClick={() => setCaballoSeleccionadoId(caballo.id)}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                      caballoSeleccionadoId === caballo.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-muted'
                    )}
                  >
                    {caballo.nombre}
                  </button>
                ))}
              </div>
            ) : null}

            {planesDelCaballo.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Tu plan armado
                </h2>
                {planesDelCaballo.map((plan) => {
                  const planBase = trainingPlans.find((candidato) => candidato.id === plan.planBaseId);
                  const esActivo = activePlanId === idActivoDePlanPersonalizado(plan.id);
                  const diasTexto = plan.diasEntrenoSemana.map((dia) => DIAS_LABELS[dia - 1]).join(' · ');
                  const duracionTexto = plan.semanasObjetivo ? `${plan.semanasObjetivo} semanas · ` : '';

                  return (
                    <Card key={plan.id} className={esActivo ? 'border-primary' : undefined}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between gap-2 text-lg">
                          {plan.nombre}
                          {esActivo ? <Check className="h-5 w-5 text-primary" /> : null}
                        </CardTitle>
                        <CardDescription>
                          Basado en {planBase?.name ?? 'un plan del catálogo'} · {duracionTexto}
                          {diasTexto}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {plan.descripcionCaballo ? (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Situación: </span>
                            {plan.descripcionCaballo}
                          </p>
                        ) : null}
                        {plan.resultadoDeseado ? (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Buscás: </span>
                            {plan.resultadoDeseado}
                          </p>
                        ) : null}
                        <Button
                          variant={esActivo ? 'secondary' : 'default'}
                          disabled={esActivo || activando === idActivoDePlanPersonalizado(plan.id)}
                          onClick={() => activarPlanPersonalizado(plan)}
                        >
                          {esActivo ? 'Activo' : 'Activar'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Planes de tu instructora
              </h2>
              {planesDelCatalogo.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no tenés planes asignados. Pedíselos a tu instructora o armá el tuyo abajo.
                </p>
              ) : (
                planesDelCatalogo.map((plan) => {
                  const esActivo =
                    activePlanId === plan.id ||
                    (!activePlanId && plan.id === planesDelCatalogo[0]?.id);

                  return (
                    <Card key={plan.id} className={esActivo ? 'border-primary' : undefined}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between gap-2 text-lg">
                          {getPlanDisplayName(plan.id, plan.name, false)}
                          {esActivo ? <Check className="h-5 w-5 text-primary" /> : null}
                        </CardTitle>
                        <CardDescription>{getPlanDisplayDescription(plan.id, plan.description, false)}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant={esActivo ? 'secondary' : 'default'}
                          disabled={esActivo || activando === plan.id}
                          onClick={() => activarPlanCatalogo(plan.id)}
                        >
                          {esActivo ? 'Activo' : 'Activar'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </section>

            <div className="flex justify-center pt-2">
              <ArmarPlanDialog
                uid={user.uid}
                caballos={caballos}
                caballoPorDefectoId={caballoSeleccionadoId}
                onCrearCaballo={handleCrearCaballo}
                onCreado={() => toast({ title: 'Plan armado y activado' })}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
