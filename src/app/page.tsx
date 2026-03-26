'use client';

import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useRef, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/logo';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { auth } from '@/lib/firebase';
import {
  canUserAccessPlan,
  getPlanDisplayDescription,
  getPlanDisplayName,
  isAdminUser,
} from '@/lib/plan-visibility';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0]);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isAdmin = isAdminUser(user);
  const filteredPlans = trainingPlans.filter((plan) => plan.category === selectedCategory);

  const autoplay = useRef(
    Autoplay({ delay: 2500, stopOnInteraction: false, stopOnMouseEnter: false, playOnInit: true })
  );

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      toast({
        title: 'Signed out',
        description: 'The student session is now closed.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not sign out',
        description: 'Please try again.',
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
              <span className="text-sm text-muted-foreground">Loading account...</span>
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline text-xs text-muted-foreground max-w-[14rem] truncate">
                  {user.displayName || user.email}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link href="/history">Historia</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </Button>
              </div>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Login</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow w-full container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-foreground">
            Planes de Entrenamiento para Caballos
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Desde iniciar un caballo joven hasta refinar movimientos avanzados, encuentra un plan que se adapte a tu viaje.
          </p>
        </div>

        {!loading && !user && (
          <Card className="mb-8 border-dashed">
            <CardHeader>
              <CardTitle>For your students</CardTitle>
              <CardDescription>
                Ask each student to create an account so their progress and history are saved per person.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href="/register">Create account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/reset-password">Reset password</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{isAdmin ? 'Modo administrador activo' : 'Modo estudiante activo'}</CardTitle>
              <CardDescription>
                {isAdmin
                  ? 'Puedes ver todos los planes y gestionar las asignaciones de estudiantes.'
                  : `El progreso esta vinculado a ${user.displayName || user.email}. Los planes bloqueados se muestran como no disponibles.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/history">Abrir historial de progreso</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && user && (
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
              {filteredPlans.map((plan: TrainingPlan) => {
                const canAccess = canUserAccessPlan(plan.id, isAdmin);
                const planName = getPlanDisplayName(plan.id, plan.name, isAdmin);
                const planDescription = getPlanDisplayDescription(
                  plan.id,
                  plan.description,
                  isAdmin
                );

                if (!canAccess) {
                  return (
                    <div key={plan.id} className="cursor-not-allowed">
                      <Card className="flex h-full flex-col opacity-70 border-dashed">
                        <CardHeader>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <CardTitle className="truncate">{plan.name}</CardTitle>
                              <CardDescription>{plan.duration}</CardDescription>
                            </div>
                            <Badge variant="secondary">No disponible</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <p className="text-muted-foreground mb-4 line-clamp-3">
                            {plan.description}
                          </p>
                          <Button variant="outline" className="mt-auto" disabled>
                            No disponible
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  );
                }

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
