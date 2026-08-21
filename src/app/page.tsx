'use client';

import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { Flame, User, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AgregarSesionDialog } from '@/components/agregar-sesion-dialog';
import { useAuth } from '@/components/auth-provider';
import { Logo } from '@/components/logo';
import { SesionCard } from '@/components/sesion-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trainingPlans, type TrainingPlan } from '@/data/training-plans';
import { auth, USE_FIRESTORE } from '@/lib/firebase';
import { getPlanDisplayName, getVisiblePlans, isAdminUser } from '@/lib/plan-visibility';
import {
  DIAS_ENTRENO_POR_DEFECTO,
  calcularResumenProgreso,
  conCompletadaAlternada,
  guardarSesion,
  hoyFecha,
  posicionDiaDeEntreno,
  sesionesDeHoyDesdePlan,
  subscribeSesionesRango,
  sumarDias,
  type SesionEntry,
} from '@/lib/sesiones-store';
import {
  subscribeActivePlanId,
  subscribePlanesPersonalizados,
  type PlanPersonalizado,
} from '@/lib/planes-personalizados-store';
import { crearCaballo, subscribeCaballos, type Caballo } from '@/lib/caballos-store';
import { useToast } from '@/hooks/use-toast';
import { useUserAccountMeta } from '@/hooks/use-user-account-meta';

const DIAS_DE_HISTORIA_PARA_RACHA = 59;

export default function HoyPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { allowedPlanIds, loading: accountMetaLoading } = useUserAccountMeta(user);
  const isAdmin = isAdminUser(user);

  const [fecha, setFecha] = useState<string | null>(null);
  const [sesiones, setSesiones] = useState<SesionEntry[]>([]);
  const [caballos, setCaballos] = useState<Caballo[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planesPersonalizados, setPlanesPersonalizados] = useState<PlanPersonalizado[]>([]);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Calculamos "hoy" recién en el cliente -- el servidor y el navegador
  // pueden estar en husos horarios distintos, así que evitamos que el
  // primer render dependa de la fecha (mismo criterio que ya usaba
  // new-registry para esto).
  useEffect(() => {
    setFecha(hoyFecha());
  }, []);

  useEffect(() => {
    if (!user || !fecha) {
      setSesiones([]);
      return;
    }

    const desde = sumarDias(fecha, -DIAS_DE_HISTORIA_PARA_RACHA);
    const unsubscribe = subscribeSesionesRango(user.uid, desde, fecha, setSesiones, () => {
      toast({
        variant: 'destructive',
        title: 'Problema al sincronizar',
        description: 'No se pudieron traer tus sesiones. Reintentando en segundo plano.',
      });
    });

    return unsubscribe;
  }, [user, fecha, toast]);

  useEffect(() => {
    if (!user) {
      setCaballos([]);
      return;
    }

    return subscribeCaballos(user.uid, setCaballos);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setActivePlanId(null);
      return;
    }
    return subscribeActivePlanId(user.uid, setActivePlanId);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPlanesPersonalizados([]);
      return;
    }
    return subscribePlanesPersonalizados(user.uid, setPlanesPersonalizados);
  }, [user]);

  const planesVisibles = useMemo(() => {
    if (!user || isAdmin) return [];
    return getVisiblePlans(trainingPlans, false, allowedPlanIds);
  }, [user, isAdmin, allowedPlanIds]);

  const planPersonalizadoActivo = useMemo(() => {
    if (!activePlanId?.startsWith('custom-')) return null;
    const id = activePlanId.slice('custom-'.length);
    return planesPersonalizados.find((plan) => plan.id === id) ?? null;
  }, [activePlanId, planesPersonalizados]);

  const plan: TrainingPlan | null = useMemo(() => {
    if (planPersonalizadoActivo) {
      return trainingPlans.find((candidato) => candidato.id === planPersonalizadoActivo.planBaseId) ?? null;
    }

    if (activePlanId) {
      const elegido = planesVisibles.find((candidato) => candidato.id === activePlanId);
      if (elegido) return elegido;
    }

    return planesVisibles[0] ?? null;
  }, [planPersonalizadoActivo, activePlanId, planesVisibles]);

  const nombrePlanActivo = planPersonalizadoActivo?.nombre ?? (plan ? getPlanDisplayName(plan.id, plan.name, false) : '');
  const diasEntrenoSemana = planPersonalizadoActivo?.diasEntrenoSemana ?? DIAS_ENTRENO_POR_DEFECTO;

  const sesionesDeHoy = useMemo(() => {
    if (!fecha) return [];

    const delPlan = plan ? sesionesDeHoyDesdePlan(plan, fecha, sesiones, diasEntrenoSemana) : [];
    const personalizadas = sesiones.filter(
      (sesion) => sesion.origen === 'personalizada' && sesion.fecha === fecha
    );

    return [...delPlan, ...personalizadas];
  }, [plan, fecha, sesiones, diasEntrenoSemana]);

  const resumen = useMemo(() => {
    if (!fecha) return { rachaActual: 0, xpTotal: 0, sesionesCompletadas: 0 };
    return calcularResumenProgreso(sesiones, fecha);
  }, [sesiones, fecha]);

  const esDiaHabil = !plan || (fecha ? posicionDiaDeEntreno(fecha, diasEntrenoSemana) !== null : true);

  const handleToggle = useCallback(
    async (sesion: SesionEntry) => {
      if (!user) return;

      setGuardandoId(sesion.id);
      try {
        await guardarSesion(user.uid, conCompletadaAlternada(sesion));
      } catch {
        toast({
          variant: 'destructive',
          title: 'No se pudo guardar',
          description: 'Probá de nuevo en un momento.',
        });
      } finally {
        setGuardandoId(null);
      }
    },
    [user, toast]
  );

  const handleGuardarNueva = useCallback(
    async (sesion: SesionEntry) => {
      if (!user) return;
      await guardarSesion(user.uid, sesion);
      toast({ title: 'Sesión guardada', description: sesion.titulo });
    },
    [user, toast]
  );

  const handleCrearCaballo = useCallback(
    async (nombre: string) => {
      if (!user) throw new Error('Sin usuario');
      return crearCaballo(user.uid, nombre);
    },
    [user]
  );

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut(auth);
    } finally {
      setIsSigningOut(false);
    }
  }

  const caballoPorId = useMemo(() => new Map(caballos.map((caballo) => [caballo.id, caballo.nombre])), [caballos]);

  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <header className="sticky top-0 z-20 border-b border-primary/20 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo variant="full" className="h-10 w-auto max-w-[200px]" />
          {authLoading ? (
            <span className="text-sm text-muted-foreground">Cargando...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              {!USE_FIRESTORE ? <span className="text-xs text-muted-foreground">Modo local</span> : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Cuenta">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="max-w-[14rem] truncate">
                    {user.displayName || user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/planes">Mis planes</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/perfil">Mi perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
                    {isSigningOut ? 'Cerrando...' : 'Cerrar sesión'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {authLoading || (user && !fecha) ? (
          <Card>
            <CardHeader>
              <CardTitle>Preparando tu día...</CardTitle>
            </CardHeader>
          </Card>
        ) : !user ? (
          <Card>
            <CardHeader>
              <CardTitle>Bienvenida de nuevo</CardTitle>
              <CardDescription>Iniciá sesión para ver tu sesión de hoy.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">Crear cuenta</Link>
              </Button>
            </CardContent>
          </Card>
        ) : isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Panel de instructora en construcción</CardTitle>
              <CardDescription>
                Esta rama está armando el registro diario nuevo para las alumnas. El panel de asignación de
                planes y seguimiento vuelve en la Fase 4 -- tu app en producción no se toca hasta entonces.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : accountMetaLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Cargando tu plan...</CardTitle>
            </CardHeader>
          </Card>
        ) : (
          <>
            <section className="space-y-1">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
                {formatFechaLarga(fecha as string)}
              </p>
              <h1 className="text-3xl font-headline font-bold">Hoy</h1>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-primary/20 bg-card/80 p-4">
                <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                  <Flame className="h-3.5 w-3.5" /> Racha
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {resumen.rachaActual} <span className="text-sm font-normal text-muted-foreground">días</span>
                </p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-card/80 p-4">
                <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                  <Zap className="h-3.5 w-3.5" /> XP (últimos 60 días)
                </p>
                <p className="mt-1 text-2xl font-bold">{resumen.xpTotal}</p>
              </div>
            </section>

            {!plan ? (
              <Card>
                <CardHeader>
                  <CardTitle>Todavía no tenés un plan asignado</CardTitle>
                  <CardDescription>
                    Pedile a tu instructora que te asigne uno, o armá el tuyo desde "Mis planes". Mientras
                    tanto podés registrar lo que entrenes igual.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline">
                    <Link href="/planes">Ver planes</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle>{nombrePlanActivo}</CardTitle>
                    <CardDescription>Sesiones de hoy</CardDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/planes">Cambiar plan</Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!esDiaHabil ? (
                    <p className="text-sm text-muted-foreground">
                      Hoy es día de descanso del plan. Si igual entrenaste algo, sumalo con "Agregar sesión".
                    </p>
                  ) : sesionesDeHoy.filter((sesion) => sesion.origen === 'plan').length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Todavía no hay ejercicios definidos para hoy en este plan.
                    </p>
                  ) : (
                    sesionesDeHoy
                      .filter((sesion) => sesion.origen === 'plan')
                      .map((sesion) => (
                        <SesionCard
                          key={sesion.id}
                          sesion={sesion}
                          caballoNombre={sesion.caballoId ? caballoPorId.get(sesion.caballoId) : null}
                          onToggle={() => handleToggle(sesion)}
                          disabled={guardandoId === sesion.id}
                        />
                      ))
                  )}
                </CardContent>
              </Card>
            )}

            {sesionesDeHoy.some((sesion) => sesion.origen === 'personalizada') ? (
              <Card>
                <CardHeader>
                  <CardTitle>Sumadas hoy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sesionesDeHoy
                    .filter((sesion) => sesion.origen === 'personalizada')
                    .map((sesion) => (
                      <SesionCard
                        key={sesion.id}
                        sesion={sesion}
                        caballoNombre={sesion.caballoId ? caballoPorId.get(sesion.caballoId) : null}
                        onToggle={() => handleToggle(sesion)}
                        disabled={guardandoId === sesion.id}
                      />
                    ))}
                </CardContent>
              </Card>
            ) : null}

            <div className="flex justify-center pt-2">
              <AgregarSesionDialog
                fecha={fecha as string}
                caballos={caballos}
                onCrearCaballo={handleCrearCaballo}
                onGuardar={handleGuardarNueva}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function formatFechaLarga(fecha: string): string {
  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
}
