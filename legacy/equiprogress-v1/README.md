# EquiProgress v1 (archivado)

Este código quedó archivado el 21 de agosto de 2026, al empezar el rediseño
de la app al estilo Move (ver el análisis publicado: "EquiProgress × Move").

**No forma parte del build.** `tsconfig.json` excluye esta carpeta, y está
fuera de `src/app`, así que Next.js no la enruta. Nada de lo que hay acá se
ejecuta en producción.

## Qué se movió acá y por qué

- `app/page.tsx` — el home viejo (dashboard de estudiante + panel de admin +
  landing pública en un solo archivo). Reemplazado por la nueva pantalla
  "Hoy" en `src/app/page.tsx`.
- `app/plans/` — la grilla técnica de semana/día con puntajes 1-5 por
  ejercicio. Se reemplaza en fases siguientes por las pantallas Semana e
  Historial nuevas.
- `app/new-registry/` — el "Diario de entrenamiento" con las 7 escalas de
  calificación por sesión, guardado solo en localStorage. Reemplazado por el
  registro unificado (`src/lib/sesiones-store.ts`).
- `app/history/` — la tabla de eventos cruda. Se reemplaza más adelante por
  un historial semanal simple.
- `lib/progress-store.ts` y `lib/session-registry-store.ts` — los dos
  modelos de datos separados que no se hablaban entre sí.

## Qué NO se movió (sigue vivo en `src/`)

Auth, login, registro, reset de contraseña, precios/prueba gratis,
`feedback`, la ficha técnica de ejercicios (`exercises/[id]`,
`ExerciseDetail.tsx`), el catálogo de planes (`data/training-plans`) y toda
la infraestructura de Firebase. Nada de esto era parte del problema de UX
que se está resolviendo, así que sigue funcionando igual que antes.

## Si hace falta rescatar algo

Todo el historial de git de estos archivos se conservó (`git mv`, no copia),
así que `git log --follow` sobre cualquier archivo acá adentro muestra su
historia completa de antes de la mudanza.
