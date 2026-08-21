'use client';

import Link from 'next/link';
import { Check, MessageSquare, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { SesionEntry } from '@/lib/sesiones-store';

// La tarjeta se completa con un solo toque -- nada de abrir un formulario
// para marcar que se hizo el ejercicio de hoy. El detalle técnico completo
// (objetivo, método, seguridad) sigue estando a un toque de distancia, en
// la ficha del ejercicio, no forzado de entrada.
export function SesionCard({
  sesion,
  caballoNombre,
  onToggle,
  disabled,
}: {
  sesion: SesionEntry;
  caballoNombre?: string | null;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const fichaHref = sesion.ejercicioId
    ? `/exercises/${sesion.ejercicioId}${sesion.planId ? `?from=${sesion.planId}` : ''}`
    : null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-primary/15 bg-card/80 p-3 transition-colors sm:p-4',
        sesion.completada && 'border-primary/30 bg-primary/5'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={sesion.completada}
        aria-label={sesion.completada ? `Marcar ${sesion.titulo} como no hecha` : `Marcar ${sesion.titulo} como hecha`}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-primary/40 text-primary transition-colors',
          sesion.completada && 'border-primary bg-primary text-primary-foreground',
          disabled && 'opacity-50'
        )}
      >
        {sesion.completada ? <Check className="h-4 w-4" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        {fichaHref ? (
          <Link href={fichaHref} className="truncate font-semibold hover:underline">
            {sesion.titulo}
          </Link>
        ) : (
          <p className="truncate font-semibold">{sesion.titulo}</p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {sesion.origen === 'personalizada' ? <span>Agregada por vos</span> : null}
          {caballoNombre ? <span>{caballoNombre}</span> : null}
          {sesion.calificacion ? (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3" /> {sesion.calificacion}/5
            </span>
          ) : null}
          {sesion.nota ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> nota
            </span>
          ) : null}
        </div>
      </div>

      {sesion.completada ? <span className="shrink-0 text-xs font-semibold text-primary">+{sesion.xp} XP</span> : null}
    </div>
  );
}
