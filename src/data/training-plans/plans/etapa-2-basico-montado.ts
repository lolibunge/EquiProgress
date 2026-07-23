import type { TrainingPlan } from '../types';

export const etapa2BasicoMontadoPlan: TrainingPlan = {
  id: 'etapa-2-basico-montado',
  image: '/plans/etapa2-basico-montado-cover.png',
  category: 'Mounted Basics',
  name: 'Etapa 2 - Ejercicios Básicos Montados',
  description:
    'Patrones montados fundamentales para desarrollar ritmo, control, equilibrio y comunicación después de la Etapa 1.',
  longDescription:
    'La Etapa 2 retoma la sensibilización en movimiento que el binomio ya trabajó a pie en la Etapa 1 y la lleva a la montura. A través de catorce patrones de picadero (círculos, figuras, líneas y transiciones) el caballo aprende a doblar, mantener el ritmo y responder con más ligereza a las ayudas, mientras la jinete organiza mirada, asiento, piernas y riendas con más precisión. Es la base técnica sobre la que después se construyen las maniobras de la Etapa 3 (hombro adentro, grupa adentro, pirueta, arco reverso, piaff y passage).',
  goal:
    'Consolidar ritmo, equilibrio, rectitud, incurvación y respuesta a las ayudas montado, preparando al binomio para las maniobras avanzadas de la Etapa 3.',
  forWhom:
    'Alumnos que ya completaron la Etapa 1 (desensibilización, sensibilización y sensibilización en movimiento a pie) y están iniciando o consolidando el trabajo montado.',
  keyPoints: [
    'Ritmo constante en paso y trote antes de agregar dificultad',
    'Incurvación y rectitud según la figura (curva o línea recta)',
    'Uso claro y sutil de mirada, asiento, piernas y riendas',
    'Transiciones preparadas con anticipación, no improvisadas',
    'Calidad de la figura antes que velocidad o tamaño',
  ],
  duration: '6 semanas',
  weeks: 6,
  exercises: [
    {
      id: 'circulo',
      image: '/plans/exercise/etapa2-circulo.png',
      name: 'Círculo',
      description:
        'El fundamento del equilibrio. Enseña al caballo a doblar y a mantener el equilibrio sin perder el ritmo. Es la base de todos los patrones de la Etapa 2.',
      objective:
        'Desarrollar equilibrio e incurvación, mantener el ritmo y la conexión, mejorar la respuesta a las ayudas y preparar transiciones y cambios de dirección.',
      focus: 'Equilibrio, incurvación y control del ritmo',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Círculo de 18–20 m de diámetro para empezar, marcado con 4 conos.',
            'Usá un tamaño donde puedas mantener el mismo ritmo sin que el caballo acelere ni se caiga hacia afuera.',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso o al trote por cualquier punto del círculo.',
            'Establecé el ritmo y la dirección.',
            'Pedí el círculo con la ayuda de la pierna interior en la cincha.',
            'Usá la pierna exterior ligeramente atrás de la cincha para mantener al caballo en el círculo.',
            'Mirá a través del círculo, hacia el punto por donde vas, no hacia el suelo ni al cuello.',
            'Ajustá el tamaño del círculo con la pierna exterior.',
            'Mantené el ritmo constante y el contacto suave con la rienda interior.',
            'Cambiá de dirección pasando por el centro sin perder el ritmo.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá hacia el punto donde querés ir. Tu mirada guía al caballo.'],
            },
            {
              title: 'Asiento',
              steps: ['Sentate centrada. Seguí el movimiento con tu pelvis sin perder tu eje.'],
            },
            {
              title: 'Pierna interior',
              steps: ['A la cincha. Pide flexión y mantiene la incurvación. Es la ayuda principal.'],
            },
            {
              title: 'Pierna exterior',
              steps: ['Un poco atrás de la cincha. Mantiene al caballo en el círculo y controla el tamaño.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Contacto suave y constante. Pide flexión y sostiene la conexión.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Abre y regula. Evita que los hombros se vayan por dentro.'],
            },
          ],
        },
      ],
      gear: ['4 conos', 'Espacio de 18–20 m de diámetro'],
      duration: '15–20 min',
      reps: 'Progresión: círculos grandes al paso → más pequeños al paso → al trote sentada → al trote sentado (más pequeños)',
      prerequisites: ['Sensibilización en movimiento (Etapa 1)'],
      safety: [
        'Mantené un tamaño de círculo que el caballo pueda sostener sin perder el equilibrio',
        'Evitá pisos resbaladizos o irregulares',
      ],
      progressSigns: [
        { label: 'El caballo se siente redondo y equilibrado' },
        { label: 'Su cuello está ligeramente más alto en la cruz' },
        { label: 'El paso o trote es regular y fluido' },
        { label: 'Sentís que las costillas internas del caballo se mueven hacia tu pierna interior' },
        { label: 'Tu asiento está quieto y tu cuerpo acompaña' },
      ],
      commonMistakes: [
        'El caballo se cae hacia adentro (falta de pierna interior, mirada hacia adentro del círculo): activá más la pierna interior en la cincha y mirá adelante.',
        'El caballo se cae hacia afuera (exceso de rienda interior, falta de pierna exterior): suavizá la rienda interior y usá la pierna exterior para mantenerlo en el círculo.',
        'El caballo acelera (falta de control del ritmo, piernas impulsando de más): montá transiciones paso–trote–paso y cerrá el círculo con asiento y piernas.',
        'El caballo se desconecta (rienda sin contacto, jinete desorganizada): establecé contacto suave y constante y reorganizá tus ayudas.',
        'Los hombros entran y la grupa sale (falta de control de los hombros, rienda exterior pasiva): abrí con la rienda exterior y controlá los hombros con la pierna exterior.',
      ],
      instructorTips: [
        'La calidad es más importante que el tamaño: mejor un círculo más chico y equilibrado que uno grande y desorganizado.',
        'Usá un tamaño de círculo donde puedas mantener el mismo ritmo sin que el caballo acelere ni se caiga hacia afuera.',
        'El círculo perfecto no es redondo: es equilibrado, constante y con propósito.',
      ],
      advanceCriteria: [
        'Sostiene círculos grandes al paso y al trote sentada con ritmo parejo',
        'Reduce el tamaño del círculo sin perder equilibrio ni incurvación',
        'Cambia de dirección por el centro sin perder el ritmo',
      ],
      transitionTo: ['cuadrado'],
    },
    {
      id: 'cuadrado',
      image: '/plans/exercise/etapa2-cuadrado.png',
      name: 'Cuadrado',
      description:
        'Rectitud, precisión en las esquinas y control de hombros. Enseña al caballo a mantenerse recto en cada lado, a doblar en las esquinas con precisión y a responder a las ayudas con claridad.',
      objective:
        'Desarrollar rectitud en líneas rectas, mejorar la precisión en las esquinas, fortalecer el control de hombros y grupa, mejorar la atención y la conexión, y preparar transiciones y cambios de dirección.',
      focus: 'Rectitud en las líneas y precisión en las esquinas',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Cuadrado de 18–22 m de cada lado (ajustar según el caballo), marcado con 4 conos en las esquinas.',
            'Recorrido: A → B → C → D → A en sentido horario; luego repetir en sentido antihorario.',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso o al trote por el punto A, mirando al frente.',
            'Establecé el ritmo y preparate en posición.',
            'Línea recta hasta el punto B, manteniendo la rectitud.',
            'Doblá a la derecha en la esquina B usando tu mirada, tu cuerpo y tu rienda exterior.',
            'Línea recta hasta el punto C.',
            'Repetí las esquinas C y D doblando a la derecha, y línea recta hasta A.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá al siguiente punto de la línea (B, C, D o A) y luego a la siguiente esquina.'],
            },
            {
              title: 'Asiento',
              steps: ['Sentate centrada. Preparate para la esquina ligeramente antes con tu asiento.'],
            },
            {
              title: 'Pierna interior',
              steps: ['A la cincha. Pide flexión y mantiene la incurvación al doblar en la esquina.'],
            },
            {
              title: 'Pierna exterior',
              steps: ['Un poco atrás de la cincha. Controla la grupa y ayuda a mantener la rectitud en las líneas.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y sostiene la incurvación en la esquina.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula el hombro y evita que te caigas hacia adentro en la esquina.'],
            },
          ],
        },
      ],
      gear: ['4 conos', 'Espacio de 18–22 m de cada lado'],
      duration: '15–20 min',
      reps: 'Progresión: cuadrado grande al paso → grande al trote → mediano al trote → transiciones en cada lado → cambios de sentido',
      prerequisites: ['Círculo'],
      safety: [
        'Prepará la esquina antes de llegar, no dentro de la curva',
        'Las transiciones se piden en las líneas rectas, no en las curvas',
      ],
      commonMistakes: [
        'Se cae el hombro en las esquinas (falta de control del hombro, mirada a los conos): usá la rienda exterior y mirá al frente.',
        'Se abre en las esquinas y pierde la forma del cuadrado (falta de incurvación y de apoyo exterior): pedí flexión con la rienda interior y usá la pierna exterior para sostener la línea.',
        'Pierde la rectitud en los lados (falta de impulsión o balance, falta de control de la grupa): usá la pierna exterior y mantené un ritmo activo y constante.',
        'Esquinas redondeadas y lentas (falta de preparación, cambios tardíos): preparate la esquina antes y pedí el cambio al salir.',
        'Anticipa o se adelanta a tus ayudas (falta de atención y conexión): sé clara y consistente, y recompensá la respuesta correcta.',
      ],
      instructorTips: [
        'La calidad de las esquinas define la calidad del ejercicio.',
        'Prepará la esquina antes de llegar y pedí el cambio al salir, no dentro de la curva.',
        'Mirá siempre al frente, no a los conos.',
        'Un cuadrado bien hecho es la base de muchos ejercicios avanzados: rectitud en las líneas, precisión en las esquinas y un caballo atento a vos.',
      ],
      advanceCriteria: [
        'Mantiene la rectitud en cada lado sin caerse de hombro ni de grupa',
        'Dobla las cuatro esquinas con el mismo tamaño y ritmo',
        'Sostiene transiciones paso–trote–paso en cada lado sin perder la forma',
      ],
      transitionTo: ['barras-al-suelo'],
    },
    {
      id: 'barras-al-suelo',
      image: '/plans/exercise/etapa2-barras-al-suelo.png',
      name: 'Barras al suelo',
      description:
        'Ritmo, atención, coordinación y relajación. Las barras al suelo ayudan al caballo a mejorar la coordinación, la conciencia de su cuerpo, el ritmo y la regularidad del paso o trote. Son la base para muchos ejercicios avanzados.',
      objective:
        'Mejorar el ritmo y la regularidad, desarrollar la coordinación y el equilibrio, aumentar la atención y la confianza, preparar para ejercicios más complejos y promover la relajación y el estiramiento.',
      focus: 'Regularidad del ritmo y coordinación de las patas',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            '4 barras (o cavaletti bajos) en línea recta, separadas 1,20–1,40 m entre sí para paso, y 1,30–1,50 m para trote.',
            'Conos marcando la línea de entrada y salida.',
            'Ajustar la distancia según el tamaño y nivel del caballo.',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso o al trote por la línea de entrada, mirando al frente.',
            'Establecé el ritmo y preparate en posición.',
            'Dirigí al caballo hacia la primera barra.',
            'Mantené el ritmo y dejá que el caballo pase sobre cada barra.',
            'No te inclines hacia adelante ni mires las patas.',
            'Acompañá con tu asiento y piernas según el ritmo.',
            'Salí por la línea de salida manteniendo el mismo ritmo.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá al frente y más allá de las barras.'],
            },
            {
              title: 'Asiento',
              steps: ['Mantenete centrada. Acompañá el movimiento sin adelantarte ni quedarte atrás.'],
            },
            {
              title: 'Pierna interior',
              steps: ['A la cincha. Pide impulsión y mantiene la rectitud.'],
            },
            {
              title: 'Pierna exterior',
              steps: ['Un poco atrás de la cincha. Controla la grupa y ayuda a mantener el equilibrio en las curvas.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y sostiene la dirección en las curvas.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula la dirección y evita que el hombro se abra hacia afuera.'],
            },
          ],
        },
      ],
      gear: ['4 barras o cavaletti bajos', '2 conos para marcar entrada y salida'],
      duration: '15–20 min',
      reps: 'Progresión: barras al paso → al trote sentado → al trote en posting → cambiar el número de barras (3, 5, 6) → en curva o serpentina',
      prerequisites: ['Cuadrado'],
      safety: [
        'Ajustá bien la distancia entre barras según el paso del caballo',
        'No apures al caballo antes de la barra',
      ],
      commonMistakes: [
        'Se apura antes de la barra (falta de preparación, impulsión excesiva): reducí la velocidad, preparate con anticipación y mantené el ritmo constante.',
        'Se detiene o duda (falta de confianza, ayudas poco claras): da impulsión suave y constante, usá asiento y piernas, y elogiá al pasar.',
        'Pasa desbalanceado (falta de rectitud, desequilibrio del jinete): mantené la rectitud con ayudas claras y revisá tu asiento y mirada.',
        'Eleva demasiado las patas (falta de relajación, tensión del jinete): relajá tu cuerpo, mantené un contacto suave y ritmo constante.',
        'No mantiene el ritmo (ayudas inconsistentes, falta de conexión): usá ayudas rítmicas, mantené la misma energía, respirá y relajate.',
      ],
      instructorTips: [
        'La constancia del ritmo es más importante que la velocidad: menos es más.',
        'Mirá siempre al frente y dejá que el caballo use su cuerpo.',
        'Elogiá la relajación y la regularidad.',
        'La regularidad del ritmo es la llave del progreso: confiá en tu caballo, acompañalo y disfrutá el camino.',
      ],
      advanceCriteria: [
        'Pasa las 4 barras al paso y al trote sin cambiar el ritmo',
        'Mantiene líneas rectas y contacto suave a lo largo de toda la fila',
        'Sostiene el mismo ritmo al repetir el ejercicio en curva o serpentina',
      ],
      transitionTo: ['figura-de-8'],
    },
    {
      id: 'figura-de-8',
      image: '/plans/exercise/etapa2-figura-de-8.png',
      name: 'Figura de 8',
      description:
        'Equilibrio, coordinación y cambios de flexión. Mejora la coordinación del caballo, desarrolla el equilibrio, la rectitud y prepara al binomio para los cambios de flexión y de dirección.',
      objective:
        'Mejorar el equilibrio y la coordinación, desarrollar la respuesta a las ayudas, preparar los cambios de flexión, mejorar la fluidez y el ritmo constante, y fortalecer la incurvación y la rectitud.',
      focus: 'Coordinación, cambios de flexión y rectitud en el cruce central',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Dos círculos de 18–22 m de diámetro cada uno, tangentes en el centro (ajustar según el caballo).',
            'Empezá con círculos grandes para facilitar el equilibrio y la coordinación; reducí el tamaño a medida que gane fluidez.',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso o al trote por la línea central, mirando al frente.',
            'Establecé el ritmo y preparate en posición y ayudas.',
            'Hacé un círculo a la derecha manteniendo la incurvación y el ritmo.',
            'Al llegar al centro, mantené la rectitud unos pasos.',
            'Hacé un círculo a la izquierda, cambiando la flexión.',
            'Mantené el mismo ritmo y tamaño de círculo.',
            'Cruzá nuevamente por el centro con rectitud.',
            'Repetí en el otro sentido.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá hacia el perímetro del círculo que vas a hacer, no al suelo ni al centro.'],
            },
            {
              title: 'Asiento y peso',
              steps: ['Sentate centrada. Seguí el movimiento del caballo y cambiá ligeramente tu peso según la flexión.'],
            },
            {
              title: 'Pierna interior',
              steps: ['A la cincha. Pide flexión y mantiene la incurvación y el impulso.'],
            },
            {
              title: 'Pierna exterior',
              steps: ['Un poco atrás de la cincha. Controla la grupa y ayuda a mantener el tamaño del círculo.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y sostiene la incurvación. Contacto suave y constante.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula la dirección y da soporte. Abre y cierra según necesites para mantener el círculo.'],
            },
          ],
        },
      ],
      gear: ['4 conos', 'Espacio de 18–22 m de diámetro por círculo'],
      duration: '15–20 min',
      reps: 'Progresión: figuras de 8 grandes al paso → más pequeñas al paso → al trote → cambios de tamaño y ritmo dentro de la figura',
      prerequisites: ['Barras al suelo'],
      safety: [
        'Preparar el cambio de flexión con anticipación antes del centro',
        'Mantener el mismo tamaño en ambos círculos',
      ],
      progressSigns: [
        { label: 'Sentís al caballo equilibrado y en ritmo' },
        { label: 'Los cambios en el centro son suaves y fluidos' },
        { label: 'El caballo mantiene la incurvación en cada círculo' },
        { label: 'Tu asiento está quieto y tu cuerpo acompaña' },
        { label: 'El caballo responde a tus ayudas con ligereza' },
      ],
      commonMistakes: [
        'Se pierde el ritmo en el cambio (transición brusca, falta de preparación): mantené el ritmo, preparate el cambio con anticipación y mantené tu cuerpo estable.',
        'El caballo se cae hacia adentro y corta el círculo (falta de flexión, pierna interior inactiva): activá la pierna interior y usá la rienda interior para mantener la curva.',
        'Los círculos son desiguales (falta de control de la dirección, mirada al centro): mirá al perímetro y usá la rienda exterior para regular el tamaño.',
        'El caballo se cae hacia afuera (exceso de rienda interior, falta de apoyo exterior): aflojá la rienda interior y sostené con la rienda exterior y tu pierna exterior.',
        'El caballo se acelera (falta de control del impulso, pierna exterior muy atrás): regulá el impulso con ambas piernas y mantené el contacto suave y constante.',
      ],
      instructorTips: [
        'La clave está en mantener el ritmo y el tamaño de los círculos, y en hacer cambios suaves en el centro sin perder equilibrio ni conexión.',
        'Empezá con círculos grandes para facilitar el equilibrio y la coordinación.',
        'Claridad en tus ayudas, equilibrio en tu caballo.',
      ],
      advanceCriteria: [
        'Mantiene el mismo ritmo y tamaño de círculo a ambos lados',
        'Cambia de flexión en el centro sin perder el equilibrio',
        'Sostiene la figura al trote con cambios de tamaño progresivos',
      ],
      transitionTo: ['diamante'],
    },
    {
      id: 'diamante',
      image: '/plans/exercise/etapa2-diamante.png',
      name: 'Diamante',
      description:
        'Control, precisión y fluidez en las transiciones. Mejora la dirección, la rectitud en las diagonales y la capacidad del caballo para responder a las ayudas con equilibrio y atención.',
      objective:
        'Mejorar la dirección y la precisión, desarrollar transiciones suaves, fortalecer la rectitud en las diagonales, mejorar la conexión y la atención, y aumentar el equilibrio y el control del cuerpo.',
      focus: 'Rectitud en las diagonales y transiciones en cada punta',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Cuatro conos formando un diamante (A arriba, B derecha, C abajo, D izquierda), de 18–22 m de cada lado.',
            'Recorrido sugerido: A → B → C → D → A en sentido horario; luego repetir en sentido antihorario.',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso o al trote por el punto A, mirando al frente.',
            'Establecé el ritmo y preparate en posición y ayudas.',
            'Línea diagonal al punto B, manteniendo la rectitud.',
            'En B, cambiá de dirección y hacé una transición si lo deseás.',
            'Línea diagonal al punto C.',
            'En C, cambiá de dirección y hacé una transición si lo deseás.',
            'Línea diagonal al punto D.',
            'En D, cambiá de dirección y hacé una transición si lo deseás.',
            'Línea diagonal de regreso al punto A.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá hacia el siguiente punto del diamante antes de llegar.'],
            },
            {
              title: 'Asiento y peso',
              steps: ['Sentate centrada. Usá tu asiento para acompañar el cambio de dirección y la transición.'],
            },
            {
              title: 'Pierna interior',
              steps: ['A la cincha. Pide flexión y mantiene la incurvación hacia la dirección del siguiente punto.'],
            },
            {
              title: 'Pierna exterior',
              steps: ['Un poco atrás de la cincha. Controla la grupa y ayuda a mantener la rectitud en la diagonal.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y sostiene la dirección.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula la dirección y evita que el hombro se abra hacia afuera.'],
            },
          ],
        },
      ],
      gear: ['4 conos', 'Espacio de 18–22 m de cada lado'],
      duration: '15–20 min',
      reps: 'Progresión: diamante grande al paso → grande al trote → mediano al trote → transiciones en cada punta → más pequeño con cambios de ritmo (paso–trote–paso)',
      prerequisites: ['Figura de 8'],
      safety: [
        'No dejes que el caballo se incline en las curvas de cada punta',
        'Preparar cada transición con anticipación, no de golpe',
      ],
      commonMistakes: [
        'Se cae en los hombros (falta de apoyo exterior, mirada al suelo): usá la pierna exterior, mirá al siguiente punto y sostené con la rienda exterior.',
        'Se pierde la línea diagonal (falta de rectitud, ruta demasiado curva): alineá el centro de tu cuerpo y usá referencias visuales.',
        'Transiciones bruscas (falta de preparación, pierde el ritmo): preparate la transición con anticipación y usá asiento y voz suaves.',
        'El caballo se inclina (demasiada rienda interior, falta de rectitud): usá la rienda exterior y controlá la grupa.',
        'Ritmo inconsistente (falta de claridad en las ayudas, transiciones desiguales): mantené el mismo ritmo entre puntos y usá ayudas más consistentes.',
      ],
      instructorTips: [
        'Pensá en "puntas del diamante" claras y transiciones equilibradas en cada cambio de dirección.',
        'Mirá siempre al siguiente punto y usá transiciones suaves y a tiempo.',
        'No dejes que el caballo se incline en las curvas.',
        'Menos prisa, más precisión.',
      ],
      advanceCriteria: [
        'Sostiene las cuatro diagonales rectas y parejas en ambos sentidos',
        'Hace transiciones limpias en cada punta sin perder el ritmo',
        'Mantiene la calidad al reducir el tamaño del diamante',
      ],
      transitionTo: ['linea-transiciones'],
    },
    {
      id: 'linea-transiciones',
      image: '/plans/exercise/etapa2-linea-transiciones.png',
      name: 'Línea con transiciones',
      description:
        'Ritmo, respuesta, rectitud y suavidad en las transiciones. Mejora la atención, la obediencia a las ayudas y la calidad de las transiciones entre los aires, ayudando al caballo a mantenerse recto, equilibrado y conectado.',
      objective:
        'Mejorar la respuesta a las ayudas, desarrollar transiciones suaves y precisas, mejorar la rectitud y la conexión, y aumentar el control del ritmo y del cuerpo.',
      focus: 'Rectitud y calidad de las transiciones entre aires',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Línea recta de 20–30 m entre dos conos de salida y llegada.',
            'Marcar puntos intermedios cada 6–8 m para pedir cada transición (2–3 m para el tramo inicial y final al paso).',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso por la línea de entrada, en forma recta.',
            'Transición a trote después de 2–3 m.',
            'Transición a paso después de 6–8 m de trote.',
            'Transición a galope después de 6–8 m de paso.',
            'Transición a trote después de 6–8 m de galope.',
            'Transición a paso después de 6–8 m de trote.',
            'Continuá al paso hasta el cono de salida.',
            'Salí de la línea manteniendo el ritmo y la calma.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá al siguiente punto de la línea antes de cada transición.'],
            },
            {
              title: 'Asiento',
              steps: ['Preparate la transición con tu asiento: ligero para avanzar, profundo para frenar.'],
            },
            {
              title: 'Pierna (impulsión)',
              steps: ['Impulsá para avanzar con firmeza y sostené la presión hasta que el caballo responda.'],
            },
            {
              title: 'Pierna (soporte)',
              steps: ['Sostené la pierna cerca para mantener la energía y el ritmo después de cada transición.'],
            },
            {
              title: 'Rienda (apoyo)',
              steps: ['Cerrá suavemente para equilibrar y preparar la transición.'],
            },
            {
              title: 'Rienda (regulación)',
              steps: ['Ajustá la rienda para mantener el ritmo y la rectitud.'],
            },
          ],
        },
      ],
      gear: ['2 conos', 'Espacio de 20–30 m en línea recta'],
      duration: '15–20 min',
      reps: 'Progresión: línea al paso → agregar transiciones al trote → agregar transiciones al galope → variar el orden de los aires → reducir la distancia entre transiciones → repetir a ambas manos',
      prerequisites: ['Diamante'],
      safety: [
        'No te inclines hacia adelante en las transiciones',
        'Mantené la rectitud en toda la línea',
        'Ritmo constante: ni apurado ni lento',
      ],
      commonMistakes: [
        'Transiciones bruscas (falta de preparación, ayudas desordenadas): preparate con anticipación y usá ayudas suaves y en orden.',
        'Se pierde la rectitud (hombros o grupa se desvían, mirada y cuerpo desalineados): mirá al siguiente punto y ajustá con asiento y piernas.',
        'Ritmo inconsistente (apura o frena sin equilibrio, falta de conexión): mantené un ritmo constante y sostené la impulsión.',
        'Transiciones tardías (espera demasiado, falta de decisión): da la ayuda antes del punto marcado y sé clara y decidida.',
        'Falta de atención (el caballo se distrae, falta de claridad en las ayudas): sé consistente, simplificá y reforzá las ayudas.',
      ],
      instructorTips: [
        'Transiciones suaves: prepará, ejecutá, sostené.',
        'La calidad de cada transición es más importante que la velocidad: menos es más.',
        'La claridad en tus ayudas crea confianza, y la confianza crea transiciones suaves.',
        'Prepará, pide, recibí y sostené.',
      ],
      advanceCriteria: [
        'Ejecuta las cinco transiciones sin perder la rectitud de la línea',
        'Prepara cada transición con anticipación, sin ayudas bruscas',
        'Sostiene el mismo ritmo y calma en ambas manos',
      ],
      transitionTo: ['wagon-wheel'],
    },
    {
      id: 'wagon-wheel',
      image: '/plans/exercise/etapa2-wagon-wheel.png',
      name: 'Wagon wheel (rueda de carro)',
      description:
        'Rectitud, atención y precisión en cada radio. Desarrolla la rectitud y la obediencia a las ayudas. El caballo aprende a salir derecho, volver derecho y esperar la siguiente indicación desde el centro.',
      objective:
        'Mejorar la rectitud en salidas y regresos, desarrollar la atención y la obediencia, aumentar la coordinación y el equilibrio, fortalecer transiciones y cambios de dirección, y promover un ritmo constante y controlado.',
      focus: 'Rectitud en los radios y espera en el centro',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Círculo de 18–22 m de diámetro con 8 conos alrededor (A a H) y 1 cono en el centro (ajustar según el tamaño y nivel del caballo).',
            'Recorrido sugerido: Centro → A → Centro → B → Centro → C → Centro → D → Centro → E → Centro → F → Centro → G → Centro → H → Centro (y repetir en sentido contrario).',
          ],
        },
        {
          title: 'Cómo recorrerlo',
          steps: [
            'Entrá al paso o al trote por el centro.',
            'Establecé el ritmo y preparate en posición y ayudas.',
            'Salí del centro hacia el cono A por el radio.',
            'Rodeá el cono A (por dentro) y regresá al centro por la misma línea.',
            'Desde el centro, salí hacia el cono B por el radio.',
            'Rodeá el cono B y regresá al centro.',
            'Continuá con los conos C, D, E, F, G y H, siempre volviendo al centro después de cada uno.',
            'Repetí el ejercicio alternando el sentido (horario y antihorario).',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá al cono al que te dirigís y luego al centro al regresar.'],
            },
            {
              title: 'Asiento',
              steps: ['Mantenete centrada. Acompañá el movimiento y equilibrá al caballo en cada salida y regreso.'],
            },
            {
              title: 'Pierna interior (impulsión)',
              steps: ['Pide impulsión para salir del centro y mantener la rectitud en el radio.'],
            },
            {
              title: 'Pierna exterior (soporte)',
              steps: ['Controla la grupa y ayuda a mantener el equilibrio y la línea recta.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión para rodear el cono y mantiene la conexión al regresar.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula el hombro y mantiene el cuerpo del caballo alineado en el radio.'],
            },
          ],
        },
      ],
      gear: ['8 conos alrededor + 1 en el centro', 'Espacio de 18–22 m de diámetro'],
      duration: '15–20 min',
      reps: 'Progresión: comenzar al paso → trabajar 4 radios (cruz) y luego 8 → aumentar precisión y rectitud → incorporar transiciones en el centro → variar el tamaño del círculo → probar al trote y luego al galope',
      prerequisites: ['Línea con transiciones'],
      safety: [
        'Detené o hacé una transición suave en el centro antes de salir al siguiente radio',
        'No dejes que el caballo se incline ni se desvíe',
      ],
      commonMistakes: [
        'No sale recto (falta de impulsión, mirada al suelo o a un lado): mirá al cono destino y usá la pierna interior para pedir impulsión.',
        'No vuelve por la misma línea (falta de rectitud, peso desbalanceado): mantené el ritmo y usá las ayudas para sostener la línea.',
        'Anticipa el siguiente radio (falta de atención, mira al próximo cono antes de tiempo): volvé al centro y pausá esperando una nueva indicación.',
        'Se inclina en el cono (demasiada velocidad, maniobra con el cuerpo sin control): reducí velocidad, pedí flexión y regulá con tus ayudas.',
        'No espera en el centro (falta de obediencia, no se detiene ni se regula): pedí una transición suave y detené o equilibrá en el centro.',
      ],
      instructorTips: [
        'La precisión en el centro y la rectitud en los radios crean un caballo atento, ligero y equilibrado.',
        'Mirá siempre hacia el próximo cono y usá tu cuerpo y tus ayudas con claridad.',
        'La claridad en cada salida y la calma en el centro convierten este ejercicio en una herramienta poderosa.',
      ],
      advanceCriteria: [
        'Sale y vuelve recto por la misma línea en al menos 6 de los 8 radios',
        'Espera con calma en el centro antes de recibir la siguiente indicación',
        'Sostiene el ejercicio en ambos sentidos sin perder el ritmo',
      ],
      transitionTo: ['box-pattern'],
    },
    {
      id: 'box-pattern',
      image: '/plans/exercise/etapa2-box-pattern.png',
      name: 'Box pattern (patrón de caja)',
      description:
        'Precisión, control y transiciones. Mejora la rectitud en las líneas y esquinas, y la capacidad del caballo para responder a las transiciones entre aires manteniendo la conexión y el equilibrio.',
      objective:
        'Mejorar la precisión en las líneas y esquinas, desarrollar transiciones claras y suaves, fortalecer la rectitud y el control del cuerpo, mejorar la conexión y la respuesta, y preparar para ejercicios más avanzados.',
      focus: 'Precisión en las esquinas y transiciones entre aires',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Cuadrado de 18–22 m de cada lado, marcado con 4 conos (A, B, C, D). Asegurate de tener espacio suficiente para las líneas rectas.',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso o al trote por el punto A, mirando al frente.',
            'Establecé el ritmo y preparate en posición y ayudas.',
            'Línea recta hasta el punto B.',
            'Doblá a la derecha en la esquina B usando tu mirada, tu cuerpo y tu rienda exterior.',
            'Línea recta hasta el punto C.',
            'Doblá a la derecha en la esquina C.',
            'Línea recta hasta el punto D.',
            'Doblá a la derecha en la esquina D y línea recta hasta volver a A.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá hacia la próxima línea o esquina antes de llegar.'],
            },
            {
              title: 'Asiento y peso',
              steps: ['Sentate centrada. Usá tu asiento para acompañar las transiciones y mantener el equilibrio.'],
            },
            {
              title: 'Pierna interior',
              steps: ['A la cincha. Pide flexión y prepara la esquina.'],
            },
            {
              title: 'Pierna exterior',
              steps: ['Un poco atrás de la cincha. Controla la grupa y mantiene la rectitud en las líneas.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y sostiene la incurvación en la esquina.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula la dirección y evita que los hombros se abran en la esquina.'],
            },
          ],
        },
      ],
      gear: ['4 conos', 'Espacio de 18–22 m de cada lado'],
      duration: '15–20 min',
      reps: 'Progresión: box grande al paso → grande al trote → mediano al trote → transiciones en cada esquina → cambios de aire en cada esquina (trote–paso–trote) → box más pequeño y con mayor precisión',
      prerequisites: ['Wagon Wheel'],
      safety: [
        'Preparate la esquina antes de llegar; pedí el cambio al salir de ella, no dentro',
        'Mirá siempre al frente, no al suelo',
      ],
      commonMistakes: [
        'Corta las esquinas (falta de preparación, mirada al suelo): mirá hacia la esquina, preparate con tiempo y marcá bien la curva.',
        'Se cae por el hombro al girar (falta de control del hombro, exceso de rienda interior): usá la rienda exterior, activá la pierna exterior y mantené la rectitud.',
        'Pierde la rectitud en las líneas (falta de apoyo lateral, asiento desalineado): revisá tu posición, usá ayudas laterales y mirá al frente.',
        'Transiciones bruscas o tardías (falta de preparación, ayudas poco claras): preparate antes de la esquina, pedí la transición al salir y buscá suavidad en las ayudas.',
        'Ritmo inconsistente (falta de planificación, pierde energía o acelera): mantené un ritmo constante, usá varias transiciones y buscá un caballo "entre ayudas".',
      ],
      instructorTips: [
        'La calidad de las esquinas es la clave: prepará la esquina antes de llegar y pedí el cambio al salir de ella.',
        'Precisión en las líneas, claridad en las esquinas y suavidad en las transiciones.',
        'Un box bien hecho es la base de muchos ejercicios.',
      ],
      advanceCriteria: [
        'Dobla las cuatro esquinas con la misma precisión y ritmo',
        'Sostiene transiciones de aire en cada esquina sin perder la forma',
        'Reduce el tamaño del box sin perder la calidad',
      ],
      transitionTo: ['circulos-transiciones'],
    },
    {
      id: 'circulos-transiciones',
      image: '/plans/exercise/etapa2-circulos-transiciones.png',
      name: 'Círculos con transiciones',
      description:
        'Ritmo, equilibrio y conexión en cualquier dirección. Mejora la flexibilidad, la respuesta a las ayudas, el equilibrio y la atención del caballo. Desarrolla la capacidad de cambiar de aire y de ritmo con suavidad.',
      objective:
        'Mejorar la respuesta a las ayudas, desarrollar transiciones suaves y precisas, aumentar el equilibrio en círculos, fortalecer la conexión y la atención, y mejorar el control del ritmo y la dirección.',
      focus: 'Transiciones dentro de un círculo grande',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Círculo grande de 20–25 m de diámetro con 7 conos marcando los puntos de transición.',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso por el punto 1 y establecé el ritmo.',
            'Transición a trote en el punto 2.',
            'Transición a galope en el punto 3.',
            'Transición a trote en el punto 4.',
            'Transición a paso en el punto 5.',
            'Transición a trote en el punto 6.',
            'Transición a galope en el punto 7.',
            'Volvé a paso en el punto 1 y repetí en el otro sentido.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá hacia el siguiente punto del círculo, por donde querés ir.'],
            },
            {
              title: 'Asiento',
              steps: ['Preparate la transición con tu asiento: recogé para subir de ritmo, relajá para bajarlo.'],
            },
            {
              title: 'Pierna (impulsión)',
              steps: ['Pide con la pierna para avanzar o subir de ritmo.'],
            },
            {
              title: 'Pierna (soporte)',
              steps: ['Sostené con la pierna para mantener el ritmo y el equilibrio en el círculo.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y mantiene el hombro en la línea del círculo.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula el ritmo y el tamaño del círculo; apoya en las transiciones.'],
            },
          ],
        },
      ],
      gear: ['7 conos', 'Espacio de 20–25 m de diámetro'],
      duration: '15–20 min',
      reps: 'Progresión: círculo al paso → al trote → transiciones en 4 puntos → en 6 puntos → en todos los puntos → cambiar de sentido y repetir',
      prerequisites: ['Box Pattern'],
      safety: [
        'Prepará cada transición con tu asiento antes de pedirla',
        'Mantené el círculo redondo y del mismo tamaño',
      ],
      commonMistakes: [
        'Círculo ovalado (falta de guía o mirada, hombros se salen): mirá al siguiente punto, usá la rienda interior y sostené con la pierna interior.',
        'Se abre en las transiciones (falta de preparación, pierde impulso y conexión): preparate antes de la transición, sostené con la pierna interior y pedí impulsión clara.',
        'Pasa por dentro del círculo (exceso de flexión, pierna interna débil): regulá la flexión, usá la pierna externa y mirá al siguiente punto.',
        'Se acelera o se desacelera (ritmo inconsistente, falta de control del cuerpo): mantené tu ritmo estable, usá transiciones suaves y respirá y relajate.',
        'No responde a las ayudas (ayudas poco claras, falta de atención): sé más clara y precisa, pedí y soltá, y recompensá la respuesta.',
      ],
      instructorTips: [
        'La preparación es la base de una transición suave: pedí antes, no al mismo tiempo.',
        'Cada transición es una conversación: preparala, pedila y acompañala.',
        'Ritmo claro, ayudas finas, caballo conectado.',
      ],
      advanceCriteria: [
        'Mantiene el círculo redondo mientras hace transiciones en 4 a 6 puntos',
        'Ejecuta transiciones suaves de paso, trote y galope sin perder la forma',
        'Sostiene el ejercicio en ambos sentidos con calma',
      ],
      transitionTo: ['clover-leaf'],
    },
    {
      id: 'clover-leaf',
      image: '/plans/exercise/etapa2-clover-leaf.png',
      name: 'Clover leaf (4 pétalos)',
      description:
        'Equilibrio, flexibilidad y control de dirección. El clover leaf (trébol de 4 pétalos) desarrolla la capacidad del caballo para doblar, cambiar de dirección con fluidez y mantener el ritmo en espacios reducidos.',
      objective:
        'Mejorar la flexibilidad y la dirección, desarrollar transiciones y cambios suaves, fortalecer la incurvación y la rectitud, mejorar la conexión, el ritmo y la atención, y trabajar el control del hombro y la grupa.',
      focus: 'Cambios de dirección fluidos en cuatro círculos',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Cuatro círculos de 18–20 m de diámetro cada uno (ajustar según el caballo), formando un trébol con centro común.',
            'Empezá grande y con ritmo constante; a medida que el caballo gane fluidez, reducí el tamaño de los círculos sin perder el equilibrio.',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso o al trote por la línea central, mirando al frente.',
            'Establecé el ritmo y preparate en posición y ayudas.',
            'Hacé un círculo a la derecha manteniendo la incurvación y el ritmo.',
            'Al llegar al centro, mantené la rectitud unos pasos.',
            'Hacé un círculo a la izquierda.',
            'Nuevamente al centro, mantené la rectitud.',
            'Hacé un círculo a la derecha.',
            'Cruzá el centro y hacé el último círculo a la izquierda para completar los 4 "pétalos" del trébol.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá al frente y hacia la dirección del círculo, no al suelo.'],
            },
            {
              title: 'Asiento y peso',
              steps: ['Sentate centrada. Usá tu peso para acompañar la incurvación (ligero hacia adentro del círculo).'],
            },
            {
              title: 'Pierna interior',
              steps: ['A la cincha. Pide flexión y mantiene la incurvación. Es la ayuda principal para doblar.'],
            },
            {
              title: 'Pierna exterior',
              steps: ['Un poco atrás de la cincha. Controla la grupa y ayuda a mantener el tamaño del círculo.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y sostiene la incurvación. Contacto suave y constante.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Abre y regula. Evita que los hombros se vayan por dentro y mantiene la línea del círculo.'],
            },
          ],
        },
      ],
      gear: ['4 conos', 'Espacio de 18–20 m de diámetro por círculo'],
      duration: '15–20 min',
      reps: 'Progresión: clover leaf grande al paso → grande al trote → mediano al trote → más pequeño con transiciones más precisas → pequeño con cambios de ritmo (transición a paso en cada centro)',
      prerequisites: ['Círculos con transiciones'],
      safety: [
        'Mantené el tamaño de los círculos parejo',
        'No te inclines ni mires hacia el círculo; mirá siempre al frente',
      ],
      commonMistakes: [
        'Círculos desiguales (falta de control de la dirección, mirada y ayudas inconsistentes): reafirmá el tamaño con la pierna exterior y la rienda exterior, y mirá al frente entre cambios.',
        'Se pierde el ritmo en el cambio (falta de preparación antes del centro, transición brusca): mantené el ritmo hasta el centro, preparate el siguiente círculo con anticipación y usá transiciones más suaves.',
        'El caballo se cae hacia afuera (exceso de rienda interior, falta de apoyo exterior): sostené con la rienda exterior, activá la pierna exterior y mantené tu hombro alineado.',
        'Se cae el hombro por afuera (falta de control del hombro con la rienda exterior, mirada hacia el círculo): abrí la rienda exterior, mirá al frente y mantené la línea del hombro.',
        'Pierde el equilibrio en el centro (falta de rectitud antes y después del centro, cambios sin preparar): mantené la rectitud varios pasos en el centro y preparate el siguiente círculo con tus ayudas.',
      ],
      instructorTips: [
        'Mantené el tamaño de los círculos parejo; no te inclines ni mires hacia el círculo, mirá siempre al frente y usá ayudas sutiles y precisas.',
        'Prepará cada cambio con anticipación, usá ayudas pequeñas y mantené la fluidez en todo el patrón.',
        'La precisión en los pequeños detalles crea grandes diferencias.',
      ],
      advanceCriteria: [
        'Completa los cuatro pétalos con el mismo tamaño y ritmo',
        'Mantiene la rectitud varios pasos en cada paso por el centro',
        'Sostiene el patrón al trote con transiciones dentro de cada pétalo',
      ],
      transitionTo: ['serpentinas'],
    },
    {
      id: 'serpentinas',
      image: '/plans/exercise/etapa2-serpentinas.png',
      name: 'Serpentinas',
      description:
        'Fluidez, cambios de flexión y control del cuerpo. Las serpentinas desarrollan la fluidez del caballo, la coordinación y la capacidad de cambiar de flexión manteniendo el ritmo y la rectitud.',
      objective:
        'Mejorar la fluidez y la coordinación, desarrollar cambios de flexión suaves, fortalecer la incurvación y la rectitud, mejorar la conexión entre ayudas y respuesta, y mantener el ritmo constante en todo el recorrido.',
      focus: 'Cambios de flexión suaves en curvas alternadas',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Serpentina de 3 a 5 bucles a lo largo de la línea central, con 18–22 m entre cada cambio de dirección y 6–8 m de ancho (ajustar según el tamaño del caballo).',
            'Un cono al inicio y otro al final de la línea central.',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso o al trote por la línea central, mirando al frente.',
            'Establecé el ritmo y preparate en posición y ayudas.',
            'Desplazate en diagonal hacia la derecha para iniciar la primera curva.',
            'Cuando llegues a la línea imaginaria, cambiá de flexión y guiá la curva hacia la izquierda.',
            'Desplazate nuevamente en diagonal hacia la derecha.',
            'Cambiá de flexión y guiá la curva hacia la derecha.',
            'Continuá alternando las diagonales y los cambios de flexión hasta el final.',
            'Salí por la línea central, manteniendo el ritmo y la rectitud.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá hacia la siguiente diagonal y el punto de salida de la curva. Tu mirada guía la dirección.'],
            },
            {
              title: 'Asiento y peso',
              steps: ['Sentate centrada. Usá tu asiento para acompañar la curva y preparar el cambio de flexión.'],
            },
            {
              title: 'Pierna interior',
              steps: ['A la cincha. Pide flexión y mantiene la incurvación al entrar en la curva.'],
            },
            {
              title: 'Pierna exterior',
              steps: ['Un poco atrás de la cincha. Sostiene la grupa y ayuda a mantener la rectitud y el tamaño de la curva.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y sostiene la incurvación.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula la dirección y el tamaño de la curva. Abre y cierra ligeramente según necesites.'],
            },
          ],
        },
      ],
      gear: ['2 conos', 'Espacio de 6–8 m de ancho por el largo de la pista'],
      duration: '15–20 min',
      reps: 'Progresión: serpentinas al paso → al trote sentado → al trote en posting → con transiciones dentro de las curvas → más cerradas o con más diagonales → al galope cuando estén listas',
      prerequisites: ['Clover Leaf'],
      safety: [
        'No dejes que el caballo se adelante o se desborde en las curvas',
        'Mantené el ritmo y el tamaño de las curvas',
      ],
      commonMistakes: [
        'Se pierde el ritmo (falta de preparación, transiciones bruscas): preparate con anticipación, usá transiciones más suaves y mantené el ritmo constante.',
        'El caballo se abre en las curvas (falta de pierna interior, riendas sin contacto): activá la pierna interior y sostené con la rienda interior.',
        'El caballo se cae por dentro (falta de pierna exterior, exceso de rienda interior): usá la pierna exterior para sostener la grupa y abrí ligeramente la rienda exterior.',
        'Los cambios de flexión son bruscos (falta de anticipación, demasiada ayuda de rienda): preparate el cambio de flexión antes de la línea y usá tu asiento y piernas.',
        'El caballo se adelanta en las curvas (falta de control y conexión, jinete inclinada hacia adelante): sentate más profundo y sostené el ritmo con tu asiento y piernas.',
      ],
      instructorTips: [
        'Anticipá los cambios con tu mirada y tu cuerpo; mantené el ritmo y el tamaño de las curvas.',
        'Usá tu mirada, tu cuerpo y tu respiración para guiar al caballo de una curva a la otra: la preparación es la clave.',
        'La fluidez nace de la preparación, la claridad de tus ayudas y la suavidad de tus transiciones.',
      ],
      advanceCriteria: [
        'Completa 3 a 5 bucles con curvas parejas y el mismo ritmo',
        'Cambia de flexión con suavidad en cada línea central',
        'Sostiene el trazado al trote sentado sin perder la rectitud',
      ],
      transitionTo: ['molino-de-viento'],
    },
    {
      id: 'molino-de-viento',
      image: '/plans/exercise/etapa2-molino-de-viento.png',
      name: 'Molino de viento (windmill)',
      description:
        'Control del cuerpo, equilibrio y precisión en los cambios de dirección. El molino de viento desarrolla el control del centro, la coordinación del caballo y la capacidad de cambiar de dirección alrededor del centro manteniendo la rectitud y el ritmo.',
      objective:
        'Mejorar el control del centro y de las transiciones, desarrollar equilibrio y coordinación, aumentar la precisión en los cambios de dirección, fortalecer la conexión y la atención, y mejorar la fluidez y el ritmo.',
      focus: 'Control del centro y precisión en cada radio',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Círculo de 18–22 m de diámetro con 8 conos alrededor (numerados 1 a 8) y opcionalmente 1 en el centro.',
            'Recorrido sugerido: 1 → Centro → 2 → Centro → 3 → Centro → 4 → Centro → 5 → Centro → 6 → Centro → 7 → Centro → 8 → Centro → 1 (y repetir).',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso o al trote por el punto 1 (arriba), mirando al frente.',
            'Dirigite al centro y, desde allí, continuá al punto 2 (diagonal derecha).',
            'Desde 2, volvé al centro.',
            'Continuá al punto 3 (derecha).',
            'Desde 3, volvé al centro.',
            'Continuá al punto 4 (diagonal derecha abajo).',
            'Desde 4, volvé al centro.',
            'Continuá al punto 5 (abajo) y repetí el patrón pasando por los puntos 6, 7 y 8, siempre regresando al centro entre cada radio.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá siempre al siguiente punto antes de salir del centro. Tu mirada guía la dirección.'],
            },
            {
              title: 'Asiento y peso',
              steps: ['Sentate centrada. Usá tu asiento para acompañar las transiciones y mantener el equilibrio en el centro.'],
            },
            {
              title: 'Pierna interior',
              steps: ['A la cincha. Pide flexión y mantiene la incurvación hacia el centro en cada radio.'],
            },
            {
              title: 'Pierna exterior',
              steps: ['Un poco atrás de la cincha. Sostiene la grupa y ayuda a mantener la rectitud en los radios.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y mantiene la conexión hacia el centro.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula la dirección y el tamaño del radio. Abre y cierra según necesites.'],
            },
          ],
        },
      ],
      gear: ['8 conos alrededor + 1 en el centro (opcional)', 'Espacio de 18–22 m de diámetro'],
      duration: '15–20 min',
      reps: 'Progresión: molino al paso en ambas direcciones → al trote sentado → al trote en posting → aumentar el tamaño del círculo → reducir el tamaño (más desafío) → cambiar de ritmo (paso–trote–paso)',
      prerequisites: ['Serpentinas'],
      safety: [
        'Hacé paradas más claras en el centro si el caballo pierde precisión',
        'No dejes que el caballo se incline en las curvas',
      ],
      commonMistakes: [
        'No vuelve al centro (falta de precisión, pierde equilibrio): hacé paradas más claras en el centro y revisá tu línea al siguiente punto.',
        'El caballo se inclina en las curvas (falta de incurvación, exceso de rienda exterior): usá pierna interior activa y pedí flexión antes de salir.',
        'Transiciones bruscas en los radios (falta de preparación, ayudas confusas): preparate la transición en el centro y usá ayudas suaves y anticipadas.',
        'Pierde el ritmo en el centro (demasiada rienda, falta de impulsión): mantené la impulsión con pierna y asiento, y sostené una línea recta con contacto constante.',
        'Ritmo inconsistente en todo el patrón (falta de constancia, cambios de velocidad): elegí un ritmo y manténlo, respirá y relajate.',
      ],
      instructorTips: [
        'El centro es el corazón del ejercicio: cuidá tu equilibrio y mantené tu mirada y tu cuerpo alineados hacia el siguiente punto.',
        'Mantené el ritmo constante en todo el ejercicio y usá transiciones suaves y claras.',
        'Claridad en tus ayudas, equilibrio en cada dirección.',
      ],
      advanceCriteria: [
        'Vuelve al centro con precisión en al menos 6 de los 8 radios',
        'Mantiene el ritmo constante en todo el patrón',
        'Sostiene el ejercicio en ambos sentidos con calma y equilibrio',
      ],
      transitionTo: ['cuadrado-circulos-esquinas'],
    },
    {
      id: 'cuadrado-circulos-esquinas',
      image: '/plans/exercise/etapa2-cuadrado-circulos-esquinas.png',
      name: 'Cuadrado con círculos en las esquinas',
      description:
        'Conexión, rectitud, equilibrio y transiciones suaves. Este ejercicio combina líneas rectas y círculos para mejorar la respuesta a las ayudas, la flexibilidad, la conexión y la calidad de las transiciones en cada cambio de dirección.',
      objective:
        'Mejorar la conexión y la respuesta a las ayudas, desarrollar transiciones precisas y suaves, aumentar el equilibrio en cambios de dirección, mejorar la rectitud en las líneas, fortalecer la atención y la concentración, y promover la fluidez y el control del cuerpo.',
      focus: 'Integración de líneas rectas y círculos con transiciones',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Cuadrado de 20–25 m de lado con un círculo de 8–10 m de diámetro en cada esquina.',
            'Recorrido sugerido: Paso → Trote → Trote en círculo → Trote → Galope → Galope en círculo → Galope → Trote → Trote en círculo → Paso (y repetir en sentido antihorario).',
          ],
        },
        {
          title: 'Paso a paso',
          steps: [
            'Entrá al paso por el punto medio de uno de los lados.',
            'Transición a trote y seguí hasta la esquina.',
            'En la esquina, hacé el círculo al trote (8–10 m de diámetro).',
            'Salí del círculo y continuá al trote por el siguiente lado.',
            'Transición a galope en el siguiente punto medio.',
            'Galopá hasta la esquina y realizá el círculo al galope.',
            'Salí del círculo y continuá galopando por el siguiente lado.',
            'Transición a trote en el siguiente punto medio.',
            'Trotá hasta la última esquina, hacé el círculo al trote.',
            'Salí al paso en el último punto medio y repetí en el otro sentido.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá hacia el siguiente lado y luego hacia el centro del círculo.'],
            },
            {
              title: 'Asiento',
              steps: ['Preparate la transición con tu asiento: recogé para subir de ritmo, profundizá para bajarlo.'],
            },
            {
              title: 'Pierna (impulsión)',
              steps: ['Usá la pierna para impulsar hacia adelante y mantener la energía.'],
            },
            {
              title: 'Pierna (soporte)',
              steps: ['Usá la pierna externa en las curvas y la interna en línea recta para mantener el equilibrio.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y mantiene la conexión hacia el centro del círculo.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula la dirección y el tamaño del círculo. Acompaña en las transiciones.'],
            },
          ],
        },
      ],
      gear: ['4 conos para el cuadrado (20–25 m de lado)', '4 conos para los círculos de esquina (8–10 m de diámetro)'],
      duration: '20–25 min',
      reps: 'Progresión: cuadrado al paso → agregar círculos al trote → incorporar transiciones en los puntos medios → cambiar el tamaño de los círculos → trabajar en ambos sentidos → aumentar la precisión y la fluidez',
      prerequisites: ['Molino de Viento'],
      safety: [
        'Preparate cada esquina antes de llegar; pensá tu trayectoria con anticipación',
        'Mantené tus ayudas claras y discretas',
      ],
      commonMistakes: [
        'Esquinas cerradas (falta de preparación, flexión excesiva): preparate antes de la esquina, mirá hacia la salida del círculo y usá la rienda externa para abrir.',
        'No mantiene rectitud en los lados (falta de conexión lateral, hombros o grupa se desvían): usá la línea del cuadrado, ajustá con asiento y piernas y mirá al punto medio siguiente.',
        'Transiciones bruscas o tardías (falta de planificación, ayudas confusas): preparate con anticipación, usá ayudas progresivas y mantené el ritmo.',
        'Círculos desiguales (riendas desparejas, falta de control del tamaño): regulá con la rienda exterior, mantené la flexión constante y usá un punto fijo de referencia.',
        'Pérdida de ritmo en las transiciones (cambios sin fluidez, falta de equilibrio): transicioná suave y claro, y sostené con asiento y piernas.',
      ],
      instructorTips: [
        'Planificá tu ayuda antes de cada esquina; pensá tu trayectoria y mantené tus ayudas claras y discretas.',
        'La claridad en cada transición es el puente entre tu ayuda y la respuesta del caballo.',
        'Conexión, equilibrio, atención.',
      ],
      advanceCriteria: [
        'Sostiene las líneas rectas del cuadrado sin desviarse',
        'Ejecuta los cuatro círculos de esquina con el mismo tamaño y ritmo',
        'Combina transiciones en los puntos medios sin perder la fluidez',
      ],
      transitionTo: ['patron-combinado'],
    },
    {
      id: 'patron-combinado',
      image: '/plans/exercise/etapa2-patron-combinado.png',
      name: 'Patrón combinado',
      description:
        'Múltiples figuras, múltiples beneficios. Este patrón combina diferentes figuras y transiciones para desarrollar la versatilidad del caballo, mejorar la respuesta a las ayudas, el equilibrio, la conexión y el control del ritmo en diversas situaciones.',
      objective:
        'Desarrollar la versatilidad y obediencia, mejorar la calidad de las transiciones, aumentar la conexión y el equilibrio, fortalecer la atención y la rectitud, trabajar el control del ritmo y la dirección, y preparar al binomio para situaciones reales de trabajo.',
      focus: 'Integración de todas las figuras de la Etapa 2 en un solo recorrido',
      methodSections: [
        {
          title: 'Cómo armarlo',
          steps: [
            'Combina un cuadrado (18–20 m de lado), círculos en dos esquinas (10–12 m de diámetro), una línea diagonal y un círculo central, todos alrededor de un cono de entrada/salida.',
            'Medidas de referencia: lado del cuadrado 18–20 m, círculos 10–12 m de diámetro. Ajustar según el tamaño y nivel del caballo.',
          ],
        },
        {
          title: 'Paso a paso (ejemplo)',
          steps: [
            'Entrá al paso por el cono de entrada.',
            'Transición a trote y avanzá por la línea recta.',
            'Transición a galope antes de la esquina.',
            'En la esquina, hacé el círculo a la derecha al galope.',
            'Transición a trote al salir del círculo.',
            'En la esquina siguiente, hacé el círculo a la izquierda al trote.',
            'Transición a galope en el siguiente tramo.',
            'Galopá por la línea diagonal hacia el centro (opuesto).',
            'En el centro, realizá un círculo al galope.',
            'Transición a trote, luego a paso al salir, y continuá a la línea de salida.',
          ],
        },
        {
          title: 'Cómo usar tus ayudas',
          methodSubSections: [
            {
              title: 'Mirada',
              steps: ['Mirá siempre al siguiente punto. Tu mirada guía la dirección y el ritmo.'],
            },
            {
              title: 'Asiento',
              steps: ['Acompañá cada transición con tu asiento. Sentate profundo para frenar, suavizá para avanzar.'],
            },
            {
              title: 'Pierna (impulsión)',
              steps: ['Usá la pierna para pedir impulsión en las rectas y mantener el galope en las curvas.'],
            },
            {
              title: 'Pierna (soporte)',
              steps: ['Sostené con la pierna interna en las curvas y en el centro para mantener el equilibrio.'],
            },
            {
              title: 'Rienda interior',
              steps: ['Pide flexión y mantiene la conexión hacia el interior en las curvas y el círculo central.'],
            },
            {
              title: 'Rienda exterior',
              steps: ['Regula el ritmo y evita que el hombro se abra en las curvas y transiciones.'],
            },
          ],
        },
      ],
      gear: ['1 cono de entrada/salida', '4 conos para el cuadrado', '2 conos para los círculos de esquina', '1 cono para el círculo central'],
      duration: '20–30 min',
      reps: 'Progresión: patrón al paso únicamente → agregar trote en las rectas → incorporar círculos al trote → agregar galope en las curvas → trabajar el círculo central → ejecutar el patrón completo, repetir en sentido contrario y variar según el objetivo',
      prerequisites: ['Cuadrado con círculos en las esquinas'],
      safety: [
        'No te inclines en las curvas',
        'Usá ayudas discretas y efectivas, y confiá en tu caballo',
      ],
      commonMistakes: [
        'Pierde la rectitud (el caballo se desvía en las rectas, falta de línea y conexión): mirá al siguiente punto, ajustá con rienda y pierna, y trabajá en líneas más cortas.',
        'Transiciones bruscas (cambios de ritmo abruptos, tensión en el cuerpo): anticipá la transición, pedí suavidad en vez de velocidad.',
        'Pierde el galope en las curvas (se cae a trote o se acelera mucho, falta de equilibrio y soporte): sostené con la pierna interna, mantené el ritmo y la flexión.',
        'No mira al siguiente punto (la mirada se queda en el suelo o en el obstáculo, falta de anticipación): levantá la mirada, fijá tu objetivo y confiá en tu caballo.',
        'Ritmo inconsistente (acelera o frena sin control, falta de regulación): usá transiciones frecuentes, respirá y mantené tu centro, y priorizá la calidad del ritmo antes que la prisa.',
      ],
      instructorTips: [
        'Ritmo constante y transiciones suaves; mirá siempre al siguiente punto y no te inclines en las curvas.',
        'La armonía entre tu plan y la respuesta de tu caballo crea un binomio ligero y confiado.',
        'Claridad en el plan, suavidad en la ejecución.',
        'Este patrón integra todo lo trabajado en la Etapa 2: ritmo, control, precisión y comunicación, dejando al binomio listo para las maniobras de la Etapa 3.',
      ],
      advanceCriteria: [
        'Ejecuta el recorrido completo en ambos sentidos manteniendo ritmo y rectitud',
        'Sostiene el galope en las curvas y en el círculo central sin perder el equilibrio',
        'Encadena todas las transiciones (paso–trote–galope–trote–paso) con suavidad',
      ],
    },
  ],
  stages: [
    {
      week: 1,
      title: 'Fundamentos: rectitud y ritmo',
      description:
        'Círculo, cuadrado y barras al suelo para instalar ritmo constante, rectitud y equilibrio básico montado.',
      exerciseIds: ['circulo', 'cuadrado', 'barras-al-suelo'],
      dayPlans: [
        ['circulo'],
        ['cuadrado'],
        ['barras-al-suelo'],
        ['circulo', 'cuadrado'],
        ['cuadrado', 'barras-al-suelo'],
      ],
    },
    {
      week: 2,
      title: 'Precisión y transiciones',
      description:
        'Figura de 8, diamante y línea con transiciones para trabajar cambios de flexión, diagonales y transiciones entre aires.',
      exerciseIds: ['figura-de-8', 'diamante', 'linea-transiciones'],
      dayPlans: [
        ['figura-de-8'],
        ['diamante'],
        ['linea-transiciones'],
        ['figura-de-8', 'diamante'],
        ['diamante', 'linea-transiciones'],
      ],
    },
    {
      week: 3,
      title: 'Cambios de dirección',
      description:
        'Wagon wheel, box pattern y círculos con transiciones para mejorar rectitud en los radios, precisión en esquinas y transiciones dentro del círculo.',
      exerciseIds: ['wagon-wheel', 'box-pattern', 'circulos-transiciones'],
      dayPlans: [
        ['wagon-wheel'],
        ['box-pattern'],
        ['circulos-transiciones'],
        ['wagon-wheel', 'box-pattern'],
        ['box-pattern', 'circulos-transiciones'],
      ],
    },
    {
      week: 4,
      title: 'Flexibilidad avanzada',
      description:
        'Clover leaf, serpentinas y molino de viento para desarrollar múltiples cambios de flexión y dirección con fluidez.',
      exerciseIds: ['clover-leaf', 'serpentinas', 'molino-de-viento'],
      dayPlans: [
        ['clover-leaf'],
        ['serpentinas'],
        ['molino-de-viento'],
        ['clover-leaf', 'serpentinas'],
        ['serpentinas', 'molino-de-viento'],
      ],
    },
    {
      week: 5,
      title: 'Integración',
      description:
        'Cuadrado con círculos en las esquinas: combina líneas rectas y círculos con transiciones de paso, trote y galope.',
      exerciseIds: ['cuadrado-circulos-esquinas'],
    },
    {
      week: 6,
      title: 'Síntesis: patrón combinado',
      description:
        'Patrón combinado que integra todas las figuras trabajadas, dejando al binomio listo para las maniobras de la Etapa 3.',
      exerciseIds: ['patron-combinado'],
    },
  ],
  progressionNote:
    'Repetí cada figura 3–5 veces por lado hasta lograr fluidez y ritmo constante antes de sumar velocidad o reducir el tamaño. La calidad de la figura siempre va antes que la velocidad o el tamaño.',
  successIndicators: [
    'Mantiene un ritmo constante en paso y trote a lo largo de toda la figura',
    'Sostiene rectitud e incurvación correctas en curvas y líneas',
    'Ejecuta transiciones suaves y a tiempo, sin ayudas bruscas',
    'Responde a ayudas de mirada, asiento, piernas y riendas cada vez más sutiles',
    'Encadena varias figuras seguidas (patrón combinado) sin perder la calma ni el equilibrio',
  ],
};
