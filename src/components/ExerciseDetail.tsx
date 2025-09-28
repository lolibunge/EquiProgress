import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, AlertTriangle, Clock, ListChecks, Target, Info } from "lucide-react";

/**
 * Tipo sugerido para los ejercicios (coincide con el esquema extendido que propusimos)
 */
export type Exercise = {
  id: string;
  name: string;
  image?: string;
  description?: string; // legacy
  objective?: string;
  method?: string[];
  cues?: string[];
  gear?: string[];
  duration?: string;
  prerequisites?: string[];
  safety?: string[];
  progressSigns?: { label: string; details?: string }[];
  advanceCriteria?: string[];
};

/**
 * Ejemplo completo: Leading
 */
const exerciseLeading: Exercise = {
  id: "leading",
  name: "Leading",
  image: "/plans/exercise/leading.png",
  description: "Respuestas básicas a la cuerda.",
  objective:
    "Respuestas claras a la cuerda respetando el espacio personal del guía.",
  method: [
    "Enseñar avanzar con ligera tensión y liberar al primer paso.",
    "Parar elevando tu energía hacia atrás + micro tensión; liberar al detener.",
    "Girar hombros/ancas con indicación mínima de cuerda y posición corporal.",
  ],
  cues: [
    "Micro-tensión en cuerda",
    "Postura (adelante/atrás)",
    "Voz baja para parar",
  ],
  gear: ["Cabestro", "Cuerda 3–4 m"],
  duration: "8–10 min",
  prerequisites: ["Desensibilización I/II estables"],
  safety: [
    "No envolver la cuerda en la mano",
    "Mantener zona libre delante",
  ],
  progressSigns: [
    { label: "Señales pequeñas bastan" },
    { label: "Ritmo y distancia constantes" },
  ],
  advanceCriteria: [
    "Avanza/para con indicaciones sutiles",
    "Gira derecha/izquierda sin tracción constante",
  ],
};

/**
 * Componente: Hoja/Detalle de ejercicio
 */
function SectionTitle({ icon: Icon, children }: { icon?: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      <span>{children}</span>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="rounded-2xl px-3 py-1 text-xs">
      {children}
    </Badge>
  );
}

function LabeledList({
  items,
  icon,
  emptyText,
}: {
  items?: string[];
  icon?: any;
  emptyText?: string;
}) {
  if (!items || items.length === 0) {
    return emptyText ? (
      <p className="text-sm text-muted-foreground">{emptyText}</p>
    ) : null;
  }
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {items.map((line, i) => (
        <li key={i} className="leading-relaxed">
          {line}
        </li>
      ))}
    </ul>
  );
}

function SignalsList({
  items,
}: {
  items?: { label: string; details?: string }[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((s, i) => (
        <li key={i} className="flex items-start gap-2 rounded-xl border p-3 text-sm">
          <Check className="mt-0.5 size-4" aria-hidden />
          <div>
            <div className="font-medium">{s.label}</div>
            {s.details ? (
              <div className="text-muted-foreground">{s.details}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  const desc = useMemo(() => exercise.objective ?? exercise.description ?? "", [exercise]);

  return (
    <Card className="max-w-3xl mx-auto shadow-sm">
      <CardHeader className="gap-2">
        <div className="flex items-center gap-3">
          {exercise.image ? (
            <img
              src={exercise.image}
              alt={exercise.name}
              className="size-14 rounded-xl object-cover"
            />
          ) : null}
          <div>
            <CardTitle className="text-xl">{exercise.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2">
          {exercise.duration ? (
            <Pill>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> {exercise.duration}
              </span>
            </Pill>
          ) : null}
          {exercise.gear?.map((g, i) => (
            <Pill key={i}>{g}</Pill>
          ))}
        </div>

        <Separator />

        {/* Objetivo */}
        {exercise.objective ? (
          <div className="space-y-2">
            <SectionTitle icon={Target}>Objetivo</SectionTitle>
            <p className="text-sm leading-relaxed">{exercise.objective}</p>
          </div>
        ) : null}

        {/* Método */}
        <div className="space-y-2">
          <SectionTitle icon={ListChecks}>Cómo se hace</SectionTitle>
          <LabeledList items={exercise.method} emptyText="Sin pasos definidos aún." />
        </div>

        {/* Cues / Prerrequisitos */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <SectionTitle icon={Info}>Ayudas / Cues</SectionTitle>
            <LabeledList items={exercise.cues} emptyText="—" />
          </div>
          <div className="space-y-2">
            <SectionTitle icon={Info}>Prerrequisitos</SectionTitle>
            <LabeledList items={exercise.prerequisites} emptyText="—" />
          </div>
        </div>

        {/* Seguridad */}
        {exercise.safety?.length ? (
          <div className="space-y-2">
            <SectionTitle icon={AlertTriangle}>Seguridad</SectionTitle>
            <LabeledList items={exercise.safety} />
          </div>
        ) : null}

        {/* Progreso */}
        {exercise.progressSigns?.length ? (
          <div className="space-y-2">
            <SectionTitle icon={Check}>Señales de progreso</SectionTitle>
            <SignalsList items={exercise.progressSigns} />
          </div>
        ) : null}

        {/* Criterios para avanzar */}
        {exercise.advanceCriteria?.length ? (
          <div className="space-y-2">
            <SectionTitle icon={Check}>Criterios para avanzar</SectionTitle>
            <LabeledList items={exercise.advanceCriteria} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Demo/Preview: renderiza la ficha de Leading.
 * En tu app real, pasarías `exercise` desde tu store/estado y reusarías <ExerciseDetail />
 */
export default function Demo() {
  return (
    <main className="p-6 sm:p-10 bg-background min-h-screen">
      <div className="mx-auto max-w-3xl mb-6">
        <h1 className="text-2xl font-semibold">Ficha de ejercicio</h1>
        <p className="text-muted-foreground">Vista detallada del ejercicio seleccionado</p>
      </div>
      <ExerciseDetail exercise={exerciseLeading} />
    </main>
  );
}
