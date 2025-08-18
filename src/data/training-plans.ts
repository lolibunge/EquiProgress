export interface Exercise {
  name: string;
  description: string;
  duration?: string;
  reps?: string;
}

export type Category = 'Unbroke' | 'Retraining' | 'Continuing Training';

export interface TrainingPlan {
  id: string;
  category: Category; // keep stable keys
  name: string;
  description: string;
  duration: string;
  exercises: Exercise[];
}

// Spanish labels for categories (use for UI)
export const CATEGORY_LABELS_ES: Record<Category, string> = {
  Unbroke: 'Sin domar',
  Retraining: 'Reentrenamiento',
  'Continuing Training': 'Entrenamiento continuado',
};

export const trainingPlans: TrainingPlan[] = [
  {
    id: 'unbroke-1',
    category: 'Unbroke',
    name: 'Desde cero: caballo sin domar',
    description:
      'Proceso en 10 pasos para iniciar un caballo desde el suelo y construir una base sólida para un futuro compañero de monta.',
    duration: '10 pasos',
    exercises: [
      {
        name: 'Iniciación en el circular',
        description:
          'Introducí el trabajo en corral redondo o a la cuerda, marcando respeto por tu espacio y obediencia a comandos básicos.',
      },
      {
        name: 'Desensibilización',
        description:
          'Acostumbrá al caballo a objetos, sonidos y al tacto para ganar confianza y reducir reacciones de susto.',
      },
      {
        name: 'Sensibilización',
        description:
          'Enseñá a ceder a la presión física; base para responder a ayudas de pierna y rienda.',
      },
      {
        name: 'Sensibilización en movimiento',
        description:
          'Aplicá los ejercicios de ceder a la presión mientras se mueve para lograr control más fino.',
      },
      {
        name: 'Primera ensillada',
        description:
          'Presentá primero la manta sudadera y luego la montura, cuidando que se mantenga tranquilo y aceptando.',
      },
      {
        name: 'Trabajo pie a tierra',
        description:
          'Ejercicios desde el suelo con el caballo ensillado para prepararlo a responder a las ayudas.',
      },
      {
        name: 'Trabajo de rienda en mano',
        description:
          'Introducí la dirección y la detención desde el suelo utilizando las riendas.',
      },
      {
        name: 'Primera monta',
        description:
          'Primeras subidas enfocadas en que permanezca relajado e inmóvil mientras te montás.',
      },
      {
        name: 'Primera salida al exterior',
        description:
          'Paseos cortos en un lugar seguro/cerrado, practicando paso y giros simples.',
      },
      {
        name: 'Ejercicios montado con riendas',
        description:
          'Ejercicios básicos montado para dirigir, detener y avanzar con las ayudas del jinete.',
      },
    ],
  },
  {
    id: 'retraining-1',
    category: 'Retraining',
    name: 'Volver a lo básico: bajo montura',
    description:
      'Reestablecer comunicación clara y respuestas correctas bajo montura para un caballo con baches de entrenamiento o malos hábitos.',
    duration: '6 semanas',
    exercises: [
      {
        name: 'Flexión y suavidad',
        description:
          'Desde parado y al paso, pedí que afloje la mandíbula y flexione cuello lateral y verticalmente ante una presión suave de rienda.',
        duration: '10 min/sesión',
      },
      {
        name: 'Avanzar, parar y girar',
        description:
          'Buscá respuestas nítidas a las ayudas de asiento y pierna para transiciones hacia arriba y detenciones limpias desde el asiento. Guiá con piernas y asiento, no solo riendas.',
        duration: '20 min/sesión',
      },
      {
        name: 'Flexión básica en círculo',
        description:
          'Círculos grandes de 20 m al paso y trote, con flexión correcta desde la nuca hasta la cola siguiendo el arco.',
        duration: '15 min/sesión',
      },
      {
        name: 'Cesión a la pierna (introducción)',
        description:
          'Al paso, enseñá a desplazarse lateralmente alejándose de la presión de la pierna, empezando junto a la valla.',
        duration: '10 min/sesión',
      },
    ],
  },
  {
    id: 'continuing-1',
    category: 'Continuing Training',
    name: 'Mejorar flexibilidad y reunión',
    description:
      'Para caballos ya establecidos: desarrollo de ejercicios laterales y mejora de la auto-sustentación y el compromiso posterior.',
    duration: 'En curso',
    exercises: [
      {
        name: 'Hombro adentro',
        description:
          'Desplazá los hombros hacia adentro manteniendo flexión y ángulo constantes. Mejora la reunión y el trabajo del posterior interno.',
        reps: '4–6 veces por la pared larga en cada mano',
      },
      {
        name: 'Grupa adentro (travers)',
        description:
          'Desplazá las ancas hacia adentro. Complementa al hombro adentro y mejora la soltura del dorso.',
        reps: '4–6 veces por la pared larga en cada mano',
      },
      {
        name: 'Transiciones paso–galope–paso',
        description:
          'Desarrollan equilibrio y potencia desde el tren posterior. Buscá transiciones limpias y directas sin trote intermedio.',
        reps: '8–10 transiciones por sesión',
      },
      {
        name: 'Contragalope',
        description:
          'Galope “a la mano contraria” (p. ej., galope derecho en círculo a la izquierda). Excelente para equilibrio, rectitud y calidad del galope verdadero.',
        duration: '2–3 bucles por mano',
      },
    ],
  },
];