'use client';

import Link from 'next/link'; // 👈 importante
import {
  trainingPlans,
  type TrainingPlan,
  type Exercise,
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
} from '@/data/training-plans';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useState, useRef } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0]);

  const filteredPlans = trainingPlans.filter(plan => plan.category === selectedCategory);

  const autoplay = useRef(
    Autoplay({ delay: 2500, stopOnInteraction: false, stopOnMouseEnter: false, playOnInit: true })
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex flex-col antialiased">
      <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Logo className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-headline font-bold text-foreground tracking-tight">EquiProgress</h1>
            </div>
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

        {/* Carrusel de categorías (igual que antes) */}
        <div className="relative mb-12 w-full max-w-2xl mx-auto">
          <Carousel
            opts={{ loop: true, align: 'center' }}
            plugins={[autoplay.current]}
            onMouseEnter={autoplay.current.stop}
            onMouseLeave={() => autoplay.current.play()}
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

        {/* Grid de planes: tarjeta clickable que navega a /plans/[id] */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPlans.map((plan: TrainingPlan) => (
            <Link
              key={plan.id}
              href={`/plans/${plan.id}`}
              className="group focus:outline-none"
              aria-label={`Abrir plan: ${plan.name}`}
            >
              <Card className="flex h-full flex-col transition-transform group-hover:-translate-y-0.5">
                <CardHeader>
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.duration}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {plan.description}
                  </p>

                  {/* CTA visible para reforzar que es clickable */}
                  <Button variant="outline" className="mt-auto">
                    Ver plan
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}