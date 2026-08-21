import {genkit} from 'genkit';
import {anthropic} from '@genkit-ai/anthropic';

// Usa Claude (Anthropic) en vez de Gemini -- necesita ANTHROPIC_API_KEY en
// .env.local (conseguila en console.anthropic.com, no es la misma cuenta
// que claude.ai). Si el modelo de acá abajo da error de "modelo no
// encontrado", revisá los nombres vigentes en
// https://genkit.dev/docs/js/integrations/anthropic/ y actualizalo.
export const ai = genkit({
  plugins: [anthropic()],
  model: anthropic.model('claude-sonnet-4-6'),
});
