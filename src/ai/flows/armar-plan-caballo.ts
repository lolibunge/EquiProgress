'use server';

/**
 * @fileOverview Sugiere, a partir de una descripción libre del caballo y del
 * resultado buscado, cuál de los planes del catálogo curado de la
 * instructora conviene activar como plan personalizado.
 *
 * - armarPlanCaballo - Elige un `planBaseId` del catálogo recibido y explica por qué.
 * - ArmarPlanCaballoInput - El tipo de entrada.
 * - ArmarPlanCaballoOutput - El tipo de salida.
 *
 * NOTA: el plugin @genkit-ai/anthropic (a esta fecha, v0.4.x) todavía no
 * soporta el modo de salida estructurada de Genkit ("Only text output
 * format is supported for Claude models currently") -- por eso, a
 * diferencia de un flow típico de Genkit, acá NO usamos `output: {schema}`
 * en el prompt. En cambio le pedimos texto plano con instrucciones
 * explícitas de responder solo JSON, y lo parseamos/validamos a mano con
 * el mismo schema de Zod. Si en el futuro el plugin agrega soporte para
 * salida estructurada, se puede volver a la forma simple.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CatalogoPlanSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  categoria: z.string(),
  descripcion: z.string(),
});

const ArmarPlanCaballoInputSchema = z.object({
  descripcionCaballo: z
    .string()
    .describe('Descripción libre, en palabras de la instructora o la alumna, de la situación del caballo.'),
  resultadoDeseado: z.string().describe('Qué resultado le gustaría ver al terminar el plan.'),
  semanasObjetivo: z.number().int().min(1).max(52).describe('Cuántas semanas quiere trabajar este plan.'),
  diasPorSemana: z.number().int().min(1).max(7).describe('Cuántos días por semana puede entrenar.'),
  catalogo: z
    .array(CatalogoPlanSchema)
    .min(1)
    .describe('Los planes disponibles en el catálogo de la instructora, entre los que hay que elegir uno solo.'),
});
export type ArmarPlanCaballoInput = z.infer<typeof ArmarPlanCaballoInputSchema>;

const ArmarPlanCaballoOutputSchema = z.object({
  planBaseId: z
    .string()
    .describe('El id EXACTO de uno de los planes del catálogo recibido -- copiado tal cual, sin inventar uno nuevo.'),
  nombreSugerido: z.string().describe('Un nombre corto y claro en español para este plan personalizado.'),
  resumen: z
    .string()
    .describe(
      'De 2 a 3 oraciones en español, tono cercano, explicando por qué ese plan encaja y qué esperar trabajar en esas semanas.'
    ),
});
export type ArmarPlanCaballoOutput = z.infer<typeof ArmarPlanCaballoOutputSchema>;

export async function armarPlanCaballo(input: ArmarPlanCaballoInput): Promise<ArmarPlanCaballoOutput> {
  return armarPlanCaballoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'armarPlanCaballoPrompt',
  input: {schema: ArmarPlanCaballoInputSchema},
  prompt: `Sos un asistente para una instructora de equitación que arma planes de entrenamiento personalizados a partir de un catálogo curado de planes ya existentes.

No inventes ejercicios nuevos ni planes que no estén en el catálogo. Tu única tarea es elegir, del catálogo que te paso, el plan que mejor se ajuste a la descripción del caballo y al resultado buscado, y explicar por qué en un tono cercano y claro (sin tecnicismos innecesarios).

Descripción del caballo / situación:
{{{descripcionCaballo}}}

Resultado que le gustaría ver al terminar el plan:
{{{resultadoDeseado}}}

Semanas disponibles para trabajar: {{semanasObjetivo}}
Días por semana disponibles: {{diasPorSemana}}

Catálogo de planes disponibles:
{{#each catalogo}}
- id: "{{this.id}}" | nombre: "{{this.nombre}}" | categoría: "{{this.categoria}}" | descripción: {{this.descripcion}}
{{/each}}

Elegí el plan que mejor se ajuste -- el "planBaseId" tiene que ser EXACTAMENTE uno de los ids de arriba, copiado tal cual, sin modificarlo. Sugerí un "nombreSugerido" corto en español. Escribí un "resumen" de 2 a 3 oraciones explicando por qué elegiste ese plan y qué se puede esperar trabajar en esas {{semanasObjetivo}} semanas.

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin bloque de código markdown, con exactamente esta forma:
{"planBaseId": "...", "nombreSugerido": "...", "resumen": "..."}`,
});

/** Saca el JSON de la respuesta de texto, tolerando bloques ```json y texto sobrante alrededor. */
function extraerJson(texto: string): unknown {
  const limpio = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(limpio);
  } catch {
    const inicio = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    if (inicio === -1 || fin === -1 || fin < inicio) {
      throw new Error('La IA no devolvió JSON reconocible.');
    }
    return JSON.parse(limpio.slice(inicio, fin + 1));
  }
}

const armarPlanCaballoFlow = ai.defineFlow(
  {
    name: 'armarPlanCaballoFlow',
    inputSchema: ArmarPlanCaballoInputSchema,
    outputSchema: ArmarPlanCaballoOutputSchema,
  },
  async input => {
    const {text} = await prompt(input);
    if (!text) {
      throw new Error('La IA no devolvió una respuesta.');
    }

    const json = extraerJson(text);
    return ArmarPlanCaballoOutputSchema.parse(json);
  }
);
