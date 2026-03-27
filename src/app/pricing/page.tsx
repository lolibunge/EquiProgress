import Link from 'next/link';
import { Check } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PRICING, getTrialNotice } from '@/lib/pricing';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-headline font-extrabold">Prueba gratuita</h1>
          <p className="text-muted-foreground max-w-2xl">{getTrialNotice()}</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Qué incluye tu prueba de {PRICING.trialDays} días</CardTitle>
              <CardDescription>Acceso completo para validar la experiencia con tus estudiantes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="size-4 mt-0.5 text-primary" />
                  Acceso completo a los planes asignados
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 mt-0.5 text-primary" />
                  Historial de progreso por estudiante
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 mt-0.5 text-primary" />
                  Seguimiento diario y semanal del avance
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link href="/register">Comenzar prueba gratis</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Planes pagos: próximamente</CardTitle>
              <CardDescription>
                Cuando habilitemos la plataforma de pagos, podrás elegir entre plan mensual o anual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="size-4 mt-0.5 text-primary" />
                  Precio final por definir
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 mt-0.5 text-primary" />
                  Cobro mensual o anual
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 mt-0.5 text-primary" />
                  Facturación y gestión en plataforma segura
                </li>
              </ul>
              <Button className="w-full" variant="outline" disabled>
                Próximamente
              </Button>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Transparencia de la prueba</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Durante los primeros {PRICING.trialDays} días no se realiza ningún cobro.</p>
            <p>No se muestra precio definitivo hasta activar la plataforma de pagos.</p>
            <p>Antes de finalizar la prueba, te avisaremos cómo continuar con un plan pago.</p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild>
            <Link href="/register">Crear cuenta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
