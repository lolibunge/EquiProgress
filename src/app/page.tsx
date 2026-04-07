'use client';

import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useMemo, useRef, useState } from 'react';
import Autoplay from 'embla-carousel-autoplay';

import { useAuth } from '@/components/auth-provider';
import {
  trainingPlans,
  type TrainingPlan,
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
} from '@/data/training-plans';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { auth } from '@/lib/firebase';
import {
  getPlanDisplayDescription,
  getPlanDisplayName,
  isAdminUser,
} from '@/lib/plan-visibility';
import { PRICING, getTrialNotice, getTrialStatus } from '@/lib/pricing';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0]);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isAdmin = isAdminUser(user);
  const featuredStudentPlanId = 'taller-metodo-mente-movimiento';
  const featuredStudentPlan = trainingPlans.find((plan) => plan.id === featuredStudentPlanId);
  const adminFilteredPlans = trainingPlans.filter((plan) => plan.category === selectedCategory);
  const trialStatus = useMemo(() => {
    if (!user || isAdmin) return null;
    return getTrialStatus(user.metadata.creationTime);
  }, [user, isAdmin]);
  const remainingDaysLabel = trialStatus
    ? String(Math.max(0, trialStatus.remainingDays)).padStart(2, '0')
    : '00';

  const autoplay = useRef(
    Autoplay({ delay: 2500, stopOnInteraction: false, stopOnMouseEnter: false, playOnInit: true })
  );

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      toast({
        title: 'Sesión cerrada',
        description: 'La sesión del estudiante se cerró correctamente.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'No se pudo cerrar sesión',
        description: 'Inténtalo de nuevo.',
      });
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex flex-col antialiased">
      <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo variant="full" className="h-12 w-auto max-w-[250px]" />
            </div>

            {loading ? (
              <span className="text-sm text-muted-foreground">Cargando cuenta...</span>
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline text-xs text-muted-foreground max-w-[14rem] truncate">
                  {user.displayName || user.email}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link href="/history">Historia</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/feedback">Opinión</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </Button>
              </div>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow w-full container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!loading && user && !isAdmin && trialStatus && (
          <section className="mb-6">
            <Card className="mx-auto max-w-2xl border-primary/30 bg-card/80">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 rounded-xl border border-primary/30 bg-background shadow-sm">
                    <div className="absolute inset-x-0 top-0 h-5 rounded-t-xl bg-primary/15" />
                    <div className="absolute top-1 left-4 h-2 w-2 rounded-full bg-primary/50" />
                    <div className="absolute top-1 right-4 h-2 w-2 rounded-full bg-primary/50" />
                    <div className="absolute inset-x-0 top-0 flex h-5 items-center justify-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Días
                      </span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pt-3">
                      <span className="text-3xl font-bold tracking-tight">{remainingDaysLabel}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold">
                      {trialStatus.isExpired
                        ? `Tu prueba de ${trialStatus.totalDays} días finalizó.`
                        : `${trialStatus.remainingDays} ${
                            trialStatus.remainingDays === 1 ? 'día' : 'días'
                          } restantes de prueba`}
                    </p>
                    {!trialStatus.isExpired && trialStatus.endsAt && (
                      <p className="text-sm text-muted-foreground">
                        Finaliza el {formatShortDate(trialStatus.endsAt)}.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <div className="flex flex-col items-center text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-foreground">
            Planes de Entrenamiento para Caballos
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Desde iniciar un caballo joven hasta refinar movimientos avanzados, encuentra un plan que se adapte a tu viaje.
          </p>
        </div>

        {!loading && !user && (
          <>
            <Card className="mb-6 border-dashed">
              <CardHeader>
                <CardTitle>Para tus estudiantes</CardTitle>
                <CardDescription>
                  Pide a cada estudiante que cree una cuenta para guardar su progreso e historial de forma individual.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link href="/register">Crear cuenta</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/reset-password">Restablecer contraseña</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Prueba gratis de {PRICING.trialDays} días</CardTitle>
                <CardDescription>{getTrialNotice()}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline">
                  <Link href="/pricing">Ver detalles de la prueba</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/register">Comenzar prueba gratis</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {!loading && user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{isAdmin ? 'Modo administrador activo' : 'Modo estudiante activo'}</CardTitle>
              <CardDescription>
                {isAdmin
                  ? 'Puedes ver todos los planes y gestionar las asignaciones de estudiantes.'
                  : `El progreso está vinculado a ${user.displayName || user.email}. Aquí verás solo el plan asignado a tus clases.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline">
                  <Link href="/history">Abrir historial de progreso</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/feedback">Enviar opinión</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && user && !isAdmin && featuredStudentPlan && (
          <section className="mb-8">
            <Card className="border-primary/30 shadow-sm">
              <CardHeader>
                <CardTitle>Tu plan asignado</CardTitle>
                <CardDescription>
                  Enfócate en este plan para evitar confusiones con otros contenidos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xl font-semibold">
                    {getPlanDisplayName(featuredStudentPlan.id, featuredStudentPlan.name, false)}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {getPlanDisplayDescription(
                      featuredStudentPlan.id,
                      featuredStudentPlan.description,
                      false
                    )}
                  </p>
                </div>
                <Button asChild>
                  <Link href={`/plans/${featuredStudentPlan.id}`}>Abrir plan ahora</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {!loading && user && isAdmin && (
          <>
            <div className="relative mb-12 w-full max-w-2xl mx-auto">
              <Carousel
                opts={{ loop: true, align: 'center' }}
                plugins={[autoplay.current]}
                onMouseEnter={() => autoplay.current?.stop?.()}
                onMouseLeave={() => autoplay.current?.play?.()}
                className="px-6 sm:px-8"
              >
                <CarouselContent>
                  {CATEGORIES.map((category) => (
                    <CarouselItem key={category} className="basis-auto pr-4">
                      <Button
                        variant={selectedCategory === category ? 'default' : 'ghost'}
                        onClick={() => setSelectedCategory(category)}
                        className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          selectedCategory === category
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50 hover:text-primary'
                        }`}
                        aria-pressed={selectedCategory === category}
                      >
                        {CATEGORY_LABELS[category]}
                      </Button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-0 top-1/2 -translate-y-1/2 shadow-sm" />
                <CarouselNext className="right-0 top-1/2 -translate-y-1/2 shadow-sm" />
              </Carousel>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {adminFilteredPlans.map((plan: TrainingPlan) => {
                const planName = getPlanDisplayName(plan.id, plan.name, isAdmin);
                const planDescription = getPlanDisplayDescription(
                  plan.id,
                  plan.description,
                  isAdmin
                );

                return (
                  <Link
                    key={plan.id}
                    href={`/plans/${plan.id}`}
                    className="group focus:outline-none"
                    aria-label={`Abrir plan: ${planName}`}
                  >
                    <Card className="flex h-full flex-col transition-transform group-hover:-translate-y-0.5">
                      <CardHeader>
                        <div>
                          <CardTitle>{planName}</CardTitle>
                          <CardDescription>{plan.duration}</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {planDescription}
                        </p>
                        <Button variant="outline" className="mt-auto">
                          Ver plan
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
