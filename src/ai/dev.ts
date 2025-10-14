import { config } from 'dotenv';
config();

import '@/ai/flows/explain-and-recommend-action.ts';
import '@/ai/flows/summarize-adjudication-rules.ts';
import '@/ai/flows/validate-claim-llm.ts';
