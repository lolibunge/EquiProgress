import type { TrainingPlan } from '../types';

export const fundationalLesson: TrainingPlan = {
  id: 'fundational-lesson',
  category: 'Fundational Training',
  name: 'Aprendizaje básico',
  goal:
    'Construir una base de suavidad, reunión, coordinación rienda-pie, arco inverso y control de caderas para un trabajo montado más claro y organizado.',
  longDescription:
    'Lecciones fundamentales reúne cuatro bloques base para organizar el caballo desde la suavidad y la reunión. El recorrido comienza por la conexión entre nariz, cuello y dorso, sigue con la coordinación entre riendas y pies, después trabaja el arco inverso para ordenar balance y control, y termina con grupa adentro para mejorar la respuesta lateral. Es un plan que puede repetirse y ajustarse según la necesidad de cada caballo.',
  description:
    'Base técnica para desarrollar suavidad, reunión, coordinación corporal y control lateral.',
  duration: '4 semanas',
  weeks: 4,
  image: '/plans/continuing-1.png',
  exercises: [
    {
      id: 'soft-nose-and-collection',
      name: 'Nariz suave y reunión',
      image: '/plans/exercise/hombro-adentro.png',
      description:
        'Primer bloque del plan para desarrollar suavidad en la nariz, reunión y mejor disposición al trabajo. Trabaja cómo responde el caballo al freno, a las piernas y al contacto para volverlo más liviano, sensible, voluntarioso y con mejores bases para reunirse.',
      objective:
        'Lograr un caballo más liviano de nariz y más reunido, capaz de aceptar las ayudas con sensibilidad y llevar más peso sobre los posteriores.',
      focus: 'Suavidad de nariz, reunión, serpentinas, transiciones y suavidad del cuello.',
      methodSections: [
        {
          title: 'Suavidad',
          steps: [
            'La suavidad en la nariz es la respuesta al freno y a las señales de las piernas.',
            'Ayuda a que el caballo esté más dispuesto a trabajar y a aceptar lo que le pedimos.',
            'Es necesaria para quien busca un caballo liviano, sensible, voluntarioso, contento, bajo control y en camino a una buena reunión.',
            'Se construye durante toda la vida del caballo.',
            'La suavidad de la nariz viene de tus manos, no de la posición de la cabeza del caballo.',
            'Si liberas la presión de las riendas mientras el caballo todavía se apoya en el freno, harás que pese todavía más en el freno.',
            'Liberar cada vez que el caballo realmente afloja es lo que genera y mantiene la suavidad en la nariz.',
            'Mueve las manos despacio para darle oportunidad al caballo de leer señales más sutiles.',
          ],
        },
        {
          title: 'Reunión',
          steps: [
            'Un caballo bien reunido carga su peso en los posteriores más que en las manos.',
            'La reunión le permite moverse con más libertad y de forma más atlética.',
            'También ayuda a prevenir lesiones en las manos.',
            'Un caballo reunido baja la grupa y eleva la cruz.',
            'Esto se puede conseguir en paso, trote y galope.',
          ],
        },
        {
          title: 'Reunión en serpentinas',
          steps: [
            'Este ejercicio es excelente para calentar porque mantiene al caballo concentrado en cada vuelta.',
            'Si lo practicas 30 minutos por día durante 5 días, puedes notar un caballo más suave y sólido al andar.',
            'Anda el patrón de una serpentina al paso o al trote y trae la nariz del caballo hasta que flexione.',
            'Devuélvele la nariz y repite lo mismo hacia el otro lado.',
            'Continúa haciendo esto sin un límite fijo de práctica.',
            'Hazlo al paso o al trote durante 30 minutos.',
            'Empieza a enderezar el cuello para que el caballo flexione solo unos 5 cm la nariz hacia cada lado.',
            'Eso ayuda a generar la rectitud que buscas para una buena reunión.',
            'Haz círculos y serpentinas en los tres aires con la cabeza y nariz abajo y riendas suaves.',
            'Aliviana los hombros mientras haces las vueltas en los tres aires.',
          ],
        },
        {
          title: 'Aterrizaje, despegue y tiempo de suspensión',
          steps: [
            'Este ejercicio mejora la reunión mientras el caballo para y se mueve en las transiciones entre paso, trote y galope.',
            'También ayuda a que permanezca calmo cuando colocas la pierna durante las transiciones.',
            'Camina tres pasos y para.',
            'Reúne la nariz con las riendas empujando tu caballo hacia el freno desde atrás.',
            'Una vez que viene la nariz, suelta y camina tres pasos y vuelve a parar.',
            'Repite los pasos anteriores.',
            'No permitas que el caballo recule ni se mueva hacia otra dirección; solo libera cuando ceda la nariz.',
            'Luego, desde parado y ya reunido, pídele que dé unos pasos reunido y luego libera mientras sigue caminando.',
            'Para el aterrizaje, pide la reunión mientras camina, siéntate neutral y mantenla hasta que pare.',
          ],
        },
        {
          title: 'Cuello suave',
          steps: [
            'El cuello se compone de tres partes: la primera suaviza la nariz, la segunda eleva los hombros y la tercera eleva la espalda.',
            'Hay que trabajar las tres por separado.',
            'Empieza usando una rienda y fija la otra a la altura de la cadera o montura mientras estás en un círculo.',
            'Levanta la mano de la rienda no fija por arriba del cuello del caballo.',
            'Si lo haces bien, sentirás cómo el cuello y los hombros vienen hacia atrás hacia ti.',
            'Sigue levantando cuello y hombros hasta sentir que ceden; luego libera.',
            'Usa después las dos riendas para levantar ambos hombros mientras mantienes el impulso hacia adelante para conservar reunión y suavidad.',
          ],
        },
        {
          title: 'Flexión para la reunión',
          steps: [
            'Se hace en línea recta moviendo la nariz del caballo de una punta del hombro a la otra mientras la nariz está abajo.',
            'En esa transición de un lado al otro debes sentir que el caballo lo hace suave y libremente.',
            'Eso indica que lo está haciendo bien y que no hay resistencias.',
          ],
        },
      ],
      observe:
        'Buscar una nariz más liviana en el freno, mejor aceptación de las piernas, más peso en los posteriores, cuello y hombros más sueltos y transiciones más calmas.',
      cues: [
        'Manos lentas y sutiles',
        'Empuje desde atrás hacia el freno',
        'Liberar exactamente cuando cede',
        'Sentada neutral en la parada',
      ],
      gear: ['Montura habitual', 'Riendas'],
      duration: '30 min por sesión',
      prerequisites: [],
      safety: [
        'No liberar mientras el caballo todavía se apoya en el freno.',
        'No permitir que recule o se vaya hacia otra dirección al pedir reunión.',
        'No mover las manos rápido al buscar suavidad en la nariz.',
      ],
      progressSigns: [
        { label: 'Nariz más liviana y menos apoyo en el freno' },
        { label: 'Mejor flexión y reunión' },
        { label: 'Mayor estabilidad en serpentinas y transiciones' },
      ],
      advanceCriteria: [
        'Mantiene suavidad sin perder ritmo ni disposición.',
        'Puede reunir con menos resistencia en nariz, cuello y hombros.',
      ],
      commonMistakes: [
        'Liberar la presión cuando el caballo todavía está apoyado en el freno.',
        'Mover las manos demasiado rápido y no darle tiempo al caballo a leer la señal.',
        'Buscar la posición de la cabeza en vez de la verdadera suavidad de la nariz.',
        'Pedir demasiada reunión antes de lograr suavidad.',
      ],
      instructorTips: [
        'La suavidad de la nariz viene de tus manos, no de la posición de la cabeza.',
        'Prioriza suavidad antes que forma.',
        'Usa las serpentinas para ordenar el cuerpo, no solo para doblar.',
        'La reunión debe sentirse disponible, no forzada.',
      ],
      transitionTo: ['same-rein-same-foot'],
    },
    {
      id: 'same-rein-same-foot',
      name: 'Misma rienda, mismo pie',
      image: '/plans/exercise/trans-paso-galope.png',
      description:
        'Segundo bloque del plan para enseñar al caballo a seguir su nariz y conectar la acción de la rienda con el movimiento de los pies. Ayuda a evitar una flexión vacía de la cabeza y a construir una respuesta coordinada en hombros y grupa.',
      objective:
        'Lograr que el caballo conecte nariz, rienda y pie, desarrollando cambios reales en el cuerpo y no solo una posición de cabeza.',
      focus: 'Conexión entre rein, pie, hombro y cadera.',
      methodSections: [
        {
          title: 'La importancia de conectar la rienda y los pies',
          steps: [
            'Cada vez que levantas una rienda, asegúrate de pedirle al caballo un cambio real y no solo una posición de cabeza.',
            'Si solo obtienes la posición de la cabeza y no esperas una respuesta del cuerpo, el caballo se desconecta de los pies.',
            'Eso produce una nariz suave aislada, pero no una conexión verdadera entre nariz y movimiento.',
            'A largo plazo, esto resulta en un caballo que flexiona lateralmente pero no conecta su nariz con los pies.',
          ],
          methodSubSections: [
            {
              title: 'Ejercicio 1',
              steps: [
                'Hacer un arco inverso en un círculo.',
                'Luego cambiar cabeza y cuello hacia adentro usando rienda interna y pierna interna.',
                'Permitir que las costillas y la grupa se muevan hacia afuera.',
                'Continuar practicando hasta que el caballo conecte rienda interna con pie interno.',
              ],
            },
            {
              title: 'Ejercicio 2',
              steps: [
                'Usar rienda interna con nariz adentro y grupa afuera.',
                'Mantener inactivas la rienda externa y la pierna externa.',
                'Cuando empiece el giro en las manos del caballo, soltar la rienda interna y la pierna interna.',
                'Repetir lo mismo, pero al sacar las señales internas agregar la pierna de afuera para comenzar el giro en el posterior.',
                'Repetir nuevamente, dejando la pierna de afuera siempre puesta.',
              ],
            },
          ],
        },
        {
          title: 'Grupa, hombros y ejercicio de hombro',
          steps: [
            'El ejercicio de misma rienda, mismo pie se puede hacer después de la parada en cualquier aire.',
            'Comienza moviendo la grupa hacia un lado con la rienda.',
            'Cuando la grupa se movió lo suficiente como para que los hombros paren, la grupa dará uno o dos pasos más.',
            'Cambia la posición de tu mano para empujar la nariz nuevamente enfrente al punto de los hombros.',
            'El caballo dará uno o dos pasos hacia atrás.',
            'El hombro interno da el primer paso atrás seguido por el hombro externo.',
            'Una vez que conseguiste que la grupa se mueva continuamente, deja de pedir ese movimiento y trabaja en mover los hombros, uno por vez.',
            'Al galope, recuerda sentarte para frenar e inmediatamente retroceder usando una rienda.',
            'No lo sobrehagas.',
            'Alterna los lados y continúa entre 20 y 60 minutos, o hasta que la reculada sea constante, rápida y liviana en ambos lados.',
          ],
        },
      ],
      observe:
        'Buscar que la nariz deje de moverse sola, que los pies acompañen la señal de la rienda, y que hombros y grupa respondan con más coordinación y claridad.',
      cues: [
        'Rienda interna conectada al pie interno',
        'Pierna interna para pedir cambio real',
        'Pierna externa para organizar el posterior',
        'Cambio de mano para ordenar hombros',
      ],
      gear: ['Montura habitual', 'Riendas'],
      duration: '20–25 min',
      prerequisites: ['Nariz suave y reunión'],
      safety: [
        'No aceptar solo flexión de cabeza sin movimiento real del cuerpo.',
        'No avanzar si los hombros se caen o el caballo se desorganiza.',
        'No sobrehacer la reculada, especialmente al galope.',
      ],
      progressSigns: [
        { label: 'Mejor coordinación entre rienda y pie' },
        { label: 'Hombros y grupa más organizados' },
        { label: 'Respuesta más clara al patrón pedido' },
      ],
      advanceCriteria: [
        'Puede sostener la conexión entre mano y pie sin perder ritmo.',
        'Ordena hombros y caderas con menos corrección.',
      ],
      commonMistakes: [
        'Mover la rienda sin relación con el pie.',
        'Aceptar una posición de cabeza sin cambio real en el cuerpo.',
        'Corregir hombros y caderas por separado sin conexión.',
        'Perder claridad en la secuencia del ejercicio.',
      ],
      instructorTips: [
        'Piensa siempre qué pie quieres afectar y con qué rienda.',
        'El caballo debe seguir su nariz, no solo doblarla.',
        'El hombro debe sentirse guiado, no arrastrado.',
        'Primero claridad, después fluidez.',
      ],
      transitionTo: ['reverse-arc'],
    },
    {
      id: 'reverse-arc',
      name: 'Arco inverso',
      image: '/plans/exercise/contragalope.png',
      description:
        'Tercer bloque del plan para trabajar una contraflexión que afloja costillas, hombros y cuello. En el arco inverso el caballo se mueve en círculo con el cuerpo flexionado en sentido opuesto a la dirección en la que va, lo que ayuda a reorganizar el cuerpo y a mejorar el balance.',
      objective:
        'Aflojar costillas, hombros y cuello, corregir caballos que caen sobre el hombro interno o se salen del círculo, y desacelerar sin perder organización.',
      focus: 'Contraflexión, balance en círculo, control de hombros y anclaje del pie interno.',
      methodSections: [
        {
          title: 'Qué trabaja el arco inverso',
          steps: [
            'Es un ejercicio de contraflexión donde el caballo se mueve en círculo con el cuerpo flexionado opuesto a la dirección en la que va.',
            'Ayuda a corregir caballos que caen con el hombro interno en el círculo.',
            'También es útil cuando el caballo se va hacia afuera del círculo.',
            'Se puede usar para desacelerar al caballo sin importar el aire ni la velocidad en la que vaya.',
          ],
          methodSubSections: [
            {
              title: 'Círculo de arco inverso con una rienda',
              steps: [
                'Hacer un círculo de arco inverso usando solamente la rienda de afuera.',
                'Continuar hasta poder aflojar la flexión del arco inverso lo suficiente como para ver el costado externo del ojo del caballo.',
                'Ir alivianando las ayudas hasta llegar al punto en que el cuello y la cabeza puedan sentirse casi rectos.',
                'Practicar este ejercicio al paso, al trote y al galope.',
              ],
            },
            {
              title: 'Círculo de arco inverso con misma rienda, mismo pie de anclaje',
              steps: [
                'Hacer un círculo de arco inverso y luego cambiar la nariz hacia adentro del círculo manteniendo la misma línea.',
                'Si la grupa se sale del círculo hacia afuera, volver al círculo de arco inverso hasta reorganizarla.',
                'Alternar entre un círculo normal y un círculo de arco inverso.',
                'Después, ir ajustando el círculo mientras mantienes el arco inverso hasta que el caballo empiece a anclar la pata interna.',
                'Cuando el anclaje aparezca, cambiar la nariz hacia adentro.',
                'Si el caballo lo hace correctamente, pedir un par de pasos más cuidando que mantenga los hombros suaves.',
                'Salir luego del círculo hacia afuera y repetir.',
              ],
            },
          ],
        },
      ],
      observe:
        'Buscar costillas, hombros y cuello más sueltos, mejor balance en el círculo, menor caída sobre el hombro interno y una desaceleración más organizada.',
      cues: [
        'Rienda externa clara y estable',
        'Mantener la línea del círculo',
        'Cambiar la nariz sin perder la organización del cuerpo',
        'Volver al arco inverso cuando la grupa se salga',
      ],
      gear: ['Montura habitual', 'Riendas'],
      duration: '20–25 min',
      prerequisites: ['Misma rienda, mismo pie'],
      safety: [
        'No exigir más ángulo si el caballo pierde balance o dirección.',
        'Si la grupa se sale hacia afuera, volver a una versión más simple antes de seguir ajustando el círculo.',
        'No pedir el anclaje del pie interno si todavía no hay hombros suaves.',
      ],
      progressSigns: [
        { label: 'Más balance en el arco inverso' },
        { label: 'Menor caída sobre el hombro interno' },
        { label: 'Mayor estabilidad en la dirección y el círculo' },
      ],
      advanceCriteria: [
        'Puede sostener el arco inverso con menos ayuda de la rienda externa.',
        'Mantiene la línea del círculo cuando cambias la nariz hacia adentro.',
        'Logra anclar la pata interna sin endurecer los hombros.',
      ],
      commonMistakes: [
        'Confundir la contraflexión con un simple desplazamiento lateral.',
        'Cambiar la nariz hacia adentro antes de sostener la línea del círculo.',
        'Seguir avanzando cuando la grupa se sale hacia afuera.',
        'Buscar demasiado ángulo antes de tener balance.',
      ],
      instructorTips: [
        'El arco inverso debe aflojar y ordenar, no desarmar al caballo.',
        'Menos ángulo con más balance es mejor que mucha forma sin control.',
        'Primero cuida la línea del círculo y después el detalle del anclaje.',
        'Si el caballo se sale, vuelve al arco inverso base en vez de insistir.',
      ],
      transitionTo: ['hips-in'],
    },
    {
      id: 'hips-in',
      name: 'Grupa adentro',
      image: '/plans/exercise/grupa-adentro.png',
      description:
        'Cuarto bloque del plan para desarrollar control de la grupa, flexibilidad de los cuartos y una respuesta lateral más organizada. Como el arco inverso, grupa adentro ayuda a desacelerar los aires, ordenar transiciones y mejorar el cambio de mano, además de ser un excelente ejercicio de calentamiento para obtener suavidad en todo el cuerpo.',
      objective:
        'Ganar control sobre la grupa, mejorar la flexibilidad de los cuartos y conseguir un caballo reunido, suave y disponible tanto desde el suelo como montado.',
      focus: 'Control de caderas, flexibilidad lateral, desaceleración, transiciones y aplicación montada.',
      methodSections: [
        {
          title: 'Qué trabaja grupa adentro',
          steps: [
            'Es uno de los ejercicios más importantes para ganar control y mejorar el rendimiento.',
            'Como el arco inverso, ayuda a desacelerar los aires y es muy útil en las transiciones y en el cambio de mano.',
            'También sirve como ejercicio de calentamiento para obtener suavidad en todo el cuerpo del caballo.',
          ],
          methodSubSections: [
            {
              title: 'Como enseñarlo desde el suelo:',
              steps: [
                'Colocarte frente al caballo, cerca de una pared o una cerca.',
                'Pedir movimiento hacia adelante mientras retrocedes suavemente.',
                'Con la fusta de dressage, comenzar a sugerir usando golpecitos en la cadera en la zona alta del anca manteniendo el caballo en movimiento.',
                'Buscar que siga avanzando sin frenarse ni invadir tu espacio.',
                'Mientras el caballo se mueve hacia ti, continuar estimulando la cadera hasta que dé un pequeño paso hacia adentro con la grupa.',
                'En cuanto lo haga, soltar la presión y dejar de tocar.',
                'Ubicarte luego más alineada con la zona del costillar y no tan frente a la cabeza.',
                'Desde allí, repetir el pedido con más claridad y menos presión.',
                'Buscar que el caballo mantenga el movimiento hacia adelantes, que la cadera entre con suavidad y que el movimiento se vuelva más fluido.',
                'Alejarte de la pared y repetir el ejercicio en diagonal o en espacio abierto.',
                'Pedir que mantenga el movimiento, responda con menos estímulo y entienda el patrón sin depender del entorno.',
              ],
            },
            {
              title: 'Grupa adentro montado',
              steps: [
                'Comenzar el ejercicio montado solo cuando ya haya suficiente movimiento hacia adelante con el caballo en reunión.',
                'Mantener los hombros y la cabeza del caballo derechos.',
                'Alternar grupa adentro de lado a lado al paso y al trote.',
                'Mantener la reunión mientras las costillas se flexionan.',
                'Observar que al pedir grupa adentro puede aparecer un pequeño cambio de ritmo.',
                'Tener presente que, al galope, la velocidad del caballo baja rápidamente al hacer grupa adentro.',
                'Mantener los hombros derechos y arriba, relajar grupa adentro por unos pasos y volver a pedir.',
                'Cambiar de dirección y repetir.',
              ],
            },
          ],
        },
      ],
      observe:
        'Buscar una grupa más disponible, costillas más flexibles, mejor respuesta lateral, menos apoyo en el freno y un movimiento suave a un ritmo estable.',
      cues: [
        'Mantener el forward mientras organizas la cadera',
        'Liberar apenas la grupa entra hacia adentro',
        'Hombros y cabeza derechos en el trabajo montado',
        'Pedir de nuevo después de unos pasos de relajación',
      ],
      gear: ['Montura habitual', 'Riendas'],
      duration: '20–30 min',
      prerequisites: ['Arco inverso'],
      safety: [
        'No buscar perfección en los ángulos antes de lograr intención, suavidad y disponibilidad mental.',
        'No sacrificar el forward por pedir demasiada lateralidad.',
        'Reducir el pedido si el caballo se endurece o pierde el ritmo.',
      ],
      progressSigns: [
        { label: 'Caderas más disponibles y fáciles de invitar hacia adentro' },
        { label: 'Mayor suavidad en costillas y cuerpo completo' },
        { label: 'Mejor lateralidad y control en el trabajo montado' },
      ],
      advanceCriteria: [
        'Puede sostener grupa adentro sin apoyarse en el freno.',
        'Se mantiene reunido, curvo en las costillas y con un paso estable.',
        'Responde a cualquier rienda comprometiendo la grupa con claridad.',
      ],
      commonMistakes: [
        'Buscar demasiada forma antes de que el caballo entienda la intención del ejercicio.',
        'Perder el movimiento hacia adelante al pedir la cadera.',
        'Empujar la grupa sin sostener hombros y cabeza derechos.',
        'Confundir grupa adentro con un desplazamiento apresurado o sin reunión.',
      ],
      instructorTips: [
        'Primero busca intención, suavidad y disponibilidad mental; los ángulos vienen después.',
        'La cadera debe entrar como respuesta voluntaria, no por quedar atrapada contra la pared.',
        'En montado, alternar lados ayuda a que el caballo no se rigidice.',
        'La meta es un caballo reunido, liviano en el freno, curvo en las costillas y suave en un paso estable.',
      ],
    },
  ],
  stages: [
    {
      week: 1,
      title: 'Nariz suave y reunión',
      description:
        'Primera etapa para instalar suavidad, reunión y mejor contacto antes de patrones más complejos.',
      exerciseIds: ['soft-nose-and-collection'],
    },
    {
      week: 2,
      title: 'Misma rienda, mismo pie',
      description:
        'Segunda etapa para conectar riendas y pies, ordenando hombros y caderas con más claridad.',
      exerciseIds: ['same-rein-same-foot'],
    },
    {
      week: 3,
      title: 'Arco inverso',
      description:
        'Tercera etapa para trabajar el arco inverso, el balance y el control del pivote.',
      exerciseIds: ['reverse-arc'],
    },
    {
      week: 4,
      title: 'Grupa adentro',
      description:
        'Última etapa para desarrollar control lateral de la grupa y llevarlo al riding exercise.',
      exerciseIds: ['hips-in'],
    },
  ],
};
