import type { TrainingPlan } from '../types';

export const continuingTrainingOnePlan: TrainingPlan = {
  id: 'continuing-1',
  category: 'Continuing Training',
  name: 'Mejorar flexibilidad y reunión 1',
  description:
    'Para caballos ya establecidos: desarrollo de ejercicios laterales y mejora de la auto-sustentación y el compromiso posterior.',
  duration: 'En curso',
  weeks: 8,
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
    {
      week: 1,
      title: 'Base lateral',
      description: 'Introduce hombro adentro en paso.',
      exerciseIds: ['hombro-adentro'],
    },
    {
      week: 2,
      title: 'Añadir travers',
      description: 'Alterná hombro adentro y grupa adentro en pared larga.',
      exerciseIds: ['hombro-adentro', 'grupa-adentro'],
    },
    {
      week: 3,
      title: 'Transiciones limpias',
      description: 'Paso–galope–paso sin trote intermedio.',
      exerciseIds: ['trans-paso-galope'],
    },
    {
      week: 4,
      title: 'Contragalope básico',
      description: 'Introducí bucles de contragalope controlados.',
      exerciseIds: ['contragalope'],
    },
    {
      week: 5,
      title: 'Fluidez lateral',
      description: 'Secuencias: hombro adentro → recto → travers.',
      exerciseIds: ['hombro-adentro', 'grupa-adentro'],
    },
    {
      week: 6,
      title: 'Equilibrio en galope',
      description: 'Intercala transiciones y contragalope.',
      exerciseIds: ['trans-paso-galope', 'contragalope'],
    },
    {
      week: 7,
      title: 'Reunión sostenida',
      description: 'Más calidad de contacto y auto-sustentación.',
      exerciseIds: ['hombro-adentro'],
    },
    {
      week: 8,
      title: 'Integración',
      description: 'Circuitos combinando laterales y transiciones.',
      exerciseIds: ['grupa-adentro', 'trans-paso-galope'],
    },
  ],
};
