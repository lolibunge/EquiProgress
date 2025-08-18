
'use client';

import { trainingPlans, TrainingPlan, Exercise } from '@/data/training-plans';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useState } from 'react';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<'Unbroke' | 'Retraining' | 'Continuing Training'>('Unbroke');

  const filteredPlans = trainingPlans.filter(plan => plan.category === selectedCategory);

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
              Equestrian Training Plans
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              From starting a young horse to refining advanced movements, find a plan that fits your journey.
            </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="p-1 rounded-lg bg-muted flex gap-1">
            {(['Desde cero: caballo sin domar', 'Volver a lo básico: bajo montura', 'Mejorar flexibilidad y reunión'] as const).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'ghost'}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/50'
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPlans.map((plan: TrainingPlan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.duration}</CardDescription>
                  </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground mb-4">{plan.description}</p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="exercises">
                    <AccordionTrigger>View Exercises</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-4 pt-2">
                        {plan.exercises.map((exercise: Exercise, index: number) => (
                          <li key={index} className="border-l-2 border-primary pl-4">
                            <h4 className="font-semibold">{exercise.name}</h4>
                            <p className="text-sm text-muted-foreground">{exercise.description}</p>
                            {exercise.duration && <p className="text-xs text-muted-foreground/80">Duration: {exercise.duration}</p>}
                            {exercise.reps && <p className="text-xs text-muted-foreground/80">Reps: {exercise.reps}</p>}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
