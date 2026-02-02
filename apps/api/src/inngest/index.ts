// apps/api/inngest/functions/index.ts

import { aiGenerationFunction } from './functions/ai-generation';
import { aiModificationFunction } from './functions/ai-modification';
import { aiSuggestionsFunction } from './functions/ai-suggestion';
import { aiRegenerationFunction } from './functions/ai-regeneration';
import { aiVariationFunction } from './functions/ai-variation';

export const inngestFunctions = [
  aiGenerationFunction,
  aiModificationFunction,
  aiSuggestionsFunction,
  aiRegenerationFunction,
  aiVariationFunction,
];
