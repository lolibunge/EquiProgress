export interface Exercise {
  id: string;
  name: string;
  image?: string;
  // LEGADO
  description?: string;

  // NUEVO (ficha técnica)
  objective?: string;        // Objetivo
  method?: string[];         // Pasos / Método
  cues?: string[];           // Ayudas / señales del guía
  gear?: string[];           // Material: cabestro, stick, etc.
  duration?: string;         // Tiempo sugerido por sesión
  prerequisites?: string[];  // Requisitos previos
  safety?: string[];         // Seguridad / consideraciones
  progressSigns?: Signal[];  // Señales de progreso
  advanceCriteria?: string[];// Criterios para pasar de fase
};

export type PlanStage = {
  week: number;            // 1, 2, 3...
  title?: string;          // opcional (“Fundamentos”, etc.)
  description: string;     // qué se busca esta semana
  exerciseIds?: string[];  // opcional: ejercicios destacados esta semana
};


export type Category = 'Unbroke' | 'Retraining' | 'Continuing Training';

export type TrainingPlan = {
  id: string;
  name: string;
  description: string;
  duration: string;  // p.ej. “6 semanas”
  weeks: number;     // << nuevo (para cálculos/timeline)
  image?: string;    // << nuevo (hero del detalle)
  category: Category;
  exercises: Exercise[];
  stages?: PlanStage[]; // << nuevo (semanas/etapas)
};

// Spanish labels for categories (use for UI)
export const CATEGORY_LABELS_ES: Record<Category, string> = {
  Unbroke: 'Sin domar',
  Retraining: 'Reentrenamiento',
  'Continuing Training': 'Entrenamiento continuado',
};

export const trainingPlans: TrainingPlan[] = [
    {
    id: "iniciacion-joven",
    name: "Iniciación Caballo Joven",
    description: "Base sólida: conexión, desensibilización y primeras respuestas.",
    duration: "6 semanas",
    weeks: 6,
    image: "/plans/plan-de-iniciacion-caballo-joven.png",
    category: "Unbroke",
    exercises: [
      {
        id: "libertad",
        name: "Trabajo en libertad",
        image: "/plans/exercise/libertad.png",
        objective: "Generar vínculo, atención y autorregulación sin herramientas.",
        method: [
          "Iniciar en corral/redondo, permitir explorar y observar lenguaje corporal.",
          "Proponer cambios suaves de dirección y ritmo con tu postura y energía.",
          "Recompensar mirar, acercarse, bajar la cabeza y regular el impulso."
        ],
        cues: ["Posición del cuerpo (invitar/alejar)", "Mirada suave", "Respiración lenta"],
        gear: ["Corral/redondo seguro"],
        duration: "10–15 min",
        prerequisites: [],
        safety: ["Evitar rincones con objetos que puedan golpear", "Mantener salida libre"],
        progressSigns: [
          { label: "Enganche", details: "Te busca y te sigue por iniciativa propia" },
          { label: "Regulación", details: "Pasa de activo a calmado sin perder conexión" }
        ],
        advanceCriteria: [
          "Responde a cambios de dirección con fluidez",
          "Mantiene atención 2–3 minutos seguidos"
        ]
      },
      {
        id: "desens",
        name: "Desensibilización I",
        image: "/plans/exercise/desens.png",
        objective: "Aceptar estímulos básicos en estático sin tensión.",
        method: [
          "Aplicar estímulos suaves con stick & string y mano (cuello, hombro, dorso).",
          "Esperar señal de relajación y retirar estímulo (principio presión–liberación).",
          "Repetir en ambos lados y zonas simétricas."
        ],
        cues: ["Tocar–retirar", "Ritmo constante", "Exhalar al relajar"],
        gear: ["Cabestro", "Stick & string"],
        duration: "10–12 min",
        prerequisites: [],
        safety: ["Evitar golpes con la cuerda", "No avanzar si hay tensión alta"],
        progressSigns: [
          { label: "Relaja cuello y dorso" },
          { label: "Baja la cabeza" },
          { label: "Respiración más lenta" }
        ],
        advanceCriteria: [
          "Tolera contacto en 5–6 zonas sin mover los pies",
          "Recupera la calma en < 5 segundos tras un pequeño sobresalto"
        ]
      },
      {
        id: "desens2",
        name: "Desensibilización II",
        image: "/plans/exercise/desens.png",
        objective: "Generalizar la aceptación de estímulos en movimiento.",
        method: [
          "Mover cuerda y string alrededor del cuerpo mientras camina a tu lado.",
          "Pasar la cuerda por cuello, dorso y grupa, manteniendo ritmo parejo.",
          "Intercalar paradas y reinicios suaves conservando la calma."
        ],
        cues: ["Caminar a la par", "Transiciones cortas", "Voz neutra"],
        gear: ["Cabestro", "Cuerda 3–4 m", "Stick & string"],
        duration: "10–12 min",
        prerequisites: ["Desensibilización I aceptada en estático"],
        safety: ["Evitar enredos con la cuerda", "Zonas despejadas"],
        progressSigns: [
          { label: "Calma en movimiento" },
          { label: "Recuperación rápida tras estímulos" }
        ],
        advanceCriteria: [
          "Mantiene paso regular con estímulos oscilantes",
          "Tolera cuerda sobre grupa y dorso sin acelerar"
        ]
      },
      {
        id: "leading",
        name: "Leading",
        image: "/plans/exercise/leading.png",
        objective: "Respuestas claras a la cuerda respetando el espacio personal.",
        method: [
          "Enseñar avanzar con ligera tensión y liberar al primer paso.",
          "Parar elevando tu energía hacia atrás + micro tensión, liberar al detener.",
          "Girar hombros/ancas con indicación mínima de cuerda y posición corporal."
        ],
        cues: ["Micro-tensión en cuerda", "Postura (adelante/atrás)", "Voz baja para parar"],
        gear: ["Cabestro", "Cuerda 3–4 m"],
        duration: "8–10 min",
        prerequisites: ["Desensibilización I/II estables"],
        safety: ["No envolver la cuerda en la mano", "Mantener zona libre delante"],
        progressSigns: [
          { label: "Responde a señales pequeñas" },
          { label: "Mantiene ritmo y distancia sin invadir" }
        ],
        advanceCriteria: [
          "Avanza/para con indicaciones sutiles",
          "Gira derecha/izquierda sin tracción constante"
        ]
      },
      {
        id: "transition",
        name: "Transiciones",
        image: "/plans/exercise/leading.png",
        objective: "Suavidad y control en cambios de marcha (paso↔trote) con atención sostenida.",
        method: [
          "Secuenciar paso–trote–paso en líneas rectas cortas.",
          "Usar respiración/voz como prefijo y cuerda mínima como refuerzo.",
          "Aumentar duración y reducir ayuda hasta que anticipe con tu cuerpo."
        ],
        cues: ["Exhalar para volver a paso", "Tono de voz para subir", "Micro gesto de hombros"],
        gear: ["Cabestro", "Cuerda 3–4 m"],
        duration: "8–12 min",
        prerequisites: ["Leading consistente"],
        safety: ["Evitar suelos resbaladizos", "Intervalos cortos si sube el estrés"],
        progressSigns: [
          { label: "Transiciones limpias, sin tirones" },
          { label: "Mantiene foco tras 4–6 cambios seguidos" }
        ],
        advanceCriteria: [
          "Responde a voz/postura > cuerda",
          "Recupera la calma al paso en 2–3 pasos"
        ]
      },
      {
        id: "integration",
        name: "Integración",
        image: "/plans/exercise/leading.png",
        objective: "Unir los ejercicios en una secuencia fluida y coherente.",
        method: [
          "Secuencia tipo: libertad (conexión) → desens I/II (calma) → leading (dirección) → transiciones (control).",
          "Mantener pausas breves de respiración y rascado en puntos de éxito.",
          "Cerrar con vuelta a la calma y chequeo de señales corporales."
        ],
        cues: ["Rutina clara", "Pausas conscientes", "Criterio de calidad antes de avanzar"],
        gear: ["Cabestro", "Cuerda", "Stick & string"],
        duration: "12–15 min",
        prerequisites: ["Libertad, Desens I/II y Leading básicos"],
        safety: ["Dosificar para evitar fatiga mental", "Cortar si hay tensión sostenida"],
        progressSigns: [
          { label: "Fluidez", details: "Pasa de un ejercicio a otro sin perder calma" },
          { label: "Conexión estable", details: "Recupera atención tras estímulos" }
        ],
        advanceCriteria: [
          "Secuencia completa sin picos de tensión",
          "Respuestas mayormente con ayudas sutiles"
        ]
      }
    ],
    stages: [
      { week: 1, title: "Vínculo", description: "Trabajo en libertad + lectura de señales.", exerciseIds: ["libertad"] },
      { week: 2, title: "Desensibilización I", description: "Zonas de contacto, presión/soltar.", exerciseIds: ["desens"] },
      { week: 3, title: "Desensibilización II", description: "Generalizar estímulos en movimiento.", exerciseIds: ["desens2"] },
      { week: 4, title: "Leading", description: "Parar/Avanzar/Derecha/Izquierda a pie.", exerciseIds: ["leading"] },
      { week: 5, title: "Transiciones", description: "Cambios suaves, atención sostenida.", exerciseIds: ["transition"] },
      { week: 6, title: "Integración", description: "Secuencia fluida de ejercicios base.", exerciseIds: ["integration"] }
    ]
  },
    // 🔧 Retraining
  {
    id: 'retraining',
    category: 'Retraining',
    name: 'Volver a lo básico: bajo montura',
    description:
      'Reestablecer comunicación clara y respuestas correctas bajo montura para un caballo con baches de entrenamiento o malos hábitos.',
    duration: '6 semanas',
    weeks: 6,
    image: '/plans/retraining.png',
    exercises: [
      {
        id: 'flexion-suavidad',
        name: 'Flexión y suavidad',
        description:
          'Desde parado y al paso, pedí que afloje la mandíbula y flexione cuello lateral y verticalmente ante una presión suave de rienda.',
        duration: '10 min/sesión',
        image: '/plans/exercise/flexion-suavidad.png',
      },
      {
        id: 'avanzar-parar-girar',
        name: 'Avanzar, parar y girar',
        description:
          'Buscá respuestas nítidas a las ayudas de asiento y pierna para transiciones hacia arriba y detenciones limpias desde el asiento. Guiá con piernas y asiento, no solo riendas.',
        duration: '20 min/sesión',
        image: '/plans/exercise/avanzar-parar-girar.png',
      },
      {
        id: 'flexion-circulo',
        name: 'Flexión básica en círculo',
        description:
          'Círculos grandes de 20 m al paso y trote, con flexión correcta desde la nuca hasta la cola siguiendo el arco.',
        duration: '15 min/sesión',
        image: '/plans/exercise/flexion-circulo.png',
      },
      {
        id: 'cesion-pierna-intro',
        name: 'Cesión a la pierna (introducción)',
        description:
          'Al paso, enseñá a desplazarse lateralmente alejándose de la presión de la pierna, empezando junto a la valla.',
        duration: '10 min/sesión',
        image: '/plans/exercise/cesion-pierna-intro.png',
      },
    ],
    stages: [
      {
        week: 1,
        title: 'Reinicio suave',
        description: 'Reintroducí ayudas claras y contacto liviano. Enfocate en calma y aceptación.',
        exerciseIds: ['flexion-suavidad', 'avanzar-parar-girar'],
      },
      {
        week: 2,
        title: 'Consistencia en transiciones',
        description: 'Transiciones frecuentes bajo asiento; rienda solo para refinar.',
        exerciseIds: ['avanzar-parar-girar'],
      },
      {
        week: 3,
        title: 'Curvas limpias',
        description: 'Añadí control de hombros y nuca en círculos de 20 m.',
        exerciseIds: ['flexion-circulo', 'flexion-suavidad'],
      },
      {
        week: 4,
        title: 'Lateral básico',
        description: 'Primeros pasos de cesión a la pierna en pared larga.',
        exerciseIds: ['cesion-pierna-intro'],
      },
      {
        week: 5,
        title: 'Integración',
        description: 'Combinar transiciones + curvas + cesión suave en una misma sesión.',
        exerciseIds: ['avanzar-parar-girar', 'flexion-circulo'],
      },
      {
        week: 6,
        title: 'Sólido y ligero',
        description: 'Refiná tiempos de respuesta y liviandad en contacto.',
        exerciseIds: ['flexion-suavidad', 'avanzar-parar-girar'],
      },
    ],
  },

  // 🔧 Continuing Training 1
  {
    id: 'continuing-1',
    category: 'Continuing Training',
    name: 'Mejorar flexibilidad y reunión 1',
    description:
      'Para caballos ya establecidos: desarrollo de ejercicios laterales y mejora de la auto-sustentación y el compromiso posterior.',
    duration: 'En curso',
    weeks: 8, // estimación para tracking/progreso
    image: '/plans/continuing-1.png',
    exercises: [
      {
        id: 'hombro-adentro',
        name: 'Hombro adentro',
        description:
          'Desplazá los hombros hacia adentro manteniendo flexión y ángulo constantes. Mejora la reunión y el trabajo del posterior interno.',
        reps: '4–6 veces por la pared larga en cada mano',
        image: '/plans/exercise/hombro-adentro.png',
      },
      {
        id: 'grupa-adentro',
        name: 'Grupa adentro (travers)',
        description:
          'Desplazá las ancas hacia adentro. Complementa al hombro adentro y mejora la soltura del dorso.',
        reps: '4–6 veces por la pared larga en cada mano',
        image: '/plans/exercise/grupa-adentro.png',
      },
      {
        id: 'trans-paso-galope',
        name: 'Transiciones paso–galope–paso',
        description:
          'Desarrollan equilibrio y potencia desde el tren posterior. Buscá transiciones limpias y directas sin trote intermedio.',
        reps: '8–10 transiciones por sesión',
        image: '/plans/exercise/trans-paso-galope.png',
      },
      {
        id: 'contragalope',
        name: 'Contragalope',
        description:
          'Galope a la mano contraria (p. ej., galope derecho en círculo a la izquierda). Equilibrio, rectitud y calidad del galope.',
        duration: '2–3 bucles por mano',
        image: '/plans/exercise/contragalope.png',
      },
    ],
    stages: [
      { week: 1, title: 'Base lateral', description: 'Introduce hombro adentro en paso.', exerciseIds: ['hombro-adentro'] },
      { week: 2, title: 'Añadir travers', description: 'Alterná hombro adentro y grupa adentro en pared larga.', exerciseIds: ['hombro-adentro', 'grupa-adentro'] },
      { week: 3, title: 'Transiciones limpias', description: 'Paso–galope–paso sin trote intermedio.', exerciseIds: ['trans-paso-galope'] },
      { week: 4, title: 'Contragalope básico', description: 'Introducí bucles de contragalope controlados.', exerciseIds: ['contragalope'] },
      { week: 5, title: 'Fluidez lateral', description: 'Secuencias: hombro adentro → recto → travers.', exerciseIds: ['hombro-adentro', 'grupa-adentro'] },
      { week: 6, title: 'Equilibrio en galope', description: 'Intercala transiciones y contragalope.', exerciseIds: ['trans-paso-galope', 'contragalope'] },
      { week: 7, title: 'Reunión sostenida', description: 'Más calidad de contacto y auto-sustentación.', exerciseIds: ['hombro-adentro'] },
      { week: 8, title: 'Integración', description: 'Circuitos combinando laterales y transiciones.', exerciseIds: ['grupa-adentro', 'trans-paso-galope'] },
    ],
  }
];

// Keep the type you already have:
export type Category =
  | 'Unbroke'
  | 'Retraining'
  | 'Continuing Training'

// ✅ Export a stable, ordered list of categories (for the carousel)
export const CATEGORIES = [
  'Unbroke',
  'Retraining',
  'Continuing Training'
] as const satisfies readonly Category[];

// ✅ Alias your Spanish labels so you can import CATEGORY_LABELS
export const CATEGORY_LABELS = CATEGORY_LABELS_ES;

// (optional) helper
export const getCategoryLabel = (c: Category) => CATEGORY_LABELS[c] ?? c;
