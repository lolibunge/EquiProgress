'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CATEGORIES, CATEGORY_LABELS_ES, trainingPlans, type Category } from '@/data/training-plans';
import {
  crearPlanPersonalizado,
  diasEntrenoParaCantidad,
  idActivoDePlanPersonalizado,
  setActivePlanId,
} from '@/lib/planes-personalizados-store';

const OPCIONES_DIAS = [2, 3, 4, 5];

// El equivalente al generador de programa de Move, pero en vez de inventar
// ejercicios sueltos, arma el plan a partir del catálogo curado de la
// instructora: se elige la categoría que mejor describe lo que necesita
// trabajar el caballo, y el plan de esa categoría se activa con la
// frecuencia semanal que el alumno puede sostener.
export function ArmarPlanDialog({ uid, onCreado }: { uid: string; onCreado: () => void }) {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState<Category | null>(null);
  const [dias, setDias] = useState(3);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planSugerido = categoria ? trainingPlans.find((plan) => plan.category === categoria) ?? null : null;

  function resetForm() {
    setCategoria(null);
    setDias(3);
    setNombre('');
    setError(null);
  }

  async function handleConfirmar() {
    if (!categoria) {
      setError('Elegí qué le cuesta a tu caballo hoy.');
      return;
    }

    if (!planSugerido) {
      setError('Todavía no hay un plan de esa categoría en el catálogo.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const nombreFinal = nombre.trim() || `${CATEGORY_LABELS_ES[categoria]} a mi ritmo`;
      const plan = await crearPlanPersonalizado(uid, {
        planBaseId: planSugerido.id,
        nombre: nombreFinal,
        diasEntrenoSemana: diasEntrenoParaCantidad(dias),
      });

      await setActivePlanId(uid, idActivoDePlanPersonalizado(plan.id));
      resetForm();
      setOpen(false);
      onCreado();
    } catch {
      setError('No se pudo armar el plan. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Armar mi plan
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Armá tu plan</DialogTitle>
          <DialogDescription>
            Contanos qué necesitás trabajar y con qué frecuencia podés entrenar, y armamos un plan a partir
            del catálogo de tu instructora.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>¿Qué te cuesta hoy con tu caballo?</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CATEGORIES.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setCategoria(opcion)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                    categoria === opcion
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {CATEGORY_LABELS_ES[opcion]}
                </button>
              ))}
            </div>
          </div>

          {planSugerido ? (
            <p className="text-sm text-muted-foreground">
              Plan sugerido: <span className="font-medium text-foreground">{planSugerido.name}</span>
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>¿Cuántos días por semana podés entrenar?</Label>
            <div className="flex gap-2">
              {OPCIONES_DIAS.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setDias(opcion)}
                  className={cn(
                    'h-10 w-10 rounded-full border text-sm font-semibold transition-colors',
                    dias === opcion ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
                  )}
                >
                  {opcion}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-nombre">Nombre del plan (opcional)</Label>
            <Input
              id="plan-nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder={planSugerido ? `${planSugerido.name} a mi ritmo` : 'Mi plan'}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleConfirmar} disabled={guardando}>
            {guardando ? 'Armando...' : 'Activar este plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
