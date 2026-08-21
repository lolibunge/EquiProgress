'use client';

import { useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';

import { armarPlanCaballo } from '@/ai/flows/armar-plan-caballo';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CATEGORIES, CATEGORY_LABELS_ES, trainingPlans, type Category } from '@/data/training-plans';
import type { Caballo } from '@/lib/caballos-store';
import {
  crearPlanPersonalizado,
  diasEntrenoParaCantidad,
  idActivoDePlanPersonalizado,
  setActivePlanIdParaCaballo,
} from '@/lib/planes-personalizados-store';

const OPCIONES_DIAS = [1, 2, 3, 4, 5, 6, 7];
const SEMANAS_POR_DEFECTO = 8;
const NUEVO_CABALLO = '__nuevo-caballo__';

type Sugerencia = {
  planBaseId: string;
  nombreSugerido: string;
  resumen: string;
};

// El equivalente al generador de programa de Move, pero en vez de inventar
// ejercicios sueltos, arma el plan a partir del catálogo curado de la
// instructora. Cada plan se arma PARA un caballo puntual (un alumno o la
// instructora puede tener varios entrenando en paralelo, cada uno con sus
// propias necesidades). Dos formas de llegar al plan:
//  - "Con IA": contás en tus palabras qué le pasa al caballo y qué resultado
//    buscás, y un modelo de lenguaje elige el plan del catálogo que mejor
//    encaja (nunca inventa ejercicios nuevos, solo elige entre los ids que
//    le pasamos).
//  - "Manual": el selector de categoría original, para cuando no hay IA
//    configurada o se prefiere elegir a mano.
export function ArmarPlanDialog({
  uid,
  caballos,
  caballoPorDefectoId,
  onCrearCaballo,
  onCreado,
}: {
  uid: string;
  caballos: Caballo[];
  caballoPorDefectoId?: string | null;
  onCrearCaballo: (nombre: string) => Promise<Caballo>;
  onCreado: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<'ia' | 'manual'>('ia');
  const [dias, setDias] = useState(5);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Caballo (obligatorio: el plan siempre es de un caballo puntual) ---
  const [caballoId, setCaballoId] = useState<string | null>(caballoPorDefectoId ?? caballos[0]?.id ?? null);
  const [creandoCaballo, setCreandoCaballo] = useState(caballos.length === 0);
  const [nombreCaballoNuevo, setNombreCaballoNuevo] = useState('');

  // --- Modo IA -------------------------------------------------------
  const [descripcionCaballo, setDescripcionCaballo] = useState('');
  const [resultadoDeseado, setResultadoDeseado] = useState('');
  const [semanasObjetivo, setSemanasObjetivo] = useState(SEMANAS_POR_DEFECTO);
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);
  const [buscandoSugerencia, setBuscandoSugerencia] = useState(false);

  // --- Modo manual -----------------------------------------------------
  const [categoria, setCategoria] = useState<Category | null>(null);
  const planSugeridoManual = categoria ? trainingPlans.find((plan) => plan.category === categoria) ?? null : null;

  function resetForm() {
    setModo('ia');
    setDias(5);
    setNombre('');
    setError(null);
    setCaballoId(caballoPorDefectoId ?? caballos[0]?.id ?? null);
    setCreandoCaballo(caballos.length === 0);
    setNombreCaballoNuevo('');
    setDescripcionCaballo('');
    setResultadoDeseado('');
    setSemanasObjetivo(SEMANAS_POR_DEFECTO);
    setSugerencia(null);
    setBuscandoSugerencia(false);
    setCategoria(null);
  }

  async function handleCaballoChange(value: string) {
    if (value === NUEVO_CABALLO) {
      setCreandoCaballo(true);
      return;
    }
    setCaballoId(value);
  }

  async function handleCrearCaballo() {
    if (!nombreCaballoNuevo.trim()) {
      setError('Ponele un nombre al caballo.');
      return;
    }

    try {
      const caballo = await onCrearCaballo(nombreCaballoNuevo.trim());
      setCaballoId(caballo.id);
      setCreandoCaballo(false);
      setNombreCaballoNuevo('');
      setError(null);
    } catch {
      setError('No se pudo crear el caballo. Probá de nuevo.');
    }
  }

  async function handleSugerirConIA() {
    if (!descripcionCaballo.trim()) {
      setError('Contanos qué le pasa a tu caballo primero.');
      return;
    }

    setBuscandoSugerencia(true);
    setError(null);
    setSugerencia(null);

    try {
      const respuesta = await armarPlanCaballo({
        descripcionCaballo: descripcionCaballo.trim(),
        resultadoDeseado: resultadoDeseado.trim() || 'Mejorar la confianza y el trabajo de base del caballo.',
        semanasObjetivo,
        diasPorSemana: dias,
        catalogo: trainingPlans.map((plan) => ({
          id: plan.id,
          nombre: plan.name,
          categoria: plan.category,
          descripcion: plan.description,
        })),
      });

      const planValido = trainingPlans.some((plan) => plan.id === respuesta.planBaseId);
      if (!planValido) {
        setError('La IA sugirió un plan que no reconozco. Probá de nuevo o elegí manualmente.');
        return;
      }

      setSugerencia(respuesta);
      if (!nombre.trim()) setNombre(respuesta.nombreSugerido);
    } catch {
      setError(
        'No se pudo pedir la sugerencia (revisá que la IA esté configurada). Podés elegir manualmente mientras tanto.'
      );
    } finally {
      setBuscandoSugerencia(false);
    }
  }

  async function handleConfirmarIA() {
    if (!caballoId) {
      setError('Elegí para qué caballo es este plan.');
      return;
    }
    if (!sugerencia) return;

    setGuardando(true);
    setError(null);

    try {
      const plan = await crearPlanPersonalizado(uid, {
        planBaseId: sugerencia.planBaseId,
        nombre: nombre.trim() || sugerencia.nombreSugerido,
        diasEntrenoSemana: diasEntrenoParaCantidad(dias),
        caballoId,
        descripcionCaballo,
        resultadoDeseado,
        semanasObjetivo,
      });

      await setActivePlanIdParaCaballo(uid, caballoId, idActivoDePlanPersonalizado(plan.id));
      resetForm();
      setOpen(false);
      onCreado();
    } catch {
      setError('No se pudo armar el plan. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  async function handleConfirmarManual() {
    if (!caballoId) {
      setError('Elegí para qué caballo es este plan.');
      return;
    }

    if (!categoria) {
      setError('Elegí qué le cuesta a tu caballo hoy.');
      return;
    }

    if (!planSugeridoManual) {
      setError('Todavía no hay un plan de esa categoría en el catálogo.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const nombreFinal = nombre.trim() || `${CATEGORY_LABELS_ES[categoria]} a mi ritmo`;
      const plan = await crearPlanPersonalizado(uid, {
        planBaseId: planSugeridoManual.id,
        nombre: nombreFinal,
        diasEntrenoSemana: diasEntrenoParaCantidad(dias),
        caballoId,
      });

      await setActivePlanIdParaCaballo(uid, caballoId, idActivoDePlanPersonalizado(plan.id));
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

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Armá tu plan</DialogTitle>
          <DialogDescription>
            Contanos qué necesitás trabajar y con qué frecuencia podés entrenar, y armamos un plan a partir
            del catálogo de tu instructora.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>¿Para qué caballo es este plan?</Label>
          {creandoCaballo ? (
            <div className="flex gap-2">
              <Input
                value={nombreCaballoNuevo}
                onChange={(event) => setNombreCaballoNuevo(event.target.value)}
                placeholder="Nombre del caballo"
                autoFocus
              />
              <Button type="button" size="sm" onClick={handleCrearCaballo}>
                Crear
              </Button>
              {caballos.length > 0 ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setCreandoCaballo(false)}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          ) : (
            <Select value={caballoId ?? undefined} onValueChange={handleCaballoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Elegí un caballo" />
              </SelectTrigger>
              <SelectContent>
                {caballos.map((caballo) => (
                  <SelectItem key={caballo.id} value={caballo.id}>
                    {caballo.nombre}
                  </SelectItem>
                ))}
                <SelectItem value={NUEVO_CABALLO}>+ Nuevo caballo...</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs value={modo} onValueChange={(value) => setModo(value as 'ia' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ia">Contame tu caso (IA)</TabsTrigger>
            <TabsTrigger value="manual">Elegir categoría</TabsTrigger>
          </TabsList>

          <TabsContent value="ia" className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion-caballo">¿Qué le pasa a tu caballo hoy?</Label>
              <Textarea
                id="descripcion-caballo"
                value={descripcionCaballo}
                onChange={(event) => setDescripcionCaballo(event.target.value)}
                placeholder='Ej: "Es un caballo mayor, temperamental, le cuesta aceptar la montura sin corcovear. Ya lo monté un par de veces sin problema, pero se pone nervioso con ruidos fuertes."'
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resultado-deseado">¿Qué resultado te gustaría ver?</Label>
              <Textarea
                id="resultado-deseado"
                value={resultadoDeseado}
                onChange={(event) => setResultadoDeseado(event.target.value)}
                placeholder='Ej: "Que acepte la montura tranquilo y no reaccione ante ruidos inesperados."'
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="semanas-objetivo">¿Cuántas semanas?</Label>
                <Input
                  id="semanas-objetivo"
                  type="number"
                  min={1}
                  max={52}
                  value={semanasObjetivo}
                  onChange={(event) => setSemanasObjetivo(Math.max(1, Math.min(52, Number(event.target.value) || 1)))}
                />
              </div>
              <div className="space-y-2">
                <Label>¿Días por semana?</Label>
                <div className="flex flex-wrap gap-1.5">
                  {OPCIONES_DIAS.map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setDias(opcion)}
                      className={cn(
                        'h-9 w-9 rounded-full border text-sm font-semibold transition-colors',
                        dias === opcion
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2"
              onClick={handleSugerirConIA}
              disabled={buscandoSugerencia}
            >
              <Wand2 className="h-4 w-4" />
              {buscandoSugerencia ? 'Pensando un plan...' : 'Sugerir con IA'}
            </Button>

            {sugerencia ? (
              <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-nombre-ia">Nombre del plan</Label>
                  <Input id="plan-nombre-ia" value={nombre} onChange={(event) => setNombre(event.target.value)} />
                </div>
                <p className="text-sm text-muted-foreground">{sugerencia.resumen}</p>
                <p className="text-xs text-muted-foreground">
                  Basado en:{' '}
                  <span className="font-medium text-foreground">
                    {trainingPlans.find((plan) => plan.id === sugerencia.planBaseId)?.name}
                  </span>
                </p>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="manual" className="space-y-5 pt-4">
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

            {planSugeridoManual ? (
              <p className="text-sm text-muted-foreground">
                Plan sugerido: <span className="font-medium text-foreground">{planSugeridoManual.name}</span>
              </p>
            ) : null}

            <div className="space-y-2">
              <Label>¿Cuántos días por semana podés entrenar?</Label>
              <div className="flex flex-wrap gap-1.5">
                {OPCIONES_DIAS.map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => setDias(opcion)}
                    className={cn(
                      'h-9 w-9 rounded-full border text-sm font-semibold transition-colors',
                      dias === opcion
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    {opcion}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-nombre-manual">Nombre del plan (opcional)</Label>
              <Input
                id="plan-nombre-manual"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder={planSugeridoManual ? `${planSugeridoManual.name} a mi ritmo` : 'Mi plan'}
              />
            </div>
          </TabsContent>
        </Tabs>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          {modo === 'ia' ? (
            <Button type="button" onClick={handleConfirmarIA} disabled={guardando || !sugerencia}>
              {guardando ? 'Armando...' : 'Activar este plan'}
            </Button>
          ) : (
            <Button type="button" onClick={handleConfirmarManual} disabled={guardando}>
              {guardando ? 'Armando...' : 'Activar este plan'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
