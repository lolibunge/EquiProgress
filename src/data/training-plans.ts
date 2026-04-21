export type Signal = {
  label: string;
  details?: string;
};

export interface Exercise {
  id: string;
  name: string;
  image?: string;
  // LEGADO
  description?: string;

  // NUEVO (ficha técnica)
  objective?: string;        // Objetivo
  focus?: string;            // Enfoque principal
  method?: string[];         // Pasos / Método
  cues?: string[];           // Ayudas / señales del guía
  gear?: string[];           // Material: cabestro, stick, etc.
  duration?: string;         // Tiempo sugerido por sesión
  reps?: string;             // Repeticiones sugeridas
  prerequisites?: string[];  // Requisitos previos
  safety?: string[];         // Seguridad / consideraciones
  progressSigns?: Signal[];  // Señales de progreso
  advanceCriteria?: string[];// Criterios para pasar de fase
  commonMistakes?: string[];// Criterios para pasar de fase
  instructorTips?: string[];// Criterios para pasar de fase
  transitionTo?: string[];// Criterios para pasar de fase
};

export type PlanStage = {
  week: number;            // 1, 2, 3...
  title?: string;          // opcional (“Fundamentos”, etc.)
  description: string;     // qué se busca esta semana
  exerciseIds?: string[];  // opcional: ejercicios destacados esta semana
  dayPlans?: string[][];   // opcional: qué ejercicios se practican cada día
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
  Unbroke: 'Manejo básico del caballo',
  Retraining: 'Reentrenamiento',
  'Continuing Training': 'Entrenamiento continuado',
};

const DEFAULT_STAGE_WORK_DAYS = 5;

function mapPlanExercisesById(plan: TrainingPlan, exerciseIds: string[]): TrainingPlan['exercises'] {
  return exerciseIds
    .map((exerciseId) => plan.exercises.find((exercise) => exercise.id === exerciseId))
    .filter((exercise): exercise is TrainingPlan['exercises'][number] => Boolean(exercise));
}

export function getPlanStage(plan: TrainingPlan, week: number): PlanStage | null {
  return plan.stages?.find((stage) => stage.week === week) ?? null;
}

export function getPlanWeekExercises(plan: TrainingPlan, week: number): TrainingPlan['exercises'] {
  const mapped = mapPlanExercisesById(plan, getPlanStage(plan, week)?.exerciseIds ?? []);
  if (mapped.length > 0) return mapped;
  return plan.exercises.slice(0, DEFAULT_STAGE_WORK_DAYS);
}

export function getPlanDayExercises(
  plan: TrainingPlan,
  week: number,
  dayNumber: number
): TrainingPlan['exercises'] {
  const dayIndex = Math.max(0, Math.floor(dayNumber) - 1);
  const explicitDayPlan = getPlanStage(plan, week)?.dayPlans?.[dayIndex] ?? null;

  if (explicitDayPlan && explicitDayPlan.length > 0) {
    const mapped = mapPlanExercisesById(plan, explicitDayPlan);
    if (mapped.length > 0) return mapped;
  }

  const weekExercises = getPlanWeekExercises(plan, week);
  const focusExercise = weekExercises[dayIndex % Math.max(1, weekExercises.length)];
  return focusExercise ? [focusExercise] : [];
}

export function weekUsesMultiExerciseDays(plan: TrainingPlan, week: number): boolean {
  return Boolean(getPlanStage(plan, week)?.dayPlans?.some((dayPlan) => dayPlan.length > 1));
}

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
    // --- NUEVOS EJERCICIOS PARA LAS SEMANAS ---
    {
        id: "libertad",
        name: "Trabajo en libertad",
        image: "/plans/exercise/libertad.png",
        objective: "Generar vínculo, atención y autorregulación sin herramientas.",
        method: [
          "Iniciar en corral/redondo, permitir explorar y observar lenguaje corporal.",
          "Pedir movimiento hacia una dirección y observar.",
          "Proponer cambios suaves de dirección y ritmo con tu postura y energía.",
          "Observar señales corporales, poscición de las orejas, poscición de la cabeza, movimiento de la cola, respiración y boca.",
          "Recompensar cuando vemos el caballo relajado y atento. parar y premiar mirar, acercarse, bajar la cabeza y regular el impulso."
        ],
        cues: ["Posición del cuerpo (invitar/alejar)", "Mirada suave", "Respiración lenta"],
        gear: ["Corral/redondo seguro"],
        duration: "10–15 min",
        prerequisites: [],
        safety: ["Evitar rincones con objetos que puedan golpear", "Mantener salida libre"],
        progressSigns: [
          { label: "Enganche", details: "Te busca y te sigue por iniciativa propia" },
          { label: "Regulación", details: "Pasa de activo a calmado sin perder conexión" },
          { label: "Relaja cuello y dorso" },
          { label: "Baja la cabeza" },
          { label: "Respiración más lento" }
        ],
        advanceCriteria: [
          "Responde a cambios de dirección con fluidez",
          "Mantiene atención 2–3 minutos seguidos"
        ]
      },
      {
        id: "taller-desens",
        name: "Desensibilización",
        image: "/plans/exercise/desens.png",
        objective: "Aceptar estímulos básicos en estático sin reacción emocional, manteniendo relajación y atención.",
        focus: "Regulación emocional y aceptación de presión",
        method: [
          "Aplicar estímulos suaves y progresivos con stick & string y mano (cuello, hombro, dorso, manos y patas).",
          "Si el caballo se mueve, acompañarlo manteniendo el estímulo de forma estable, sin aumentar la presión ni entrar en pelea.",
          "Cuando el caballo se detiene, baja la tensión o muestra una señal de relajación, retirar el estímulo (principio presión–alivio).",
          "Repetir en ambos lados y en zonas simétricas."
        ],
        cues: ["Tocar–retirar", "Ritmo constante", "Esperar sin apurar", "Exhalar al relajar"],
        gear: ["Cabestro", "Stick & string"],
        duration: "10–12 min",
        prerequisites: ["Trabajo en libertad"],
        safety: [
          "Evitar golpes con la cuerda",
          "No avanzar si hay tensión alta",
          "No ubicarse frente al caballo en zona de riesgo"
        ],
        progressSigns: [
          { label: "Relaja cuello y dorso" },
          { label: "Baja la cabeza" },
          { label: "Respiración más lenta" },
          { label: "Lame y mastica" }
        ],
        advanceCriteria: [
          "Tolera contacto en 5–6 zonas sin mover los pies",
          "Recupera la calma en menos de 5 segundos tras un pequeño sobresalto",
          "Permanece quieto durante el estímulo sin necesidad de corrección"
        ],
        commonMistakes: [
          "Retirar el estímulo cuando el caballo aún está reaccionando",
          "Aumentar la intensidad demasiado rápido",
          "Perseguir al caballo en vez de esperar relajación",
          "No observar señales de tensión antes de avanzar"
        ],
        instructorTips: [
          "Si el caballo mueve los pies, acompañalo sin pelear ni aumentar la intensidad de golpe",
          "El alivio debe llegar cuando aparece la quietud o baja la tensión, no en plena reacción",
          "Observá el momento exacto en que el caballo vuelve a pensar"
        ],
        transitionTo: ["taller-sens-cabrestear", "taller-sens-retroceso", "taller-sens-giro-frente", "taller-sens-giro-grupa", "taller-sens-flexion-lateral"]
      },
      {
        id: "sens-cabrestear",
        name: "Cabrestear (avanzar a la par)",
        image: "/plans/exercise/cabrestear.png",
        objective: "Enseñar a iniciar la marcha con una indicación suave y avanzar a la par del guía.",
        method: [
          "Ubícate al costado del caballo, a la altura del hombro. Cabestro en la mano interna; stick/vara en la externa.",
          "Prepara tu cuerpo en actitud de avanzar (pecho hacia delante y primer paso).",
          "Si no responde, toca suavemente con el stick en flanco o grupa hasta que dé 1–2 pasos, y libera.",
          "Camina relajada a su lado, detente y premia. Repite 3–5 veces buscando que inicie solo con tu postura."
        ],
        cues: ["Postura de avance", "Micro-tensión de cabestro si hace falta", "Toque suave con stick como refuerzo"],
        gear: ["Cabestro", "Cuerda 3–4 m", "Stick/vara"],
        duration: "6–8 min",
        prerequisites: ["Desensibilización"],
        safety: ["Mantener zona libre a los costados", "Evitar golpear con el stick, solo tocar si no hay respuesta"],
        progressSigns: [
          { label: "Inicia la marcha con tu postura" },
          { label: "Camina a la par sin invadir" }
        ],
        advanceCriteria: [
          "Avanza con indicación postural > stick",
          "Se detiene y arranca sin tirones de cuerda"
        ]
      },
      {
        id: "sens-retroceso",
        name: "Retroceder",
        image: "/plans/exercise/retroceder.png",
        objective: "Que el caballo ceda espacio y retroceda con un estímulo mínimo desde el cabestro.",
        method: [
          "Párate frente al caballo a ~1,5 m. Cabestro en mano; stick en la otra (solo por seguridad).",
          "Agita la cuerda desde la punta del cabestro en ondas horizontales para transmitirlas a la nariz.",
          "Cuando dé 1–2 pasos atrás, detén las ondas y premia (baja tu energía).",
          "Invítalo a volver hacia ti y, antes de llegar a tu espacio, eleva la mano para detenerlo y premia en la frente.",
          "Repite hasta lograr 3–4 pasos suaves y fluidos."
        ],
        cues: ["Ondas de cuerda en cabestro", "Mano levantada para parar al volver", "Energía corporal baja para calmar"],
        gear: ["Cabestro", "Cuerda 3–4 m", "Stick (opcional)"],
        duration: "6–8 min",
        prerequisites: ["Desensibilización"],
        safety: ["No envolver la cuerda en la mano", "Mantener distancia para evitar pisadas"],
        progressSigns: [
          { label: "Retrocede con ondas pequeñas" },
          { label: "Se detiene a tu señal antes de invadir tu espacio" }
        ],
        advanceCriteria: [
          "Retrocede 3–4 pasos con ondas mínimas",
          "Vuelve y se detiene con tu mano alzada"
        ]
      },
      {
        id: "sens-giro-frente",
        name: "Girar el frente (ceder hombros)",
        image: "/plans/exercise/ceder-el-frente.png",
        objective: "Ceder los hombros cruzando la mano externa sobre la interna, manteniendo la pata interna como pivote.",
        method: [
          "Colócate entre cabeza y hombro. Con tu mano interna, bloquea suavemente para que no avance.",
          "Con tu mano externa, aplica presión ligera en el hombro para invitar el cruce hacia fuera.",
          "Si no responde, agita brevemente la punta del cabestro entre oreja y ojo (sin golpear) y libera al primer cruce.",
          "Da 1–2 pasos de cruce, suelta presión y premia. Repite al otro lado."
        ],
        cues: ["Bloque suave delante", "Presión ligera en hombro", "Micro estímulo visual con punta de cabestro"],
        gear: ["Cabestro", "Cuerda 3–4 m"],
        duration: "6–8 min",
        prerequisites: ["Desensibilización"],
        safety: ["No colocarte delante si empuja hombros", "Evita presión continua: pedir–soltar"],
        progressSigns: [
          { label: "Cruza hombros con presión mínima" },
          { label: "Mantiene pata interna como pivote" }
        ],
        advanceCriteria: [
          "2–3 pasos cruzados por lado sin tracción constante",
          "Responde a señales cada vez más sutiles"
        ]
      },
      {
        id: "sens-giro-grupa",
        name: "Girar la grupa (ceder posteriores)",
        image: "/plans/exercise/sens-giro-grupa.png",
        objective: "Desplazar la grupa cruzando la pata interna sobre la externa, dejando los anteriores más fijos.",
        method: [
          "Colócate a la mitad del barril. Mano interna al cabestro; mano externa con el stick.",
          "Orienta tu cuerpo hacia la grupa. Da 3–4 toques en el aire apuntando a la grupa; si no cede, toca suave.",
          "Al primer cruce de pata interna sobre la externa, detén el estímulo y premia.",
          "Repite 1–2 pasos por vez, alternando lados, hasta lograr fluidez."
        ],
        cues: ["Orientación corporal a grupa", "Toques al aire → toque suave como refuerzo", "Liberar al primer cruce"],
        gear: ["Desensibilización"],
        duration: "6–8 min",
        prerequisites: ["Desensibilización"],
        safety: ["Mantenerte fuera de la trayectoria de los posteriores", "No insistir con golpes: pedir–soltar"],
        progressSigns: [
          { label: "Cruza posteriores con señal leve" },
          { label: "Anteriores quedan casi fijos" }
        ],
        advanceCriteria: [
          "2–3 pasos de cruce por lado sin tensión",
          "Responde primero al lenguaje corporal"
        ]
      },
      {
        id: "sens-flexion-lateral",
        name: "Flexión lateral",
        image: "/plans/exercise/sens-flexion-lateral.png",
        objective: "Mejorar la movilidad cervical y la suavidad del contacto, cediendo lateralmente.",
        method: [
          "Ubícate a la altura de la paleta/barril. Toma el cabestro y pide traer la nariz hacia tu costado.",
          "Busca una pequeña flexión; al primer gesto de ceder, suelta y premia.",
          "Aumenta gradualmente el rango hasta que la nariz se acerque al barril sin mover los pies.",
          "Repite a ambos lados, alternando flexiones cortas y una más completa."
        ],
        cues: ["Toma corta del cabestro", "Presión–liberación inmediata", "Respiración tranquila"],
        gear: ["Cabestro", "Cuerda corta (opcional)"],
        duration: "4–6 min",
        prerequisites: ["Desensibilización"],
        safety: ["No tirar de golpe", "Detener si mueve pies: volver a pedir suave"],
        progressSigns: [
          { label: "Cede con presión mínima" },
          { label: "Aumenta rango de flexión sin moverse" }
        ],
        advanceCriteria: [
          "Flexión amplia y suave a ambos lados",
          "Mantiene calma y respiración regular"
        ]
      },
      {
        id: "sens-giro-posteriores",
        name: "Giro sobre los posteriores (con envoltura de cuerda)",
        image: "/plans/exercise/sens-giro-posteriores.png",
        objective: "Pedir un giro manteniendo los posteriores como pivote, usando la cuerda como ayuda envolvente.",
        method: [
          "Desde el lado izquierdo, pasa la cuerda por el lado derecho, rodea detrás de la grupa y vuelve hacia la cabeza por el lado izquierdo (envoltura).",
          "Con tu mano interna guía la cabeza ligeramente hacia la dirección del giro.",
          "Con la mano que sostiene la punta del cabresto, tracciona suave hacia ti mientras liberas la guía de la cabeza.",
          "Al pivotar sobre posteriores, suelta y premia. Repite 3–5 veces por lado."
        ],
        cues: ["Guía ligera de cabeza", "Tracción suave con la cuerda envolvente", "Soltar al primer pivot"],
        gear: ["Cabestro", "Cuerda 3–4 m"],
        duration: "6–8 min",
        prerequisites: ["Desensibilización"],
        safety: ["Evitar enredos con la cuerda", "No ejercer tirones bruscos"],
        progressSigns: [
          { label: "Gira controlado sin perder equilibrio" },
          { label: "Mantiene posteriores como pivote" }
        ],
        advanceCriteria: [
          "2–3 giros controlados por lado",
          "Responde con mínima tracción de cuerda"
        ]
      },
    {
      id: "sens-mov",
      name: "Sensibilización en movimiento",
      image: "/plans/exercise/sens-mov.png",
      objective: "Mantener respuestas claras a las ayudas mientras se desplaza.",
      method: [
        "Caminar a la par con cambios de dirección y ritmo (corto/medio).",
        "Paradas suaves desde la marcha usando voz y micro-tensión.",
        "Retroceder 1–3 pasos y volver a avanzar sin perder la conexión.",
      ],
      cues: ["Ritmo del guía", "Voz (subir/bajar)", "Micro-tensión de cuerda"],
      gear: ["Cabestro", "Cuerda 3–4 m"],
      duration: "8–12 min",
      prerequisites: ["Sensibilización (estático) consistente"],
      safety: ["Evitar pisos resbaladizos", "Mantener espacio libre alrededor"],
      progressSigns: [
        { label: "Ritmo parejo sin tirones" },
        { label: "Paradas y retrocesos limpios" }
      ],
      advanceCriteria: [
        "Sostiene 2–3 minutos de trabajo variado sin perder calma",
        "Responde a voz/postura > cuerda"
      ]
    },
    {
      id: "enfrenada",
      name: "Primera Enfrenada (Embocadura)",
      image: "/plans/exercise/enfrenada.png",
      objective: "Presentar y aceptar la embocadura/bozal con tranquilidad.",
      method: [
        "Desensibilizar boca y comisuras con la mano; premiar lamidos.",
        "Presentar el bocado/bozal de forma gradual; colocar y retirar varias veces.",
        "Caminar breves tramos, aflojar y quitar; repetir buscando relajación.",
      ],
      cues: ["Mano suave", "Tiempo y respiración tranquila", "Reforzador al relajar"],
      gear: ["Cabezada + bocado/bozal (según preferencia)"],
      duration: "10–15 min",
      prerequisites: ["Desensibilización", "Sensibilización básica", "Sensibilización en movimiento"],
      safety: ["Revisar boca/dentición", "No apretar ni forzar la colocación"],
      progressSigns: [
        { label: "Acepta colocar/retirar sin resistencia" },
        { label: "Mastica y relaja mandíbula" }
      ],
      advanceCriteria: [
        "Camina relajado con embocadura/bozal",
        "Mantiene atención sin sacudidas de cabeza"
      ]
    },
    {
      id: "ensillada",
      name: "Primera Ensillada",
      image: "/plans/exercise/ensillada.png",
      objective: "Introducir manta/silla y cincha de forma progresiva y segura.",
      method: [
        "Presentar manta y posar/retirar sobre el dorso hasta ver relajación.",
        "Colocar silla y cincha sin apretar; caminar círculos amplios.",
        "Ajustar un punto, caminar y observar; repetir hasta cincha funcional.",
      ],
      cues: ["Progresión en capas", "Pausas tras cada avance", "Recompensa al relajar"],
      gear: ["Manta/sudadera", "Silla", "Cincha"],
      duration: "12–15 min",
      prerequisites: ["Desensibilización", "Sensibilización básica", "Sensibilización en movimiento"],
      safety: ["Corral seguro", "No atar corto", "Ideal con asistente atento"],
      progressSigns: [
        { label: "Tolera manta/silla sin tensión sostenida" },
        { label: "Camina y gira con cincha sin acelerar" }
      ],
      advanceCriteria: [
        "Acepta ajuste progresivo de cincha",
        "Se mueve suelto, sin corcovear ni bloquearse"
      ]
    }
  ],

  // ===================== NUEVAS SEMANAS =====================
  stages: [
    {
      week: 1,
      title: "Trabajo en libertad",
      description: "Conexión, lectura de señales y regulación de energía.",
      exerciseIds: ["libertad"]
    },
    {
      week: 2,
      title: "Desensibilización",
      description: "Zonas de contacto y principio presión–liberación en estático.",
      exerciseIds: ["desens"]
    },
    {
      week: 3,
      title: "Sensibilización",
      description: "Ceder a presiones: avanzar/retroceder, ceder hombros y grupa, flexión.",
      exerciseIds: [
        "sens-cabrestear",
        "sens-retroceso",
        "sens-giro-frente",
        "sens-giro-grupa",
        "sens-flexion-lateral"
      ]
    },
    {
      week: 4,
      title: "Sensibilización en movimiento",
      description: "Aplicar ayudas en marcha: cambios de dirección, paradas y retrocesos suaves.",
      exerciseIds: ["sens-mov"]
    },
    {
      week: 5,
      title: "Primera Enfrenada",
      description: "Presentación y aceptación del bocado/bozal con calma.",
      exerciseIds: ["enfrenada"]
    },
    {
      week: 6,
      title: "Primera Ensillada",
      description: "Manta, silla y cincha progresiva + caminar y girar relajado.",
      exerciseIds: ["ensillada"]
    }
  ]
},
  // 🔧 Taller Método Mente y Movimiento (sin semanas 5 y 6)
  {
  id: "taller-metodo-mente-movimiento",
  name: "Taller Método Mente y Movimiento",
  description: "Primer acercamiento al caballo con enfoque de manejo básico, calma y comunicación.",
  duration: "4 semanas",
  weeks: 4,
  image: "/plans/plan-de-iniciacion-caballo-joven.png",
  category: "Unbroke",
  exercises: [
    {
      id: "taller-libertad",
      name: "Trabajo en libertad",
      image: "/plans/exercise/libertad.png",
      objective: "Generar vínculo, atención y autorregulación sin herramientas.",
      focus: "Conexión, lectura del caballo y regulación de energía",
      method: [
        "Iniciar en corral o redondo, permitir que el caballo explore y observar su lenguaje corporal.",
        "Pedir movimiento hacia una dirección y observar su respuesta.",
        "Proponer cambios suaves de dirección y ritmo con tu postura y energía.",
        "Observar señales corporales: posición de las orejas, posición de la cabeza, movimiento de la cola, respiración y boca.",
        "Reconocer y liberar en pequeños momentos de conexión y relajación, como cuando el caballo mira, se acerca, baja la cabeza o regula su impulso."
      ],
      cues: ["Posición del cuerpo (invitar/alejar)", "Mirada suave", "Respiración lenta"],
      gear: ["Corral o redondo seguro"],
      duration: "10–15 min",
      prerequisites: [],
      safety: ["Evitar rincones con objetos que puedan golpear", "Mantener una salida libre"],
      progressSigns: [
        { label: "Enganche", details: "Te busca y te sigue por iniciativa propia" },
        { label: "Regulación", details: "Pasa de activo a calmado sin perder conexión" },
        { label: "Relaja cuello y dorso" },
        { label: "Baja la cabeza" },
        { label: "Respiración más lenta" }
      ],
      advanceCriteria: [
        "Responde a cambios de dirección con fluidez",
        "Mantiene la atención durante 2–3 minutos seguidos"
      ],
      commonMistakes: [
        "Mover al caballo sin observar primero su estado",
        "Cambiar dirección demasiado rápido sin darle tiempo a procesar",
        "Buscar que se mueva en vez de buscar conexión",
        "No reconocer los momentos de atención o relajación"
      ],

      instructorTips: [
        "Primero observá, después intervení",
        "Buscá conexión antes que movimiento",
        "Menos presión, más claridad",
        "El caballo aprende cuando baja la energía, no cuando se agita"
      ],

      transitionTo: ["taller-desens"]
    },
    {
      id: "taller-desens",
      name: "Desensibilización",
      image: "/plans/exercise/desens.png",
      objective: "Aceptar estímulos básicos en estático sin reacción emocional, manteniendo relajación y atención.",
      focus: "Regulación emocional y aceptación de presión",
      method: [
        "Aplicar estímulos suaves y progresivos con stick & string y mano (cuello, hombro, dorso, manos y patas).",
        "Si el caballo se mueve, acompañarlo manteniendo el estímulo de forma estable, sin aumentar la presión ni entrar en pelea.",
        "Cuando el caballo se detiene, baja la tensión o muestra una señal de relajación, retirar el estímulo (principio presión–alivio).",
        "Repetir en ambos lados y en zonas simétricas."
      ],
      cues: ["Tocar–retirar", "Ritmo constante", "Esperar sin apurar", "Exhalar al relajar"],
      gear: ["Cabestro", "Stick & string"],
      duration: "10–12 min",
      prerequisites: ["Trabajo en libertad"],
      safety: [
        "Evitar golpes con la cuerda",
        "No avanzar si hay tensión alta",
        "No ubicarse frente al caballo en zona de riesgo"
      ],
      progressSigns: [
        { label: "Relaja cuello y dorso" },
        { label: "Baja la cabeza" },
        { label: "Respiración más lenta" },
        { label: "Lame y mastica" }
      ],
      advanceCriteria: [
        "Tolera contacto en 5–6 zonas sin mover los pies",
        "Recupera la calma en menos de 5 segundos tras un pequeño sobresalto",
        "Permanece quieto durante el estímulo sin necesidad de corrección"
      ],
      commonMistakes: [
        "Retirar el estímulo cuando el caballo aún está reaccionando",
        "Aumentar la intensidad demasiado rápido",
        "Perseguir al caballo en vez de esperar relajación",
        "No observar señales de tensión antes de avanzar"
      ],
      instructorTips: [
        "Si el caballo mueve los pies, acompañalo sin pelear ni aumentar la intensidad de golpe",
        "El alivio debe llegar cuando aparece la quietud o baja la tensión, no en plena reacción",
        "Observá el momento exacto en que el caballo vuelve a pensar"
      ],
      transitionTo: ["taller-sens-cabrestear", "taller-sens-retroceso", "taller-sens-giro-frente", "taller-sens-giro-grupa", "taller-sens-flexion-lateral"]
    },
    {
      id: "taller-sens-cabrestear",
      name: "Cabrestear (avanzar a la par)",
      image: "/plans/exercise/cabrestear.png",
      objective: "Enseñar a iniciar la marcha con una indicación suave y avanzar a la par del guía.",
      focus: "Respuesta a la intención corporal y respeto del espacio",
      method: [
        "Ubicate al costado del caballo, a la altura del hombro. Sostené el cabestro con la mano interna y el stick o vara con la externa.",
        "Prepará tu cuerpo en actitud de avanzar (pecho hacia adelante y primer paso).",
        "Si no responde, tocá suavemente con el stick en el flanco o la grupa hasta que dé 1–2 pasos, y liberá.",
        "Caminá relajada a su lado, detenete y premiá. Repetí 3–5 veces buscando que inicie solo con tu postura."
      ],
      cues: ["Postura de avance", "Microtensión del cabestro si hace falta", "Toque suave con stick como refuerzo"],
      gear: ["Cabestro", "Cuerda de 3–4 m", "Stick o vara"],
      duration: "6–8 min",
      prerequisites: ["Desensibilización"],
      safety: ["Mantener una zona libre a los costados", "Evitar golpear con el stick; usarlo solo como toque de refuerzo"],
      progressSigns: [
        { label: "Inicia la marcha con tu postura" },
        { label: "Camina a la par sin invadir" }
      ],
      advanceCriteria: [
        "Avanza primero por indicación postural y no por presión del stick",
        "Se detiene y arranca sin tirones de cuerda"
      ],
      commonMistakes: [
        "Usar demasiado el stick en vez de la postura",
        "Tirar del cabestro en vez de invitar",
        "No liberar cuando el caballo responde",
        "Caminar sin marcar claramente el inicio"
      ],

      instructorTips: [
        "Tu cuerpo debe ser la señal principal",
        "El stick es solo refuerzo, no la base",
        "Premiá el primer intento, no la perfección",
        "Buscá que el caballo te lea antes de reaccionar"
      ],

      transitionTo: ["taller-sens-retroceso", "taller-sens-giro-frente", "taller-sens-giro-grupa", "taller-sens-flexion-lateral", "taller-sens-mov"]
    },
    {
      id: "taller-sens-retroceso",
      name: "Retroceder",
      image: "/plans/exercise/retroceder.png",
      objective: "Que el caballo ceda espacio y retroceda con un estímulo mínimo desde el cabestro.",
      focus: "Respeto del espacio y respuesta a presión frontal",
      method: [
        "Parate frente al caballo a aproximadamente 1,5 m. Cabestro en mano; stick en la otra solo por seguridad.",
        "Agitá la cuerda desde la punta del cabestro en ondas horizontales para transmitirlas a la nariz.",
        "Cuando dé 1–2 pasos hacia atrás, detené las ondas y premiá bajando tu energía.",
        "Invitalo a volver hacia vos y, antes de que llegue a tu espacio, elevá la mano para detenerlo y premiá en la frente.",
        "Repetí hasta lograr 3–4 pasos suaves y fluidos."
      ],
      cues: ["Ondas de cuerda en el cabestro", "Mano levantada para parar al volver", "Energía corporal baja para calmar"],
      gear: ["Cabestro", "Cuerda de 3–4 m", "Stick (opcional)"],
      duration: "6–8 min",
      prerequisites: ["Desensibilización"],
      safety: ["No envolver la cuerda en la mano", "Mantener distancia para evitar pisadas"],
      progressSigns: [
        { label: "Retrocede con ondas pequeñas" },
        { label: "Se detiene a tu señal antes de invadir tu espacio" }
      ],
      advanceCriteria: [
        "Retrocede 3–4 pasos con ondas mínimas",
        "Vuelve y se detiene con tu mano alzada"
      ],
      commonMistakes: [
        "Mover la cuerda demasiado fuerte desde el inicio",
        "No parar cuando el caballo responde",
        "Invadir el espacio del caballo",
        "No diferenciar entre reacción y respuesta"
      ],

      instructorTips: [
        "Empezá con la mínima señal posible",
        "El timing del alivio es todo",
        "Buscá pasos suaves, no cantidad",
        "El caballo debe retroceder relajado, no escapando"
      ],

      transitionTo: ["taller-sens-cabrestear", "taller-sens-giro-frente", "taller-sens-giro-grupa", "taller-sens-flexion-lateral", "taller-sens-mov"]
    },
    {
      id: "taller-sens-giro-frente",
      name: "Ceder hombros",
      image: "/plans/exercise/ceder-el-frente.png",
      objective: "Desplazar los hombros con suavidad, manteniendo la pata interna como pivote.",
      focus: "Control de hombros y dirección",
      method: [
        "Colocate entre la cabeza y el hombro. Con tu mano interna, bloqueá suavemente para evitar que avance.",
        "Con tu mano externa, aplicá una presión ligera en el hombro para invitar el cruce hacia afuera.",
        "Si no responde, agitá brevemente la punta del cabestro entre la oreja y el ojo, sin golpear, y liberá al primer cruce.",
        "Pedí 1–2 pasos de cruce, soltá la presión y premiá. Repetí al otro lado."
      ],
      cues: ["Bloque suave adelante", "Presión ligera en el hombro", "Microestímulo visual con la punta del cabestro"],
      gear: ["Cabestro", "Cuerda de 3–4 m"],
      duration: "6–8 min",
      prerequisites: ["Desensibilización"],
      safety: ["No colocarte delante si empuja con los hombros", "Evitar presión continua: pedir y soltar"],
      progressSigns: [
        { label: "Cruza hombros con presión mínima" },
        { label: "Mantiene la pata interna como pivote" }
      ],
      advanceCriteria: [
        "Hace 2–3 pasos cruzados por lado sin tracción constante",
        "Responde a señales cada vez más sutiles"
      ],
      commonMistakes: [
        "Empujar demasiado fuerte el hombro",
        "No bloquear el avance correctamente",
        "Pedir demasiados pasos seguidos",
        "No liberar al primer cruce"
      ],

      instructorTips: [
        "Los hombros dirigen al caballo",
        "Menos pasos, mejor calidad",
        "Pedí y soltá, no empujes constante",
        "Buscá suavidad antes que cantidad"
      ],

      transitionTo: ["taller-sens-cabrestear", "taller-sens-retroceso",  "taller-sens-giro-grupa", "taller-sens-flexion-lateral", "taller-sens-mov"]
    },
    {
      id: "taller-sens-giro-grupa",
      name: "Ceder grupa",
      image: "/plans/exercise/sens-giro-grupa.png",
      objective: "Desplazar la grupa cruzando la pata interna sobre la externa, con los anteriores más quietos.",
      focus: "Control del motor y respuesta a presión lateral",
      method: [
        "Colocate a la mitad del barril. Mano interna al cabestro; mano externa con el stick.",
        "Orientá tu cuerpo hacia la grupa. Hacé 3–4 toques en el aire apuntando a la grupa; si no cede, tocá suave.",
        "Al primer cruce de la pata interna sobre la externa, detené el estímulo y premiá.",
        "Repetí 1–2 pasos por vez, alternando lados, hasta lograr fluidez."
      ],
      cues: ["Orientación corporal hacia la grupa", "Toques al aire y luego toque suave como refuerzo", "Liberar al primer cruce"],
      gear: ["Cabestro", "Cuerda de 3–4 m", "Stick"],
      duration: "6–8 min",
      prerequisites: ["Desensibilización"],
      safety: ["Mantenerte fuera de la trayectoria de los posteriores", "No insistir con golpes: pedir y soltar"],
      progressSigns: [
        { label: "Cruza posteriores con señal leve" },
        { label: "Los anteriores quedan casi fijos" }
      ],
      advanceCriteria: [
        "Hace 2–3 pasos de cruce por lado sin tensión",
        "Responde primero al lenguaje corporal"
      ],
      commonMistakes: [
        "Pararse demasiado cerca de la grupa",
        "Golpear en vez de sugerir",
        "No liberar al primer cruce",
        "Querer girar demasiado rápido"
      ],

      instructorTips: [
        "Mover la grupa es controlar el motor",
        "Buscá un paso correcto, no muchos",
        "El caballo debe cruzar, no desplazarse rígido",
        "Siempre trabajá ambos lados"
      ],

      transitionTo: ["taller-sens-cabrestear", "taller-sens-retroceso", "taller-sens-giro-frente", "taller-sens-flexion-lateral", "taller-sens-mov"]
    },
    {
      id: "taller-sens-flexion-lateral",
      name: "Flexión lateral",
      image: "/plans/exercise/sens-flexion-lateral.png",
      objective: "Mejorar la movilidad cervical y la suavidad del contacto, cediendo lateralmente.",
      focus: "Suavidad, flexibilidad y atención a la presión",
      method: [
        "Ubicate a la altura de la paleta o barril. Tomá el cabestro y pedí traer la nariz hacia tu costado.",
        "Buscá una pequeña flexión; al primer gesto de ceder, soltá y premiá.",
        "Aumentá gradualmente el rango hasta que la nariz se acerque al barril sin mover los pies.",
        "Repetí a ambos lados, alternando flexiones cortas y una más completa."
      ],
      cues: ["Toma corta del cabestro", "Presión y liberación inmediata", "Respiración tranquila"],
      gear: ["Cabestro", "Cuerda corta (opcional)"],
      duration: "4–6 min",
      prerequisites: ["Desensibilización"],
      safety: ["No tirar de golpe", "Si mueve los pies, volver a pedir más suave"],
      progressSigns: [
        { label: "Cede con presión mínima" },
        { label: "Aumenta el rango de flexión sin moverse" }
      ],
      advanceCriteria: [
        "Flexión amplia y suave a ambos lados",
        "Mantiene calma y respiración regular"
      ],
      commonMistakes: [
        "Tirar en vez de pedir",
        "No soltar cuando el caballo cede",
        "Exigir demasiada flexión demasiado rápido",
        "Permitir que mueva los pies sin control"
      ],

      instructorTips: [
        "Buscá una pequeña respuesta y soltá",
        "La suavidad se construye de a poco",
        "El caballo debe ceder, no resistir",
        "Menos fuerza, más timing"
      ],

      transitionTo: ["taller-sens-cabrestear", "taller-sens-retroceso", "taller-sens-giro-frente", "taller-sens-giro-grupa", "taller-sens-mov"]
    },
    {
      id: "taller-sens-mov",
      name: "Sensibilización en movimiento",
      image: "/plans/exercise/sens-mov.png",
      objective: "Mantener respuestas claras a las ayudas mientras se desplaza.",
      focus: "Conservar atención, dirección y ritmo durante el movimiento",
      method: [
        "Caminar a la par con cambios de dirección y ritmo (corto y medio).",
        "Hacer paradas suaves desde la marcha usando voz y microtensión de la cuerda.",
        "Retroceder 1–3 pasos y volver a avanzar sin perder la conexión."
      ],
      cues: ["Ritmo del guía", "Voz para subir o bajar energía", "Microtensión de cuerda"],
      gear: ["Cabestro", "Cuerda de 3–4 m"],
      duration: "8–12 min",
      prerequisites: ["Sensibilización en estático consistente"],
      safety: ["Evitar pisos resbaladizos", "Mantener espacio libre alrededor"],
      progressSigns: [
        { label: "Ritmo parejo sin tirones" },
        { label: "Paradas y retrocesos limpios" }
      ],
      advanceCriteria: [
        "Sostiene 2–3 minutos de trabajo variado sin perder la calma",
        "Responde antes a voz y postura que a la cuerda"
      ],
      commonMistakes: [
        "Perder control del ritmo",
        "Dejar que el caballo se desconecte en movimiento",
        "No corregir invasión de espacio",
        "Usar solo la cuerda en vez del cuerpo"
      ],

      instructorTips: [
        "El liderazgo real aparece en movimiento",
        "Controlá primero el ritmo, después la dirección",
        "Buscá consistencia, no perfección",
        "El caballo debe mantenerse atento, no automático"
      ],

    }
  ],
  stages: [
    {
      week: 1,
      title: "Trabajo en libertad",
      description: "Conexión, lectura de señales y regulación de energía.",
      exerciseIds: ["taller-libertad"]
    },
    {
      week: 2,
      title: "Desensibilización",
      description: "Zonas de contacto y principio presión–alivio en estático.",
      exerciseIds: ["taller-desens"]
    },
    {
      week: 3,
      title: "Sensibilización",
      description: "Ceder a presiones: avanzar, retroceder, ceder hombros, grupa y flexión.",
      exerciseIds: [
        "taller-sens-cabrestear",
        "taller-sens-retroceso",
        "taller-sens-giro-frente",
        "taller-sens-giro-grupa",
        "taller-sens-flexion-lateral"
      ],
      dayPlans: [
        [
          "taller-sens-cabrestear",
          "taller-sens-retroceso",
          "taller-sens-giro-frente",
          "taller-sens-giro-grupa",
          "taller-sens-flexion-lateral"
        ],
        [
          "taller-sens-cabrestear",
          "taller-sens-retroceso",
          "taller-sens-giro-frente",
          "taller-sens-giro-grupa",
          "taller-sens-flexion-lateral"
        ],
        [
          "taller-sens-cabrestear",
          "taller-sens-retroceso",
          "taller-sens-giro-frente",
          "taller-sens-giro-grupa",
          "taller-sens-flexion-lateral"
        ],
        [
          "taller-sens-cabrestear",
          "taller-sens-retroceso",
          "taller-sens-giro-frente",
          "taller-sens-giro-grupa",
          "taller-sens-flexion-lateral"
        ],
        [
          "taller-sens-cabrestear",
          "taller-sens-retroceso",
          "taller-sens-giro-frente",
          "taller-sens-giro-grupa",
          "taller-sens-flexion-lateral"
        ]
      ]
    },
    {
      week: 4,
      title: "Sensibilización en movimiento",
      description: "Aplicar ayudas en marcha: cambios de dirección, paradas y retrocesos suaves.",
      exerciseIds: ["taller-sens-mov"]
    }
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
