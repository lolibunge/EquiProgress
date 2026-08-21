'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import type { Caballo } from '@/lib/caballos-store';
import { nuevaSesionPersonalizada, type SesionEntry, type SesionRating } from '@/lib/sesiones-store';

const SIN_CABALLO = '__sin-caballo__';
const NUEVO_CABALLO = '__nuevo-caballo__';
const CALIFICACIONES: SesionRating[] = [1, 2, 3, 4, 5];
const CALIFICACION_LABELS: Record<SesionRating, string> = {
  1: 'Muy floja',
  2: 'Floja',
  3: 'Normal',
  4: 'Buena',
  5: 'Muy buena',
};

// Equivalente de "Registrar actividad" en Move: un formulario corto para
// sumar algo que no estaba en el plan del día -- una sola calificación
// opcional, una nota opcional, nada de las 7 escalas del diario viejo.
export function AgregarSesionDialog({
  fecha,
  caballos,
  caballoPorDefectoId,
  onCrearCaballo,
  onGuardar,
}: {
  fecha: string;
  caballos: Caballo[];
  caballoPorDefectoId?: string | null;
  onCrearCaballo: (nombre: string) => Promise<Caballo>;
  onGuardar: (sesion: SesionEntry) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [caballoId, setCaballoId] = useState<string>(caballoPorDefectoId ?? SIN_CABALLO);
  const [creandoCaballo, setCreandoCaballo] = useState(false);
  const [nombreCaballoNuevo, setNombreCaballoNuevo] = useState('');
  const [calificacion, setCalificacion] = useState<string>('');
  const [nota, setNota] = useState('');
  const [hecha, setHecha] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitulo('');
    setCaballoId(caballoPorDefectoId ?? SIN_CABALLO);
    setCreandoCaballo(false);
    setNombreCaballoNuevo('');
    setCalificacion('');
    setNota('');
    setHecha(true);
    setError(null);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!titulo.trim()) {
      setError('Ponele un título a la sesión.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const sesion = nuevaSesionPersonalizada({
        fecha,
        titulo,
        caballoId: caballoId === SIN_CABALLO ? null : caballoId,
        calificacion: calificacion ? (Number(calificacion) as SesionRating) : null,
        nota,
        completada: hecha,
      });

      await onGuardar(sesion);
      resetForm();
      setOpen(false);
    } catch {
      setError('No se pudo guardar la sesión. Probá de nuevo.');
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
          <Plus className="h-4 w-4" />
          Agregar sesión
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar una sesión</DialogTitle>
          <DialogDescription>
            Para algo que hiciste hoy y no estaba en el plan. Solo lo esencial.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="sesion-titulo">¿Qué hiciste?</Label>
            <Input
              id="sesion-titulo"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ej: Longuear en el picadero"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Caballo</Label>
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
                <Button type="button" size="sm" variant="ghost" onClick={() => setCreandoCaballo(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Select value={caballoId} onValueChange={handleCaballoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí un caballo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_CABALLO}>Sin caballo</SelectItem>
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

          <div className="space-y-2">
            <Label>¿Cómo salió? (opcional)</Label>
            <Select value={calificacion} onValueChange={setCalificacion}>
              <SelectTrigger>
                <SelectValue placeholder="Sin calificar" />
              </SelectTrigger>
              <SelectContent>
                {CALIFICACIONES.map((valor) => (
                  <SelectItem key={valor} value={String(valor)}>
                    {valor} - {CALIFICACION_LABELS[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sesion-nota">Nota (opcional)</Label>
            <Textarea
              id="sesion-nota"
              value={nota}
              onChange={(event) => setNota(event.target.value)}
              placeholder="Algo que quieras recordar para la próxima"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="sesion-hecha" checked={hecha} onCheckedChange={(checked) => setHecha(checked === true)} />
            <Label htmlFor="sesion-hecha">Ya la hice</Label>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar sesión'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
